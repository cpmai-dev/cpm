/**
 * Tarball Source
 *
 * This source fetches package manifests by downloading and extracting
 * tarball archives. It's used when the repository source fails or when
 * the package is distributed as a tarball rather than a git repository.
 *
 * The source works by:
 * 1. Downloading the tarball from the URL in the package's tarball field
 * 2. Saving it to the temporary directory
 * 3. Extracting the contents with security checks (zip slip protection)
 * 4. Reading and parsing the cpm.yaml file
 *
 * Security considerations:
 * - Only HTTPS URLs are allowed (prevents man-in-the-middle attacks)
 * - Zip slip protection prevents path traversal during extraction
 * - Files are extracted to a temporary directory that's cleaned up later
 */

import got from "got";
import fs from "fs-extra";
import path from "path";
import * as tar from "tar";
import yaml from "yaml";
import type { RegistryPackage, PackageManifest } from "../types.js";
import type { ManifestSource, FetchContext } from "./types.js";
import { TIMEOUTS, LIMITS } from "../constants.js";
import { logger } from "../utils/logger.js";
import { validateManifest } from "../validation/manifest-schema.js";

/**
 * Source that fetches manifests from tarball downloads.
 *
 * This is the secondary source for package manifests. When a package
 * has a tarball URL, we download and extract it to get the manifest.
 *
 * This source is useful for:
 * - Packages distributed as release tarballs
 * - When GitHub raw file access fails
 * - Private packages that aren't on GitHub
 *
 * @example
 * ```typescript
 * const source = new TarballSource();
 *
 * if (source.canFetch(pkg)) {
 *   const manifest = await source.fetch(pkg, {
 *     tempDir: "/tmp/cpm-download-123"
 *   });
 *   // Package files are now in context.tempDir
 * }
 * ```
 */
export class TarballSource implements ManifestSource {
  /**
   * Name of this source for logging and debugging.
   */
  readonly name = "tarball";

  /**
   * Priority 2 - tried after repository source.
   * Tarball downloading is slower but provides the full package.
   */
  readonly priority = 2;

  /**
   * Check if this source can fetch the given package.
   *
   * We can only fetch if the package has a tarball URL.
   *
   * @param pkg - The registry package to check
   * @returns true if the package has a tarball URL
   */
  canFetch(pkg: RegistryPackage): boolean {
    // Check if tarball field exists and is truthy
    return !!pkg.tarball;
  }

  /**
   * Fetch the manifest by downloading and extracting the tarball.
   *
   * This method:
   * 1. Validates the tarball URL (must be HTTPS)
   * 2. Downloads the tarball to the temp directory
   * 3. Extracts it with zip slip protection
   * 4. Reads and parses the cpm.yaml file
   *
   * @param pkg - The registry package to fetch
   * @param context - Context containing the temp directory path
   * @returns The parsed manifest, or null if fetch fails
   */
  async fetch(
    pkg: RegistryPackage,
    context: FetchContext,
  ): Promise<PackageManifest | null> {
    // Double-check we have a tarball URL
    if (!pkg.tarball) return null;

    try {
      // SECURITY: Parse the URL and verify it uses HTTPS
      // This prevents man-in-the-middle attacks during download
      const parsedUrl = new URL(pkg.tarball);

      if (parsedUrl.protocol !== "https:") {
        // Throw an error for non-HTTPS URLs
        throw new Error("Only HTTPS URLs are allowed for downloads");
      }

      // Download the tarball as a binary buffer
      // Using got library for HTTP requests with:
      // - Timeout to prevent hanging downloads
      // - Redirect following for CDN URLs
      // - Buffer response type for binary data
      const response = await got(pkg.tarball, {
        timeout: { request: TIMEOUTS.TARBALL_DOWNLOAD }, // 30 second timeout
        followRedirect: true, // Follow redirects (common for CDN URLs)
        responseType: "buffer", // Get raw binary data
      });

      // Check tarball size before writing to disk
      if (response.body.length > LIMITS.MAX_TARBALL_BYTES) {
        const sizeMb = (response.body.length / (1024 * 1024)).toFixed(1);
        const limitMb = (LIMITS.MAX_TARBALL_BYTES / (1024 * 1024)).toFixed(0);
        throw new Error(
          `Tarball too large (${sizeMb} MB, limit ${limitMb} MB)`,
        );
      }

      // Save the tarball to the temp directory
      const tarballPath = path.join(context.tempDir, "package.tar.gz");
      await fs.writeFile(tarballPath, response.body);

      // Extract the tarball with security checks
      await this.extractTarball(tarballPath, context.tempDir);

      // Look for the manifest file in the extracted contents
      const manifestPath = path.join(context.tempDir, "cpm.yaml");

      // Check if the manifest file exists
      if (await fs.pathExists(manifestPath)) {
        // Read, parse, and validate the YAML manifest
        const content = await fs.readFile(manifestPath, "utf-8");
        return validateManifest(yaml.parse(content));
      }

      // No manifest file found in the tarball
      return null;
    } catch {
      // If anything fails, return null to let the next source try
      return null;
    }
  }

  /**
   * Extract a tarball to a destination directory with security checks.
   *
   * This method extracts the tarball while protecting against:
   * - Zip slip attacks (files extracting outside the target directory)
   * - Path traversal via ".." in file paths
   *
   * The strip: 1 option removes the top-level directory from the tarball,
   * which is common in GitHub release tarballs (e.g., "package-1.0.0/").
   *
   * @param tarballPath - Path to the .tar.gz file
   * @param destDir - Directory to extract to
   */
  private async extractTarball(
    tarballPath: string,
    destDir: string,
  ): Promise<void> {
    // Ensure the destination directory exists
    await fs.ensureDir(destDir);

    // Get the absolute path of the destination for security checks
    const resolvedDestDir = path.resolve(destDir);

    // Extract the tarball with security filtering
    await tar.extract({
      file: tarballPath, // The tarball file to extract
      cwd: destDir, // Extract to this directory
      strip: 1, // Remove the top-level directory (e.g., "package-1.0.0/")

      // Security filter: check each entry before extracting
      filter: (entryPath: string) => {
        // Resolve the full path where this entry would be extracted
        const resolvedPath = path.resolve(destDir, entryPath);

        // Check if the resolved path is within the destination directory
        // This prevents "zip slip" attacks where files escape the target dir
        const isWithinDest =
          resolvedPath.startsWith(resolvedDestDir + path.sep) ||
          resolvedPath === resolvedDestDir;

        // If the file would escape the destination, block it
        if (!isWithinDest) {
          // Log a warning about the blocked file
          logger.warn(`Blocked path traversal in tarball: ${entryPath}`);
          // Return false to skip this entry
          return false;
        }

        // File is safe to extract
        return true;
      },
    });
  }
}
