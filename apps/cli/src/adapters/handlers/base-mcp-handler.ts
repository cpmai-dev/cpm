/**
 * Base MCP Package Handler
 *
 * Shared logic for installing/uninstalling MCP server configurations.
 * Subclasses only need to provide the config file path via getConfigPath().
 *
 * Both Claude Code (~/.claude.json) and Cursor (~/.cursor/mcp.json) use
 * the same mcpServers JSON structure, so all read/write/lock logic is shared.
 */

import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import type { PackageManifest } from "../../types.js";
import { isMcpManifest } from "../../types.js";
import { logger } from "../../utils/logger.js";
import { validateMcpConfig, sanitizeFolderName } from "../../security/index.js";
import { withFileLock } from "../../utils/file-lock.js";
import type {
  PackageHandler,
  InstallContext,
  UninstallContext,
} from "./types.js";

export abstract class BaseMcpHandler implements PackageHandler {
  readonly packageType = "mcp" as const;

  /**
   * Return the absolute path to the MCP config file.
   * Subclasses implement this to target different platforms.
   */
  protected abstract getConfigPath(): string;

  async install(
    manifest: PackageManifest,
    _context: InstallContext,
  ): Promise<string[]> {
    const filesWritten: string[] = [];

    if (!isMcpManifest(manifest)) {
      return filesWritten;
    }

    const mcpValidation = validateMcpConfig(manifest.mcp);
    if (!mcpValidation.valid) {
      throw new Error(`MCP security validation failed: ${mcpValidation.error}`);
    }

    const mcpConfigPath = this.getConfigPath();
    await fs.ensureDir(path.dirname(mcpConfigPath));

    await withFileLock(mcpConfigPath, async () => {
      let existingConfig: Record<string, unknown> = {};

      if (await fs.pathExists(mcpConfigPath)) {
        try {
          existingConfig = await fs.readJson(mcpConfigPath);
        } catch {
          const backupPath = `${mcpConfigPath}.backup.${crypto.randomBytes(8).toString("hex")}`;
          try {
            await fs.copy(mcpConfigPath, backupPath);
            logger.warn(
              `Could not parse ${mcpConfigPath}, backup saved to ${backupPath}`,
            );
          } catch {
            logger.warn(
              `Could not parse ${mcpConfigPath}, creating new config`,
            );
          }
          existingConfig = {};
        }
      }

      const sanitizedName = sanitizeFolderName(manifest.name);
      const existingMcpServers =
        (existingConfig.mcpServers as Record<string, unknown>) || {};

      const updatedConfig = {
        ...existingConfig,
        mcpServers: {
          ...existingMcpServers,
          [sanitizedName]: {
            command: manifest.mcp.command,
            args: manifest.mcp.args,
            env: manifest.mcp.env,
          },
        },
      };

      await fs.writeJson(mcpConfigPath, updatedConfig, { spaces: 2 });
      filesWritten.push(mcpConfigPath);
    });

    return filesWritten;
  }

  async uninstall(
    packageName: string,
    _context: UninstallContext,
  ): Promise<string[]> {
    const filesWritten: string[] = [];
    const folderName = sanitizeFolderName(packageName);
    const mcpConfigPath = this.getConfigPath();

    if (!(await fs.pathExists(mcpConfigPath))) {
      return filesWritten;
    }

    try {
      await withFileLock(mcpConfigPath, async () => {
        const config = await fs.readJson(mcpConfigPath);
        const mcpServers = config.mcpServers as
          | Record<string, unknown>
          | undefined;

        if (!mcpServers || !mcpServers[folderName]) {
          return;
        }

        const { [folderName]: _removed, ...remainingServers } = mcpServers;
        const updatedConfig = {
          ...config,
          mcpServers: remainingServers,
        };

        await fs.writeJson(mcpConfigPath, updatedConfig, { spaces: 2 });
        filesWritten.push(mcpConfigPath);
      });
    } catch (error) {
      logger.warn(
        `Could not update MCP config: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return filesWritten;
  }
}
