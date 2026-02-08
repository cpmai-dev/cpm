/**
 * Claude Code Platform Adapter
 * Orchestrates package installation/uninstallation using handlers
 */

import type { PackageManifest } from "../types.js";
import { isMcpManifest, isSkillManifest, isRulesManifest } from "../types.js";
import { PlatformAdapter, InstallResult } from "./base.js";
import { handlerRegistry } from "./handlers/index.js";
import { sanitizeFolderName } from "../security/index.js";
import { getRulesPath, getSkillsPath } from "../utils/platform.js";
import { logger } from "../utils/logger.js";
import fs from "fs-extra";
import path from "path";

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
    const folderName = sanitizeFolderName(packageName);
    const context = { projectPath };

    try {
      const rulesBaseDir = getRulesPath("claude-code");
      const rulesPath = path.join(rulesBaseDir, folderName);
      if (await fs.pathExists(rulesPath)) {
        await fs.remove(rulesPath);
        filesWritten.push(rulesPath);
      }

      const skillsDir = getSkillsPath();
      const skillPath = path.join(skillsDir, folderName);
      if (await fs.pathExists(skillPath)) {
        await fs.remove(skillPath);
        filesWritten.push(skillPath);
      }

      // Delegate MCP removal to the handler instead of duplicating logic
      if (handlerRegistry.hasHandler("mcp")) {
        const mcpHandler = handlerRegistry.getHandler("mcp");
        const mcpFiles = await mcpHandler.uninstall(packageName, context);
        filesWritten.push(...mcpFiles);
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
