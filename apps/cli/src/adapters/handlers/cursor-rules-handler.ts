/**
 * Cursor Rules Package Handler
 *
 * Handles installation and uninstallation of "rules" type packages for Cursor IDE.
 * Rules are installed as .mdc (Markdown Component) files with YAML frontmatter
 * to the project-level .cursor/rules/ directory.
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
  validateGlobs,
} from "../../security/index.js";
import type {
  PackageHandler,
  InstallContext,
  UninstallContext,
} from "./types.js";
import { writePackageMetadata } from "./metadata.js";

/**
 * Escape a string for safe YAML value output.
 * Wraps in double quotes if the value contains special YAML characters.
 */
function escapeYamlString(value: string): string {
  if (/[\n\r\t\0:#{}[\]&*?|>!%@`"',]/.test(value) || value.trim() !== value) {
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\0/g, "")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t");
    return `"${escaped}"`;
  }
  return value;
}

/**
 * Convert rules content to MDC format with YAML frontmatter.
 */
function toMdcContent(
  description: string,
  globs: string[],
  rulesContent: string,
): string {
  const alwaysApply = globs.length === 0;
  const frontmatter = [
    "---",
    `description: ${escapeYamlString(description)}`,
    `globs: ${JSON.stringify(globs)}`,
    `alwaysApply: ${alwaysApply}`,
    "---",
  ].join("\n");

  return `${frontmatter}\n${rulesContent.trim()}\n`;
}

export class CursorRulesHandler implements PackageHandler {
  readonly packageType = "rules" as const;

  async install(
    manifest: PackageManifest,
    context: InstallContext,
  ): Promise<string[]> {
    const filesWritten: string[] = [];
    const rulesBaseDir = getRulesPath("cursor", context.projectPath);
    const folderName = sanitizeFolderName(manifest.name);
    const rulesDir = path.join(rulesBaseDir, folderName);

    await fs.ensureDir(rulesDir);

    const description = manifest.description || manifest.name;
    const globs = manifest.universal?.globs || [];

    if (globs.length > 0) {
      const globValidation = validateGlobs(globs);
      if (!globValidation.valid) {
        throw new Error(
          `Glob security validation failed: ${globValidation.error}`,
        );
      }
    }

    if (context.packagePath && (await fs.pathExists(context.packagePath))) {
      const files = await fs.readdir(context.packagePath);
      const mdFiles = files.filter(
        (f) => f.endsWith(".md") && f.toLowerCase() !== "cpm.yaml",
      );

      if (mdFiles.length > 0) {
        for (const file of mdFiles) {
          const validation = sanitizeFileName(file);

          if (!validation.valid) {
            logger.warn(`Skipping unsafe file: ${file} (${validation.error})`);
            continue;
          }

          const srcPath = path.join(context.packagePath, file);
          const mdcFileName = validation.sanitized.replace(/\.md$/, ".mdc");
          const destPath = path.join(rulesDir, mdcFileName);

          if (!isPathWithinDirectory(destPath, rulesDir)) {
            logger.warn(`Blocked path traversal attempt: ${file}`);
            continue;
          }

          const srcStat = await fs.lstat(srcPath);
          if (srcStat.isSymbolicLink()) {
            logger.warn(`Blocked symlink in package: ${file}`);
            continue;
          }

          const content = await fs.readFile(srcPath, "utf-8");
          const mdcContent = toMdcContent(description, globs, content);
          await fs.writeFile(destPath, mdcContent, "utf-8");
          filesWritten.push(destPath);
        }

        const metadataPath = await writePackageMetadata(rulesDir, manifest);
        filesWritten.push(metadataPath);

        return filesWritten;
      }
    }

    const rulesContent = this.getRulesContent(manifest);
    if (!rulesContent) {
      logger.warn(
        `No rules content found for "${manifest.name}". ` +
          "The package may be missing content files or inline rules.",
      );
      await fs.remove(rulesDir);
      return filesWritten;
    }

    const rulesPath = path.join(rulesDir, "RULES.mdc");
    const mdcContent = toMdcContent(description, globs, rulesContent);
    await fs.writeFile(rulesPath, mdcContent, "utf-8");
    filesWritten.push(rulesPath);

    const metadataPath = await writePackageMetadata(rulesDir, manifest);
    filesWritten.push(metadataPath);

    return filesWritten;
  }

  async uninstall(
    packageName: string,
    context: UninstallContext,
  ): Promise<string[]> {
    const filesRemoved: string[] = [];
    const folderName = sanitizeFolderName(packageName);
    const rulesBaseDir = getRulesPath("cursor", context.projectPath);
    const rulesPath = path.join(rulesBaseDir, folderName);

    if (await fs.pathExists(rulesPath)) {
      await fs.remove(rulesPath);
      filesRemoved.push(rulesPath);
    }

    return filesRemoved;
  }

  private getRulesContent(manifest: PackageManifest): string | undefined {
    if (isRulesManifest(manifest) && manifest.universal) {
      return manifest.universal.rules || manifest.universal.prompt;
    }
    return undefined;
  }
}
