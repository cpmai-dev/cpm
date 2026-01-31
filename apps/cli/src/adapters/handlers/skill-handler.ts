/**
 * Skill Package Handler
 *
 * This module handles the installation and uninstallation of "skill" type packages.
 * Skills are special commands that can be invoked in Claude Code using a slash command
 * (e.g., /commit, /review-pr). They provide focused functionality for specific tasks.
 *
 * Skills packages are installed to: ~/.claude/skills/<package-name>/
 *
 * Each skill package creates:
 * - A SKILL.md file with frontmatter (name, command, description) and instructions
 * - A .cpm.json metadata file for tracking installation info
 */

import fs from "fs-extra";
import path from "path";
import type {
  PackageManifest,
  PackageMetadata,
  SkillManifest,
} from "../../types.js";
import { isSkillManifest } from "../../types.js";
import { getSkillsPath } from "../../utils/platform.js";
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

/**
 * Write package metadata to the package folder.
 *
 * This creates a .cpm.json file that tracks:
 * - Package name and version
 * - Package type
 * - When it was installed
 *
 * This metadata is used by the `cpm list` command to show installed packages.
 *
 * @param packageDir - The directory where the package is installed
 * @param manifest - The package manifest containing name, version, etc.
 * @returns The path to the created metadata file
 */
async function writePackageMetadata(
  packageDir: string,
  manifest: PackageManifest,
): Promise<string> {
  // Create the metadata object with essential tracking information
  const metadata: PackageMetadata = {
    name: manifest.name, // e.g., "@cpm/commit-skill"
    version: manifest.version, // e.g., "1.0.0"
    type: manifest.type, // e.g., "skill"
    installedAt: new Date().toISOString(), // ISO timestamp for when it was installed
  };

  // Build the path to the metadata file
  const metadataPath = path.join(packageDir, ".cpm.json");

  try {
    // Write the metadata as formatted JSON (spaces: 2 for readability)
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
  } catch (error) {
    // Metadata writing is non-critical - warn but don't fail installation
    logger.warn(
      `Could not write metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  // Return the path regardless of success (caller tracks it)
  return metadataPath;
}

/**
 * Format skill markdown from a manifest.
 *
 * Skills require a specific format with YAML frontmatter that Claude Code
 * uses to register the slash command. This function generates that format.
 *
 * The output format is:
 * ```markdown
 * ---
 * name: skill-name
 * command: /skill-name
 * description: What this skill does
 * version: 1.0.0
 * ---
 *
 * # Skill Name
 *
 * Description
 *
 * ## Instructions
 *
 * The actual skill instructions...
 * ```
 *
 * @param manifest - The skill manifest with name, command, and content
 * @returns Formatted markdown string ready to write to a file
 */
function formatSkillMd(manifest: SkillManifest): string {
  // Extract the skill configuration
  const skill = manifest.skill;

  // Get the instruction content from universal prompt or rules
  const content = manifest.universal?.prompt || manifest.universal?.rules || "";

  // Build the markdown with YAML frontmatter
  // The frontmatter is parsed by Claude Code to register the slash command
  return `---
name: ${manifest.name}
command: ${skill.command || `/${manifest.name}`}
description: ${skill.description || manifest.description}
version: ${manifest.version}
---

# ${manifest.name}

${manifest.description}

## Instructions

${content.trim()}
`;
}

/**
 * Handler for skill packages.
 *
 * This class implements the PackageHandler interface specifically for
 * skill-type packages. It knows how to:
 * - Find the correct installation directory (~/.claude/skills/)
 * - Create properly formatted skill markdown with frontmatter
 * - Handle security validation on file names
 * - Clean up when uninstalling
 *
 * @example
 * ```typescript
 * const handler = new SkillHandler();
 *
 * // Install a skill package
 * const files = await handler.install(manifest, {
 *   projectPath: process.cwd(),
 *   packagePath: "/tmp/downloaded-skill"
 * });
 *
 * // The skill is now available as a slash command in Claude Code
 * ```
 */
export class SkillHandler implements PackageHandler {
  /**
   * Identifies this handler as handling "skill" type packages.
   * The registry uses this to route skill packages to this handler.
   */
  readonly packageType = "skill" as const;

  /**
   * Install a skill package.
   *
   * The installation process:
   * 1. Determine the target directory (~/.claude/skills/<package-name>/)
   * 2. If package files exist in packagePath, copy all .md files
   * 3. Otherwise, create a SKILL.md from the manifest content
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

    // Get the base skills directory (~/.claude/skills/)
    const skillsDir = getSkillsPath();

    // Sanitize the package name to create a safe folder name
    // e.g., "@cpm/commit-skill" becomes "commit-skill"
    const folderName = sanitizeFolderName(manifest.name);

    // Build the full path for this package's skill files
    const skillDir = path.join(skillsDir, folderName);

    // Ensure the directory exists (creates parent directories if needed)
    await fs.ensureDir(skillDir);

    // Check if we have downloaded package files to copy from
    if (context.packagePath && (await fs.pathExists(context.packagePath))) {
      // Read all files in the downloaded package directory
      const files = await fs.readdir(context.packagePath);

      // Filter to only .md files, excluding the manifest file
      const contentFiles = files.filter(
        (f) => f.endsWith(".md") && f.toLowerCase() !== "cpm.yaml",
      );

      // If we found markdown files, copy them
      if (contentFiles.length > 0) {
        for (const file of contentFiles) {
          // Validate the filename for security (prevents path traversal attacks)
          const validation = sanitizeFileName(file);

          if (!validation.valid) {
            // Skip files that fail security validation
            logger.warn(`Skipping unsafe file: ${file} (${validation.error})`);
            continue;
          }

          // Build source and destination paths
          const srcPath = path.join(context.packagePath, file);
          const destPath = path.join(skillDir, validation.sanitized);

          // Double-check the destination is within the allowed directory
          // This prevents any path traversal that might slip through
          if (!isPathWithinDirectory(destPath, skillDir)) {
            logger.warn(`Blocked path traversal attempt: ${file}`);
            continue;
          }

          // Copy the file from source to destination
          await fs.copy(srcPath, destPath);

          // Track this file as written
          filesWritten.push(destPath);
        }

        // Write metadata and track it
        const metadataPath = await writePackageMetadata(skillDir, manifest);
        filesWritten.push(metadataPath);

        // Return early since we successfully copied files
        return filesWritten;
      }
    }

    // Fallback: No package files to copy, so create from manifest content
    if (isSkillManifest(manifest)) {
      // This is a proper skill manifest with skill configuration
      // Format it with the correct frontmatter structure
      const skillContent = formatSkillMd(manifest);

      // Create the skill file path
      const skillPath = path.join(skillDir, "SKILL.md");

      // Write the formatted skill file
      await fs.writeFile(skillPath, skillContent, "utf-8");
      filesWritten.push(skillPath);

      // Write metadata and track it
      const metadataPath = await writePackageMetadata(skillDir, manifest);
      filesWritten.push(metadataPath);
    } else {
      // Not a proper skill manifest, but might have universal content
      const content = this.getUniversalContent(manifest);

      if (content) {
        // Create a simple skill file from the universal content
        const skillPath = path.join(skillDir, "SKILL.md");

        // Format with basic header and description
        const skillContent = `# ${manifest.name}\n\n${manifest.description}\n\n${content.trim()}\n`;

        // Write the skill file
        await fs.writeFile(skillPath, skillContent, "utf-8");
        filesWritten.push(skillPath);

        // Write metadata and track it
        const metadataPath = await writePackageMetadata(skillDir, manifest);
        filesWritten.push(metadataPath);
      }
    }

    return filesWritten;
  }

  /**
   * Uninstall a skill package.
   *
   * This removes the entire package directory from ~/.claude/skills/
   *
   * @param packageName - The name of the package to remove
   * @param _context - Uninstall context (not used for skills, but required by interface)
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

    // Get the base skills directory
    const skillsDir = getSkillsPath();

    // Build the path to this package's skill folder
    const skillPath = path.join(skillsDir, folderName);

    // Check if the folder exists before trying to remove it
    if (await fs.pathExists(skillPath)) {
      // Remove the entire directory and its contents
      await fs.remove(skillPath);

      // Track it as removed
      filesRemoved.push(skillPath);
    }

    return filesRemoved;
  }

  /**
   * Extract universal content from the manifest.
   *
   * This is used as a fallback when the manifest doesn't have
   * proper skill configuration but does have universal content.
   *
   * @param manifest - The package manifest
   * @returns The universal content string, or undefined if none exists
   */
  private getUniversalContent(manifest: PackageManifest): string | undefined {
    // Check if the manifest has universal content (type narrowing)
    if ("universal" in manifest && manifest.universal) {
      // Return prompt content, falling back to rules if prompt is empty
      return manifest.universal.prompt || manifest.universal.rules;
    }

    // No universal content available
    return undefined;
  }
}
