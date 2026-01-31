/**
 * Package Downloader Utilities
 *
 * This module provides functions for downloading packages from the CPM registry.
 * It handles the entire download process including:
 *
 * - Creating temporary directories for package extraction
 * - Using the manifest resolver to fetch package manifests
 * - Cleaning up temporary files after installation
 *
 * The downloader uses the Strategy pattern through the ManifestResolver,
 * which tries multiple sources (GitHub, tarball, embedded, registry) in
 * priority order until one succeeds.
 *
 * @example
 * ```typescript
 * import { downloadPackage, cleanupTempDir } from "./utils/downloader";
 *
 * // Download a package
 * const result = await downloadPackage(registryPackage);
 *
 * if (result.success) {
 *   // Use result.manifest and result.tempDir
 *   console.log("Downloaded:", result.manifest.name);
 *
 *   // Clean up when done
 *   await cleanupTempDir(result.tempDir);
 * } else {
 *   console.error("Download failed:", result.error);
 * }
 * ```
 */

import fs from "fs-extra";
import path from "path";
import os from "os";
import type { RegistryPackage, DownloadResult } from "../types.js";
import { defaultResolver } from "../sources/index.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Base temporary directory for all package downloads.
 *
 * All package downloads are stored under this directory in the system's
 * temp folder. Each package gets its own subdirectory with a unique name
 * based on the package name and timestamp.
 *
 * Location: /tmp/cpm-downloads/ (or equivalent on Windows)
 */
const TEMP_DIR = path.join(os.tmpdir(), "cpm-downloads");

// ============================================================================
// Main Download Function
// ============================================================================

/**
 * Download a package from the registry.
 *
 * This function handles the complete download process:
 * 1. Creates a unique temporary directory for this package
 * 2. Uses the manifest resolver to fetch the package manifest
 * 3. Returns the manifest and temp directory path on success
 *
 * The manifest resolver tries multiple sources in priority order:
 * - GitHub repository (fastest, most complete)
 * - Tarball download (for release archives)
 * - Embedded packages (bundled with CPM)
 * - Registry data (generated from registry info)
 *
 * @param pkg - The registry package to download
 * @returns A discriminated union result:
 *          - On success: { success: true, manifest, tempDir }
 *          - On failure: { success: false, error }
 *
 * @example
 * ```typescript
 * const pkg = await registry.getPackage("@cpm/typescript-strict");
 * const result = await downloadPackage(pkg);
 *
 * if (result.success) {
 *   // TypeScript knows manifest and tempDir exist here
 *   console.log("Got manifest:", result.manifest.name);
 *   console.log("Files in:", result.tempDir);
 * } else {
 *   // TypeScript knows error exists here
 *   console.error("Failed:", result.error);
 * }
 * ```
 */
export async function downloadPackage(
  pkg: RegistryPackage,
): Promise<DownloadResult> {
  try {
    // Ensure the base temp directory exists
    // fs.ensureDir creates it if it doesn't exist, does nothing if it does
    await fs.ensureDir(TEMP_DIR);

    // Create a unique subdirectory for this package
    // Format: {package-name}-{timestamp}
    // The replace handles scoped packages: @cpm/rules → _cpm_rules
    const packageTempDir = path.join(
      TEMP_DIR,
      `${pkg.name.replace(/[@/]/g, "_")}-${Date.now()}`,
    );

    // Create the package-specific temp directory
    await fs.ensureDir(packageTempDir);

    // Use the manifest resolver to fetch the manifest
    // This tries multiple sources in priority order
    const manifest = await defaultResolver.resolve(pkg, {
      tempDir: packageTempDir,
    });

    // Return success with manifest and temp directory path
    return { success: true, manifest, tempDir: packageTempDir };
  } catch (error) {
    // Return failure with error message
    // Handle both Error objects and unknown error types
    return {
      success: false,
      error: error instanceof Error ? error.message : "Download failed",
    };
  }
}

// ============================================================================
// Cleanup Function
// ============================================================================

/**
 * Clean up a temporary download directory.
 *
 * This function removes a package's temporary directory after installation
 * is complete. It includes a safety check to ensure we only delete
 * directories within our designated temp folder.
 *
 * SECURITY: Only deletes directories that start with TEMP_DIR path.
 * This prevents accidental deletion of other system directories.
 *
 * @param tempDir - The temporary directory to remove
 *
 * @example
 * ```typescript
 * const result = await downloadPackage(pkg);
 *
 * if (result.success) {
 *   try {
 *     await installPackage(result.manifest);
 *   } finally {
 *     // Always clean up, even if installation fails
 *     await cleanupTempDir(result.tempDir);
 *   }
 * }
 * ```
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    // SECURITY CHECK: Only remove directories within our temp folder
    // This prevents accidental deletion of system directories
    if (tempDir.startsWith(TEMP_DIR)) {
      // Remove the directory and all its contents
      await fs.remove(tempDir);
    }
  } catch {
    // Silently ignore cleanup errors
    // Cleanup is best-effort - we don't want to fail installation
    // just because cleanup failed
  }
}
