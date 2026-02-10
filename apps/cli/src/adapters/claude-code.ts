/**
 * Claude Code Platform Adapter
 * Orchestrates package installation/uninstallation using handlers
 */

import path from "path";
import fs from "fs-extra";
import type { PackageManifest, InstalledPackage } from "../types.js";
import { isMcpManifest, isSkillManifest, isRulesManifest } from "../types.js";
import { PlatformAdapter, InstallResult } from "./base.js";
import { handlerRegistry } from "./handlers/index.js";
import { scanDirectory, scanMcpServersFromConfig } from "./scanning.js";
import { getClaudeHome } from "../utils/config.js";
import { logger } from "../utils/logger.js";

export class ClaudeCodeAdapter extends PlatformAdapter {
  platform = "claude-code" as const;
  displayName = "Claude Code";

  async isAvailable(_projectPath: string): Promise<boolean> {
    return true;
  }

  async install(
    manifest: PackageManifest,
    projectPath: string,
    packagePath?: string,
  ): Promise<InstallResult> {
    const filesWritten: string[] = [];

    try {
      const context = { projectPath, packagePath };
      const result = await this.installByType(manifest, context);
      filesWritten.push(...result);

      return {
        success: true,
        platform: "claude-code",
        filesWritten,
      };
    } catch (error) {
      return {
        success: false,
        platform: "claude-code",
        filesWritten,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async uninstall(
    packageName: string,
    projectPath: string,
  ): Promise<InstallResult> {
    const filesWritten: string[] = [];
    const context = { projectPath };

    try {
      // Delegate to all registered handlers
      for (const type of handlerRegistry.getRegisteredTypes()) {
        if (handlerRegistry.hasHandler(type)) {
          const handler = handlerRegistry.getHandler(type);
          const files = await handler.uninstall(packageName, context);
          filesWritten.push(...files);
        }
      }

      return {
        success: true,
        platform: "claude-code",
        filesWritten,
      };
    } catch (error) {
      return {
        success: false,
        platform: "claude-code",
        filesWritten,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async listInstalled(_projectPath: string): Promise<InstalledPackage[]> {
    const claudeHome = getClaudeHome();
    const claudeMcpConfig = path.join(path.dirname(claudeHome), ".claude.json");

    const [rules, skills, mcp] = await Promise.all([
      scanDirectory(path.join(claudeHome, "rules"), "rules", "claude-code"),
      scanDirectory(path.join(claudeHome, "skills"), "skill", "claude-code"),
      scanMcpServersFromConfig(claudeMcpConfig, "claude-code"),
    ]);

    return [...rules, ...skills, ...mcp];
  }

  async ensureDirs(_projectPath: string): Promise<void> {
    const claudeHome = getClaudeHome();
    await fs.ensureDir(path.join(claudeHome, "rules"));
    await fs.ensureDir(path.join(claudeHome, "skills"));
  }

  private async installByType(
    manifest: PackageManifest,
    context: { projectPath: string; packagePath?: string },
  ): Promise<string[]> {
    if (handlerRegistry.hasHandler(manifest.type)) {
      const handler = handlerRegistry.getHandler(manifest.type);
      return handler.install(manifest, context);
    }

    return this.installFallback(manifest, context);
  }

  private async installFallback(
    manifest: PackageManifest,
    context: { projectPath: string; packagePath?: string },
  ): Promise<string[]> {
    // Use proper type guards instead of duck-typing with 'in' operator.
    // This prevents a manifest with type "agent" but a stray "mcp" field
    // from being routed to the MCP handler.
    logger.warn(
      `No handler registered for type "${manifest.type}", attempting content-based detection`,
    );

    if (isSkillManifest(manifest)) {
      const handler = handlerRegistry.getHandler("skill");
      return handler.install(manifest, context);
    }

    if (isMcpManifest(manifest)) {
      const handler = handlerRegistry.getHandler("mcp");
      return handler.install(manifest, context);
    }

    if (isRulesManifest(manifest)) {
      const handler = handlerRegistry.getHandler("rules");
      return handler.install(manifest, context);
    }

    return [];
  }
}
