/**
 * MCP Package Handler
 *
 * This module handles the installation and uninstallation of "mcp" type packages.
 * MCP (Model Context Protocol) servers are external tools that Claude Code can
 * communicate with to extend its capabilities (e.g., database access, API calls).
 *
 * Unlike rules and skills which install files, MCP packages modify the
 * ~/.claude.json configuration file to register the MCP server.
 *
 * The MCP server configuration includes:
 * - command: The executable to run (e.g., "npx", "node", "python")
 * - args: Command line arguments
 * - env: Environment variables
 */

import fs from "fs-extra";
import path from "path";
import type { PackageManifest } from "../../types.js";
import { isMcpManifest } from "../../types.js";
import { getClaudeCodeHome } from "../../utils/platform.js";
import { logger } from "../../utils/logger.js";
import { validateMcpConfig, sanitizeFolderName } from "../../security/index.js";
import type {
  PackageHandler,
  InstallContext,
  UninstallContext,
} from "./types.js";

/**
 * Handler for MCP packages.
 *
 * This class implements the PackageHandler interface specifically for
 * MCP-type packages. It knows how to:
 * - Validate MCP configurations for security (only allowed commands)
 * - Read and modify the ~/.claude.json configuration file
 * - Add or remove MCP server entries safely
 *
 * Security is critical for MCP packages since they can execute arbitrary
 * commands. This handler enforces an allowlist of safe commands.
 *
 * @example
 * ```typescript
 * const handler = new McpHandler();
 *
 * // Install an MCP package - adds entry to ~/.claude.json
 * await handler.install(manifest, { projectPath: process.cwd() });
 *
 * // After restart, the MCP server will be available in Claude Code
 * ```
 */
export class McpHandler implements PackageHandler {
  /**
   * Identifies this handler as handling "mcp" type packages.
   * The registry uses this to route MCP packages to this handler.
   */
  readonly packageType = "mcp" as const;

  /**
   * Install an MCP package.
   *
   * The installation process:
   * 1. Validate the MCP configuration for security
   * 2. Read the existing ~/.claude.json configuration
   * 3. Add the new MCP server to the mcpServers section
   * 4. Write the updated configuration back
   *
   * @param manifest - The package manifest with MCP configuration
   * @param _context - Install context (not used for MCP, but required by interface)
   * @returns Array containing the path to the modified config file
   * @throws Error if MCP configuration fails security validation
   */
  async install(
    manifest: PackageManifest,
    _context: InstallContext,
  ): Promise<string[]> {
    // Track modified files for reporting
    const filesWritten: string[] = [];

    // Verify this is actually an MCP manifest using type guard
    if (!isMcpManifest(manifest)) {
      // Not an MCP manifest, nothing to do
      return filesWritten;
    }

    // SECURITY: Validate the MCP configuration before installing
    // This checks that the command is in the allowlist and arguments are safe
    const mcpValidation = validateMcpConfig(manifest.mcp);

    if (!mcpValidation.valid) {
      // Throw an error to prevent installation of unsafe configurations
      throw new Error(`MCP security validation failed: ${mcpValidation.error}`);
    }

    // Get the path to Claude Code's home directory (~/.claude/)
    const claudeHome = getClaudeCodeHome();

    // The MCP config lives in ~/.claude.json (parent of ~/.claude/)
    const mcpConfigPath = path.join(path.dirname(claudeHome), ".claude.json");

    // Start with an empty config object
    let existingConfig: Record<string, unknown> = {};

    // Try to read existing configuration if it exists
    if (await fs.pathExists(mcpConfigPath)) {
      try {
        // Read the existing JSON configuration
        existingConfig = await fs.readJson(mcpConfigPath);
      } catch {
        // If parsing fails, back up the corrupted file before overwriting
        const backupPath = `${mcpConfigPath}.backup.${Date.now()}`;
        try {
          await fs.copy(mcpConfigPath, backupPath);
          logger.warn(
            `Could not parse ${mcpConfigPath}, backup saved to ${backupPath}`,
          );
        } catch {
          logger.warn(`Could not parse ${mcpConfigPath}, creating new config`);
        }
        existingConfig = {};
      }
    }

    // Sanitize the package name to use as the MCP server key
    // e.g., "@cpm/supabase-mcp" becomes "supabase-mcp"
    const sanitizedName = sanitizeFolderName(manifest.name);

    // Get existing MCP servers or create empty object
    const existingMcpServers =
      (existingConfig.mcpServers as Record<string, unknown>) || {};

    // Create the updated configuration using immutable patterns
    // This ensures we don't accidentally mutate the original config
    const updatedConfig = {
      ...existingConfig, // Preserve all other config settings
      mcpServers: {
        ...existingMcpServers, // Preserve other MCP servers
        [sanitizedName]: {
          // Add/update this package's MCP server
          command: manifest.mcp.command, // e.g., "npx"
          args: manifest.mcp.args, // e.g., ["-y", "@supabase/mcp"]
          env: manifest.mcp.env, // e.g., { "SUPABASE_URL": "..." }
        },
      },
    };

    // Write the updated configuration back to the file
    await fs.writeJson(mcpConfigPath, updatedConfig, { spaces: 2 });

    // Track the modified file
    filesWritten.push(mcpConfigPath);

    return filesWritten;
  }

  /**
   * Uninstall an MCP package.
   *
   * This removes the MCP server entry from ~/.claude.json
   *
   * @param packageName - The name of the package to remove
   * @param _context - Uninstall context (not used for MCP, but required by interface)
   * @returns Array containing the path to the modified config file
   */
  async uninstall(
    packageName: string,
    _context: UninstallContext,
  ): Promise<string[]> {
    // Track modified files for reporting
    const filesWritten: string[] = [];

    // Get the folder name from the package name
    const folderName = sanitizeFolderName(packageName);

    // Get the path to the MCP config file
    const claudeHome = getClaudeCodeHome();
    const mcpConfigPath = path.join(path.dirname(claudeHome), ".claude.json");

    // If config file doesn't exist, nothing to remove
    if (!(await fs.pathExists(mcpConfigPath))) {
      return filesWritten;
    }

    try {
      // Read the existing configuration
      const config = await fs.readJson(mcpConfigPath);

      // Get the mcpServers section
      const mcpServers = config.mcpServers as
        | Record<string, unknown>
        | undefined;

      // If no mcpServers or this package isn't registered, nothing to do
      if (!mcpServers || !mcpServers[folderName]) {
        return filesWritten;
      }

      // Use destructuring to remove the server entry (immutable pattern)
      // The _removed variable captures the removed entry but is intentionally unused
      const { [folderName]: _removed, ...remainingServers } = mcpServers;

      // Create updated config with the server removed
      const updatedConfig = {
        ...config,
        mcpServers: remainingServers,
      };

      // Write the updated configuration
      await fs.writeJson(mcpConfigPath, updatedConfig, { spaces: 2 });

      // Track the modified file
      filesWritten.push(mcpConfigPath);
    } catch (error) {
      // If we can't update the config, warn but don't fail the uninstall
      // The user might want to manually clean up
      logger.warn(
        `Could not update MCP config: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return filesWritten;
  }
}
