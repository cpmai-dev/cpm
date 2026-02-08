/**
 * Cursor Platform Adapter
 * Orchestrates package installation/uninstallation for Cursor IDE
 */

import type { PackageManifest } from "../types.js";
import { PlatformAdapter, InstallResult } from "./base.js";
import { CursorRulesHandler } from "./handlers/cursor-rules-handler.js";
import { CursorMcpHandler } from "./handlers/cursor-mcp-handler.js";
import { logger } from "../utils/logger.js";

const cursorRulesHandler = new CursorRulesHandler();
const cursorMcpHandler = new CursorMcpHandler();

export class CursorAdapter extends PlatformAdapter {
  platform = "cursor" as const;
  displayName = "Cursor";

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

      if (manifest.type === "skill") {
        logger.warn(
          `Package "${manifest.name}" is a skill package. Skills are not supported on Cursor — skipping.`,
        );
        return {
          success: true,
          platform: "cursor",
          filesWritten,
        };
      }

      const result = await this.installByType(manifest, context);
      filesWritten.push(...result);

      return {
        success: true,
        platform: "cursor",
        filesWritten,
      };
    } catch (error) {
      return {
        success: false,
        platform: "cursor",
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
      const rulesFiles = await cursorRulesHandler.uninstall(
        packageName,
        context,
      );
      filesWritten.push(...rulesFiles);

      const mcpFiles = await cursorMcpHandler.uninstall(packageName, context);
      filesWritten.push(...mcpFiles);

      return {
        success: true,
        platform: "cursor",
        filesWritten,
      };
    } catch (error) {
      return {
        success: false,
        platform: "cursor",
        filesWritten,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async installByType(
    manifest: PackageManifest,
    context: { projectPath: string; packagePath?: string },
  ): Promise<string[]> {
    switch (manifest.type) {
      case "rules":
        return cursorRulesHandler.install(manifest, context);
      case "mcp":
        return cursorMcpHandler.install(manifest, context);
      default:
        logger.warn(
          `Package type "${manifest.type}" is not yet supported on Cursor`,
        );
        return [];
    }
  }
}
