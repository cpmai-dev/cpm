/**
 * Package Handler Interface Types
 *
 * This module defines the core interfaces that all package handlers must implement.
 * It establishes the contract between the adapter (which orchestrates installation)
 * and the individual handlers (which know how to install specific package types).
 *
 * By using interfaces, we enable:
 * - Easy addition of new package types without modifying existing code
 * - Consistent API across all handlers
 * - Testability through mock implementations
 */

import type { PackageType, PackageManifest } from "../../types.js";

/**
 * Context provided during package installation.
 *
 * This object contains all the information a handler needs to know
 * about WHERE to install files. The handler decides HOW to install
 * based on this context.
 *
 * @example
 * ```typescript
 * const context: InstallContext = {
 *   projectPath: "/Users/dev/myproject",           // The user's project directory
 *   packagePath: "/tmp/cpm-downloads/typescript-rules"  // Where downloaded files are
 * };
 * ```
 */
export interface InstallContext {
  /**
   * The path to the user's project directory.
   * This is where project-local installations would go.
   * Currently, most packages install globally to ~/.claude/
   */
  projectPath: string;

  /**
   * Optional path to the downloaded/extracted package files.
   * When present, handlers can copy files from here.
   * When absent, handlers create files from manifest content.
   */
  packagePath?: string;
}

/**
 * Context provided during package uninstallation.
 *
 * Contains information needed to locate and remove installed packages.
 *
 * @example
 * ```typescript
 * const context: UninstallContext = {
 *   projectPath: "/Users/dev/myproject"
 * };
 * ```
 */
export interface UninstallContext {
  /**
   * The path to the user's project directory.
   * Used to resolve project-relative paths if needed.
   */
  projectPath: string;
}

/**
 * Handler interface for a specific package type.
 *
 * Each package type (rules, skill, mcp, etc.) has its own handler
 * that implements this interface. The handler knows:
 * - Where to install files for its package type
 * - How to format/process the package content
 * - How to clean up when uninstalling
 *
 * This follows the Strategy Pattern - the same interface with
 * different implementations based on package type.
 *
 * @example
 * ```typescript
 * class RulesHandler implements PackageHandler {
 *   readonly packageType = "rules";
 *
 *   async install(manifest, context) {
 *     // Install rules to ~/.claude/rules/
 *     return ["/path/to/installed/file.md"];
 *   }
 *
 *   async uninstall(packageName, context) {
 *     // Remove the rules folder
 *     return ["/path/to/removed/folder"];
 *   }
 * }
 * ```
 */
export interface PackageHandler {
  /**
   * The package type this handler is responsible for.
   * This is used by the registry to route packages to the correct handler.
   * Must be readonly to prevent accidental modification.
   *
   * @example "rules" | "skill" | "mcp" | "agent" | etc.
   */
  readonly packageType: PackageType;

  /**
   * Install a package of this type.
   *
   * This method is responsible for:
   * 1. Creating necessary directories
   * 2. Copying or generating package files
   * 3. Writing metadata for tracking
   * 4. Returning a list of created file paths
   *
   * @param manifest - The package manifest containing metadata and content
   * @param context - Installation context with paths and options
   * @returns Promise resolving to array of file paths that were written
   * @throws Error if installation fails for any reason
   *
   * @example
   * ```typescript
   * const files = await handler.install(manifest, {
   *   projectPath: process.cwd(),
   *   packagePath: "/tmp/downloaded-package"
   * });
   * console.log(`Created ${files.length} files`);
   * ```
   */
  install(
    manifest: PackageManifest,
    context: InstallContext,
  ): Promise<string[]>;

  /**
   * Uninstall a package of this type.
   *
   * This method is responsible for:
   * 1. Finding installed package files
   * 2. Removing files and directories
   * 3. Cleaning up any configuration changes
   * 4. Returning a list of removed file paths
   *
   * @param packageName - The name of the package to uninstall (e.g., "@cpm/typescript-rules")
   * @param context - Uninstall context with paths
   * @returns Promise resolving to array of file paths that were removed
   * @throws Error if uninstallation fails for any reason
   *
   * @example
   * ```typescript
   * const removed = await handler.uninstall("@cpm/typescript-rules", {
   *   projectPath: process.cwd()
   * });
   * console.log(`Removed ${removed.length} files/folders`);
   * ```
   */
  uninstall(packageName: string, context: UninstallContext): Promise<string[]>;
}
