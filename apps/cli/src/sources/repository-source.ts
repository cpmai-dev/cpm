/**
 * Repository Source
 *
 * Fetches package manifests directly from GitHub. Supports two modes:
 *
 * 1. **Packages repo** (primary): Uses the `path` field from registry entries
 *    to fetch cpm.yaml from the cpmai-dev/packages monorepo.
 *    e.g., path "mcp/cpm/supabase" -> packages/main/mcp/cpm/supabase/cpm.yaml
 *
 * 2. **Standalone repo**: Uses the `repository` field to fetch cpm.yaml
 *    from a package's own GitHub repository.
 *    e.g., "https://github.com/owner/repo" -> repo/main/cpm.yaml
 *
 * This is the highest priority source (priority 1) because it provides
 * the most up-to-date manifest with a single HTTP request.
 *
 * When the manifest references external content files (e.g., rules.files),
 * this source also downloads those files into the temp directory so that
 * handlers can copy them during installation.
 */

import got from "got";
import fs from "fs-extra";
import path from "path";
import yaml from "yaml";
import type { RegistryPackage, PackageManifest } from "../types.js";
import type { ManifestSource, FetchContext } from "./types.js";
import { TIMEOUTS } from "../constants.js";
import { sanitizeFileName } from "../security/index.js";
import { logger } from "../utils/logger.js";
import { validateManifest } from "../validation/manifest-schema.js";

const PACKAGES_REPO_BASE =
  "https://raw.githubusercontent.com/cpmai-dev/packages/main/packages";

const MAX_CONTENT_FILES = 20;
const MAX_CONTENT_FILE_BYTES = 512 * 1024; // 512 KB

/**
 * Extract content file references from a parsed manifest.
 *
 * Inspects the raw parsed YAML (which may have fields beyond the TypeScript type)
 * for file references that need to be downloaded alongside the manifest.
 *
 * Currently supports:
 * - `rules.files` — array of .md filenames for rules packages
 */
function extractContentFiles(manifest: Record<string, unknown>): string[] {
  const files: string[] = [];

  const rules = manifest.rules;
  if (rules && typeof rules === "object" && !Array.isArray(rules)) {
    const rulesObj = rules as Record<string, unknown>;
    if (Array.isArray(rulesObj.files)) {
      for (const file of rulesObj.files) {
        if (typeof file === "string" && file.endsWith(".md")) {
          files.push(file);
        }
      }
    }
  }

  return files.slice(0, MAX_CONTENT_FILES);
}

export class RepositorySource implements ManifestSource {
  readonly name = "repository";
  readonly priority = 1;

  canFetch(pkg: RegistryPackage): boolean {
    return !!pkg.path || !!pkg.repository?.includes("github.com");
  }

  async fetch(
    pkg: RegistryPackage,
    context: FetchContext,
  ): Promise<PackageManifest | null> {
    // Try packages repo first (most packages live here)
    if (pkg.path) {
      const manifest = await this.fetchFromPackagesRepo(pkg.path, context);
      if (manifest) return manifest;
    }

    // Fall back to standalone GitHub repo
    if (pkg.repository) {
      return this.fetchFromStandaloneRepo(pkg.repository, context);
    }

    return null;
  }

  private async fetchFromPackagesRepo(
    packagePath: string,
    context: FetchContext,
  ): Promise<PackageManifest | null> {
    if (
      packagePath.includes("..") ||
      packagePath.startsWith("/") ||
      packagePath.includes("\\")
    ) {
      return null;
    }

    const baseUrl = `${PACKAGES_REPO_BASE}/${packagePath}`;
    const rawUrl = `${baseUrl}/cpm.yaml`;

    try {
      const response = await got(rawUrl, {
        timeout: { request: TIMEOUTS.MANIFEST_FETCH },
      });

      const raw = yaml.parse(response.body);

      // Content download is best-effort — don't let it prevent manifest return
      try {
        await this.downloadContentFiles(raw, baseUrl, context.tempDir);
      } catch {
        // Content download failed, but manifest is still valid
      }

      return validateManifest(raw);
    } catch {
      return null;
    }
  }

  private async fetchFromStandaloneRepo(
    repository: string,
    context: FetchContext,
  ): Promise<PackageManifest | null> {
    try {
      const match = repository.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return null;

      const [, owner, repo] = match;
      const baseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main`;
      const rawUrl = `${baseUrl}/cpm.yaml`;

      const response = await got(rawUrl, {
        timeout: { request: TIMEOUTS.MANIFEST_FETCH },
      });

      const raw = yaml.parse(response.body);

      // Content download is best-effort — don't let it prevent manifest return
      try {
        await this.downloadContentFiles(raw, baseUrl, context.tempDir);
      } catch {
        // Content download failed, but manifest is still valid
      }

      return validateManifest(raw);
    } catch {
      return null;
    }
  }

  /**
   * Download content files referenced in the manifest into the temp directory.
   *
   * This is best-effort: individual file failures are logged and skipped.
   * If no files are referenced, this is a no-op.
   */
  private async downloadContentFiles(
    manifest: Record<string, unknown>,
    baseUrl: string,
    tempDir: string,
  ): Promise<void> {
    const files = extractContentFiles(manifest);
    if (files.length === 0) return;

    const resolvedTempDir = path.resolve(tempDir);

    await Promise.all(
      files.map(async (file) => {
        const validation = sanitizeFileName(file);
        if (!validation.valid) {
          logger.warn(
            `Skipping unsafe content file: ${file} (${validation.error})`,
          );
          return;
        }

        const filePath = path.join(tempDir, validation.sanitized);

        // Ensure resolved path stays within tempDir
        if (!path.resolve(filePath).startsWith(resolvedTempDir + path.sep)) {
          logger.warn(`Blocked path traversal for content file: ${file}`);
          return;
        }

        // Check for symlink at target path
        if (await fs.pathExists(filePath)) {
          const stat = await fs.lstat(filePath);
          if (stat.isSymbolicLink()) {
            logger.warn(`Blocked symlink at content file path: ${file}`);
            return;
          }
        }

        try {
          const fileUrl = `${baseUrl}/${validation.sanitized}`;
          const response = await got(fileUrl, {
            timeout: { request: TIMEOUTS.MANIFEST_FETCH },
          });

          const byteLength = Buffer.byteLength(response.body, "utf-8");
          if (byteLength > MAX_CONTENT_FILE_BYTES) {
            logger.warn(
              `Content file too large: ${file} (${byteLength} bytes, limit ${MAX_CONTENT_FILE_BYTES})`,
            );
            return;
          }

          await fs.writeFile(filePath, response.body, "utf-8");
        } catch {
          // Best-effort: skip files that fail to download
        }
      }),
    );
  }
}
