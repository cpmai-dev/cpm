/**
 * Package downloader utilities
 * Downloads packages directly without caching
 */
import got from "got";
import fs from "fs-extra";
import path from "path";
import os from "os";
import * as tar from "tar";
import yaml from "yaml";
import type { RegistryPackage, PackageManifest } from "../types.js";
import { resolvePackageType } from "../types.js";
import { getEmbeddedManifest } from "./embedded-packages.js";
import { logger } from "./logger.js";

/** Temporary directory for downloads */
const TEMP_DIR = path.join(os.tmpdir(), "cpm-downloads");

/** Request timeout constants (ms) */
const TIMEOUTS = {
  MANIFEST_FETCH: 5000,
  TARBALL_DOWNLOAD: 30000,
} as const;

// ============================================================================
// Types
// ============================================================================

export interface DownloadResult {
  success: boolean;
  manifest: PackageManifest;
  tempDir?: string;
  error?: string;
}

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

    // Create temp directory for this package
    const packageTempDir = path.join(
      TEMP_DIR,
      `${pkg.name.replace(/[@/]/g, "_")}-${Date.now()}`,
    );
    await fs.ensureDir(packageTempDir);

    let manifest: PackageManifest | null = null;

    // Try sources in priority order
    if (pkg.repository) {
      manifest = await fetchManifestFromRepo(pkg.repository);
    }

    if (!manifest && pkg.tarball) {
      manifest = await downloadAndExtractTarball(pkg, packageTempDir);
    }

    if (!manifest) {
      manifest = getEmbeddedManifest(pkg.name);
    }

    if (!manifest) {
      manifest = createManifestFromRegistry(pkg);
    }

    return { success: true, manifest, tempDir: packageTempDir };
  } catch (error) {
    return {
      success: false,
      manifest: {} as PackageManifest,
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

// ============================================================================
// Source Fetchers
// ============================================================================

/**
 * Fetch manifest from GitHub repository
 */
async function fetchManifestFromRepo(
  repoUrl: string,
): Promise<PackageManifest | null> {
  try {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const [, owner, repo] = match;
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/cpm.yaml`;

    const response = await got(rawUrl, {
      timeout: { request: TIMEOUTS.MANIFEST_FETCH },
    });

    return yaml.parse(response.body);
  } catch {
    return null;
  }
}

/**
 * Download and extract tarball, returning manifest
 */
async function downloadAndExtractTarball(
  pkg: RegistryPackage,
  tempDir: string,
): Promise<PackageManifest | null> {
  if (!pkg.tarball) return null;

  try {
    // Enforce HTTPS for security
    const parsedUrl = new URL(pkg.tarball);
    if (parsedUrl.protocol !== "https:") {
      throw new Error("Only HTTPS URLs are allowed for downloads");
    }

    const response = await got(pkg.tarball, {
      timeout: { request: TIMEOUTS.TARBALL_DOWNLOAD },
      followRedirect: true,
      responseType: "buffer",
    });

    const tarballPath = path.join(tempDir, "package.tar.gz");
    await fs.writeFile(tarballPath, response.body);
    await extractTarball(tarballPath, tempDir);

    const manifestPath = path.join(tempDir, "cpm.yaml");
    if (await fs.pathExists(manifestPath)) {
      const content = await fs.readFile(manifestPath, "utf-8");
      return yaml.parse(content);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract tarball to destination with zip slip protection
 */
async function extractTarball(
  tarballPath: string,
  destDir: string,
): Promise<void> {
  await fs.ensureDir(destDir);
  const resolvedDestDir = path.resolve(destDir);

  await tar.extract({
    file: tarballPath,
    cwd: destDir,
    strip: 1,
    filter: (entryPath: string) => {
      const resolvedPath = path.resolve(destDir, entryPath);
      const isWithinDest =
        resolvedPath.startsWith(resolvedDestDir + path.sep) ||
        resolvedPath === resolvedDestDir;

      if (!isWithinDest) {
        logger.warn(`Blocked path traversal in tarball: ${entryPath}`);
        return false;
      }
      return true;
    },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create manifest from registry data (fallback)
 */
function createManifestFromRegistry(pkg: RegistryPackage): PackageManifest {
  return {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    type: resolvePackageType(pkg),
    author: { name: pkg.author },
    repository: pkg.repository,
    keywords: pkg.keywords,
    universal: {
      rules: `# ${pkg.name}\n\n${pkg.description}`,
    },
  };
}
