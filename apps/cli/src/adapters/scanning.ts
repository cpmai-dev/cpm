/**
 * Scanning Utilities
 *
 * Shared helpers for scanning installed packages from the filesystem.
 * Used by platform adapters to implement listInstalled().
 */

import fs from "fs-extra";
import path from "path";
import type {
  PackageMetadata,
  PackageType,
  Platform,
  InstalledPackage,
} from "../types.js";

export async function readPackageMetadata(
  packageDir: string,
): Promise<PackageMetadata | null> {
  const metadataPath = path.join(packageDir, ".cpm.json");

  try {
    if (await fs.pathExists(metadataPath)) {
      return await fs.readJson(metadataPath);
    }
  } catch {
    // Ignore read errors
  }

  return null;
}

export async function scanDirectory(
  dir: string,
  type: PackageType,
  platform?: Platform,
): Promise<InstalledPackage[]> {
  const items: InstalledPackage[] = [];

  if (!(await fs.pathExists(dir))) {
    return items;
  }

  const entries = await fs.readdir(dir);

  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    const stat = await fs.lstat(entryPath);

    if (stat.isSymbolicLink()) {
      continue;
    }

    if (stat.isDirectory()) {
      const metadata = await readPackageMetadata(entryPath);
      items.push({
        name: metadata?.name || entry,
        folderName: entry,
        type,
        version: metadata?.version,
        path: entryPath,
        platform,
      });
    }
  }

  return items;
}

export async function scanMcpServersFromConfig(
  configPath: string,
  platform: Platform,
): Promise<InstalledPackage[]> {
  const items: InstalledPackage[] = [];

  if (!(await fs.pathExists(configPath))) {
    return items;
  }

  try {
    const config = await fs.readJson(configPath);
    const mcpServers = config.mcpServers || {};

    for (const name of Object.keys(mcpServers)) {
      items.push({
        name,
        folderName: name,
        type: "mcp",
        path: configPath,
        platform,
      });
    }
  } catch {
    // Ignore parse errors
  }

  return items;
}
