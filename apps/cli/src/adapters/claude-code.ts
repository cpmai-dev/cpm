/**
 * Claude Code Platform Adapter
 * Orchestrates package installation/uninstallation using handlers
 */

import type { PackageManifest } from "../types.js";
import { PlatformAdapter, InstallResult } from "./base.js";
import { handlerRegistry } from "./handlers/index.js";
import { sanitizeFolderName } from "../security/index.js";
import {
  getRulesPath,
  getSkillsPath,
  getClaudeCodeHome,
} from "../utils/platform.js";
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
    _projectPath: string,
  ): Promise<InstallResult> {
    const filesWritten: string[] = [];
    const folderName = sanitizeFolderName(packageName);

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

      await this.removeMcpServer(folderName, filesWritten);

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
    if ("skill" in manifest && manifest.skill) {
      const handler = handlerRegistry.getHandler("skill");
      return handler.install(manifest, context);
    }

    if ("mcp" in manifest && manifest.mcp) {
      const handler = handlerRegistry.getHandler("mcp");
      return handler.install(manifest, context);
    }

    if ("universal" in manifest && manifest.universal?.rules) {
      const handler = handlerRegistry.getHandler("rules");
      return handler.install(manifest, context);
    }

    return [];
  }

  private async removeMcpServer(
    serverName: string,
    filesWritten: string[],
  ): Promise<void> {
    const claudeHome = getClaudeCodeHome();
    const mcpConfigPath = path.join(path.dirname(claudeHome), ".claude.json");

    if (!(await fs.pathExists(mcpConfigPath))) {
      return;
    }

    try {
      const config = await fs.readJson(mcpConfigPath);
      const mcpServers = config.mcpServers as
        | Record<string, unknown>
        | undefined;

      if (!mcpServers || !mcpServers[serverName]) {
        return;
      }

      const { [serverName]: _removed, ...remainingServers } = mcpServers;

      const updatedConfig = {
        ...config,
        mcpServers: remainingServers,
      };

      await fs.writeJson(mcpConfigPath, updatedConfig, { spaces: 2 });
      filesWritten.push(mcpConfigPath);
    } catch (error) {
      logger.warn(
        `Could not update MCP config: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
