/**
 * Rules Package Handler
 *
 * This module handles the installation and uninstallation of "rules" type packages.
 * Rules are markdown files that provide coding guidelines, best practices, or
 * project-specific instructions that Claude Code uses when working in a project.
 *
 * Rules packages are installed to: ~/.claude/rules/<package-name>/
 *
 * Each rules package creates:
 * - One or more .md files containing the actual rules
 * - A .cpm.json metadata file for tracking installation info
 */

import fs from "fs-extra";
import path from "path";
import type { PackageManifest } from "../../types.js";
import { isRulesManifest } from "../../types.js";
import { getRulesPath } from "../../utils/platform.js";
import { logger } from "../../utils/logger.js";
import {
  sanitizeFileName,
  sanitizeFolderName,
  isPathWithinDirectory,
} from "../../security/index.js";
import type {
  PackageHandler,
  InstallContext,
  UninstallContext,
} from "./types.js";
import { writePackageMetadata } from "./metadata.js";

/**
 * Handler for rules packages.
 *
 * This class implements the PackageHandler interface specifically for
 * rules-type packages. It knows how to:
 * - Find the correct installation directory (~/.claude/rules/)
 * - Copy or create markdown files
 * - Handle security validation on file names
 * - Clean up when uninstalling
 *
 * @example
 * ```typescript
 * const handler = new RulesHandler();
 *
 * // Install a rules package
 * const files = await handler.install(manifest, {
 *   projectPath: process.cwd(),
 *   packagePath: "/tmp/downloaded-rules"
 * });
 *
 * // Uninstall the package
 * await handler.uninstall("@cpm/typescript-strict", { projectPath: process.cwd() });
 * ```
 */
export class RulesHandler implements PackageHandler {
  /**
   * Identifies this handler as handling "rules" type packages.
   * The registry uses this to route rules packages to this handler.
   */
  readonly packageType = "rules" as const;

  /**
   * Install a rules package.
   *
   * The installation process:
   * 1. Determine the target directory (~/.claude/rules/<package-name>/)
   * 2. If package files exist in packagePath, copy all .md files
   * 3. Otherwise, create a RULES.md from the manifest content
   * 4. Write metadata file for tracking
   *
   * @param manifest - The package manifest with name, content, etc.
   * @param context - Contains projectPath and optional packagePath
   * @returns Array of file paths that were created
   */
  async install(
    manifest: PackageManifest,
    context: InstallContext,
  ): Promise<string[]> {
    // Track all files we create for reporting back to the user
    const filesWritten: string[] = [];

    // Get the base rules directory (~/.claude/rules/)
    const rulesBaseDir = getRulesPath("claude-code");

    // Sanitize the package name to create a safe folder name
    // e.g., "@cpm/typescript-strict" becomes "typescript-strict"
    const folderName = sanitizeFolderName(manifest.name);

    // Build the full path for this package's rules
    const rulesDir = path.join(rulesBaseDir, folderName);

    // Ensure the directory exists (creates parent directories if needed)
    await fs.ensureDir(rulesDir);

    // Check if we have downloaded package files to copy from
    if (context.packagePath && (await fs.pathExists(context.packagePath))) {
      // Read all files in the downloaded package directory
      const files = await fs.readdir(context.packagePath);

      // Filter to only .md files, excluding the manifest file
      const mdFiles = files.filter(
        (f) => f.endsWith(".md") && f.toLowerCase() !== "cpm.yaml",
      );

      // If we found markdown files, copy them
      if (mdFiles.length > 0) {
        for (const file of mdFiles) {
          // Validate the filename for security (prevents path traversal attacks)
          const validation = sanitizeFileName(file);

          if (!validation.valid) {
            // Skip files that fail security validation
            logger.warn(`Skipping unsafe file: ${file} (${validation.error})`);
            continue;
          }

          // Build source and destination paths
          const srcPath = path.join(context.packagePath, file);
          const destPath = path.join(rulesDir, validation.sanitized);

          // Double-check the destination is within the allowed directory
          // This prevents any path traversal that might slip through
          if (!isPathWithinDirectory(destPath, rulesDir)) {
            logger.warn(`Blocked path traversal attempt: ${file}`);
            continue;
          }

          // Check for symlinks to prevent symlink-based attacks
          const srcStat = await fs.lstat(srcPath);
          if (srcStat.isSymbolicLink()) {
            logger.warn(`Blocked symlink in package: ${file}`);
            continue;
          }

          // Copy the file from source to destination
          await fs.copy(srcPath, destPath);

          // Track this file as written
          filesWritten.push(destPath);
        }

        // Write metadata and track it
        const metadataPath = await writePackageMetadata(rulesDir, manifest);
        filesWritten.push(metadataPath);

        // Return early since we successfully copied files
        return filesWritten;
      }
    }

    // Fallback: No package files to copy, so create from manifest content
    const rulesContent = this.getRulesContent(manifest);

    // If there's no content to write, return empty (nothing to do)
    if (!rulesContent) return filesWritten;

    // Create the rules file path
    const rulesPath = path.join(rulesDir, "RULES.md");

    // Format the content with a header
    const content = `# ${manifest.name}\n\n${manifest.description}\n\n${rulesContent.trim()}\n`;

    // Write the rules file
    await fs.writeFile(rulesPath, content, "utf-8");
    filesWritten.push(rulesPath);

    // Write metadata and track it
    const metadataPath = await writePackageMetadata(rulesDir, manifest);
    filesWritten.push(metadataPath);

    return filesWritten;
  }

  /**
   * Uninstall a rules package.
   *
   * This removes the entire package directory from ~/.claude/rules/
   *
   * @param packageName - The name of the package to remove
   * @param _context - Uninstall context (not used for rules, but required by interface)
   * @returns Array of paths that were removed
   */
  async uninstall(
    packageName: string,
    _context: UninstallContext,
  ): Promise<string[]> {
    // Track removed paths for reporting
    const filesRemoved: string[] = [];

    // Sanitize the package name to get the folder name
    const folderName = sanitizeFolderName(packageName);

    // Get the base rules directory
    const rulesBaseDir = getRulesPath("claude-code");

    // Build the path to this package's rules folder
    const rulesPath = path.join(rulesBaseDir, folderName);

    // Check if the folder exists before trying to remove it
    if (await fs.pathExists(rulesPath)) {
      // Remove the entire directory and its contents
      await fs.remove(rulesPath);

      // Track it as removed
      filesRemoved.push(rulesPath);
    }

    return filesRemoved;
  }

  /**
   * Extract rules content from the manifest.
   *
   * Rules content can come from:
   * - manifest.universal.rules (primary)
   * - manifest.universal.prompt (fallback)
   *
   * @param manifest - The package manifest
   * @returns The rules content string, or undefined if none exists
   */
  private getRulesContent(manifest: PackageManifest): string | undefined {
    // Use the type guard to safely access rules-specific properties
    if (isRulesManifest(manifest)) {
      // Return rules content, falling back to prompt if rules is empty
      return manifest.universal.rules || manifest.universal.prompt;
    }

    // Not a rules manifest, no content available
    return undefined;
  }
}
