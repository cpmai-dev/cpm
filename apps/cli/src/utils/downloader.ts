/**
 * Package downloader utilities
 * Downloads packages using the manifest resolver
 */
import fs from "fs-extra";
import path from "path";
import os from "os";
import type { RegistryPackage, DownloadResult } from "../types.js";
import { defaultResolver } from "../sources/index.js";

/** Temporary directory for downloads */
const TEMP_DIR = path.join(os.tmpdir(), "cpm-downloads");

// ============================================================================
// Main Download Function
// ============================================================================

/**
 * Download a package from the registry
 * Returns manifest and temporary directory with files
 */
export async function downloadPackage(
  pkg: RegistryPackage,
): Promise<DownloadResult> {
  try {
    await fs.ensureDir(TEMP_DIR);

    const packageTempDir = path.join(
      TEMP_DIR,
      `${pkg.name.replace(/[@/]/g, "_")}-${Date.now()}`,
    );
    await fs.ensureDir(packageTempDir);

    const manifest = await defaultResolver.resolve(pkg, {
      tempDir: packageTempDir,
    });

    return { success: true, manifest, tempDir: packageTempDir };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Download failed",
    };
  }
}

/**
 * Clean up temporary download directory
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    if (tempDir.startsWith(TEMP_DIR)) {
      await fs.remove(tempDir);
    }
  } catch {
    // Ignore cleanup errors
  }
}
