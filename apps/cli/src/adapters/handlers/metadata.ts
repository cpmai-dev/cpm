/**
 * Shared Package Metadata Writer
 *
 * Creates .cpm.json metadata files in package directories.
 * Used by rules, skill, and cursor-rules handlers to track
 * installed package info for the `cpm list` command.
 */

import fs from "fs-extra";
import path from "path";
import type { PackageManifest, PackageMetadata } from "../../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Write package metadata to the package folder.
 *
 * Creates a .cpm.json file that tracks:
 * - Package name and version
 * - Package type
 * - When it was installed
 *
 * @param packageDir - The directory where the package is installed
 * @param manifest - The package manifest containing name, version, etc.
 * @returns The path to the created metadata file
 */
export async function writePackageMetadata(
  packageDir: string,
  manifest: PackageManifest,
): Promise<string> {
  const metadata: PackageMetadata = {
    name: manifest.name,
    version: manifest.version,
    type: manifest.type,
    installedAt: new Date().toISOString(),
  };

  const metadataPath = path.join(packageDir, ".cpm.json");

  try {
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
  } catch (error) {
    logger.warn(
      `Could not write metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return metadataPath;
}
