/**
 * Package downloader utilities
 * Downloads packages directly without caching
 */
import got from 'got';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import * as tar from 'tar';
import yaml from 'yaml';
import type { RegistryPackage, PackageManifest, PackageType } from '../types.js';
import { getEmbeddedManifest } from './embedded-packages.js';
import { logger } from './logger.js';

/** Temporary directory for downloads */
const TEMP_DIR = path.join(os.tmpdir(), 'cpm-downloads');

/** Base URL for packages registry (configurable via env) */
const PACKAGES_BASE_URL = process.env.CPM_PACKAGES_URL || 'https://raw.githubusercontent.com/cpmai-dev/packages/main';

/** Request timeout constants (ms) */
const TIMEOUTS = {
  MANIFEST_FETCH: 5000,
  TARBALL_DOWNLOAD: 30000,
  API_REQUEST: 10000,
} as const;

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Validate and sanitize a file name to prevent path traversal
 */
function sanitizeFileName(fileName: string): string {
  const sanitized = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');

  if (!sanitized || sanitized.includes('..') || sanitized.startsWith('.')) {
    throw new Error(`Invalid file name: ${fileName}`);
  }

  return sanitized;
}

/**
 * Validate that a destination path is within the allowed directory
 */
function validatePathWithinDir(destPath: string, allowedDir: string): void {
  const resolvedDest = path.resolve(destPath);
  const resolvedDir = path.resolve(allowedDir);

  if (!resolvedDest.startsWith(resolvedDir + path.sep) && resolvedDest !== resolvedDir) {
    throw new Error(`Path traversal detected: ${destPath}`);
  }
}

/**
 * Validate and sanitize a package path from registry
 */
function validatePackagePath(pkgPath: string): string {
  const normalized = path.normalize(pkgPath).replace(/\\/g, '/');

  if (normalized.includes('..') || normalized.startsWith('/')) {
    throw new Error(`Invalid package path: ${pkgPath}`);
  }

  return normalized;
}

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
export async function downloadPackage(pkg: RegistryPackage): Promise<DownloadResult> {
  try {
    await fs.ensureDir(TEMP_DIR);

    // Create temp directory for this package
    const packageTempDir = path.join(TEMP_DIR, `${pkg.name.replace(/[@\/]/g, '_')}-${Date.now()}`);
    await fs.ensureDir(packageTempDir);

    let manifest: PackageManifest | null = null;

    // Try sources in priority order
    if (pkg.path) {
      manifest = await fetchPackageFromPath(pkg, packageTempDir);
    }

    if (!manifest && pkg.repository) {
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
      error: error instanceof Error ? error.message : 'Download failed',
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
async function fetchManifestFromRepo(repoUrl: string): Promise<PackageManifest | null> {
  try {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
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
  tempDir: string
): Promise<PackageManifest | null> {
  if (!pkg.tarball) return null;

  try {
    // Enforce HTTPS for security
    const parsedUrl = new URL(pkg.tarball);
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed for downloads');
    }

    const response = await got(pkg.tarball, {
      timeout: { request: TIMEOUTS.TARBALL_DOWNLOAD },
      followRedirect: true,
      responseType: 'buffer',
    });

    const tarballPath = path.join(tempDir, 'package.tar.gz');
    await fs.writeFile(tarballPath, response.body);
    await extractTarball(tarballPath, tempDir);

    const manifestPath = path.join(tempDir, 'cpm.yaml');
    if (await fs.pathExists(manifestPath)) {
      const content = await fs.readFile(manifestPath, 'utf-8');
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
async function extractTarball(tarballPath: string, destDir: string): Promise<void> {
  await fs.ensureDir(destDir);
  const resolvedDestDir = path.resolve(destDir);

  await tar.extract({
    file: tarballPath,
    cwd: destDir,
    strip: 1,
    filter: (entryPath: string) => {
      const resolvedPath = path.resolve(destDir, entryPath);
      const isWithinDest = resolvedPath.startsWith(resolvedDestDir + path.sep) ||
                           resolvedPath === resolvedDestDir;

      if (!isWithinDest) {
        logger.warn(`Blocked path traversal in tarball: ${entryPath}`);
        return false;
      }
      return true;
    },
  });
}

/**
 * Fetch package content from path in cpmai-dev registry
 */
async function fetchPackageFromPath(
  pkg: RegistryPackage,
  tempDir: string
): Promise<PackageManifest | null> {
  if (!pkg.path) return null;

  try {
    const safePath = validatePackagePath(pkg.path);
    const githubInfo = parseGitHubInfo(PACKAGES_BASE_URL);

    if (!githubInfo) {
      return fetchSingleFileFromPath(pkg);
    }

    const apiUrl = `https://api.github.com/repos/${githubInfo.owner}/${githubInfo.repo}/contents/${safePath}`;
    const response = await got(apiUrl, {
      timeout: { request: TIMEOUTS.API_REQUEST },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'cpm-cli',
      },
      responseType: 'json',
    });

    const files = response.body as Array<{
      name: string;
      type: string;
      download_url: string | null;
    }>;

    let mainContent = '';
    const contentFile = getContentFileName(pkg.type);

    for (const file of files) {
      if (file.type === 'file' && file.download_url) {
        const safeFileName = sanitizeFileName(file.name);
        const destPath = path.join(tempDir, safeFileName);

        validatePathWithinDir(destPath, tempDir);

        const fileResponse = await got(file.download_url, {
          timeout: { request: TIMEOUTS.API_REQUEST },
        });

        await fs.writeFile(destPath, fileResponse.body, 'utf-8');

        if (file.name === contentFile) {
          mainContent = fileResponse.body;
        }
      }
    }

    return createManifestWithContent(pkg, mainContent);
  } catch {
    return fetchSingleFileFromPath(pkg);
  }
}

/**
 * Fallback: fetch only the main content file
 */
async function fetchSingleFileFromPath(pkg: RegistryPackage): Promise<PackageManifest | null> {
  if (!pkg.path) return null;

  try {
    const safePath = validatePackagePath(pkg.path);
    const contentFile = getContentFileName(pkg.type);
    const contentUrl = `${PACKAGES_BASE_URL}/${safePath}/${contentFile}`;

    const response = await got(contentUrl, {
      timeout: { request: TIMEOUTS.API_REQUEST },
    });

    return createManifestWithContent(pkg, response.body);
  } catch {
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get content file name based on package type
 */
function getContentFileName(type: PackageType): string {
  const fileNames: Record<string, string> = {
    skill: 'SKILL.md',
    rules: 'RULES.md',
    mcp: 'MCP.md',
    agent: 'AGENT.md',
    hook: 'HOOK.md',
    workflow: 'WORKFLOW.md',
    template: 'TEMPLATE.md',
    bundle: 'BUNDLE.md',
  };
  return fileNames[type] || 'README.md';
}

/**
 * Parse GitHub repo info from URL
 */
function parseGitHubInfo(baseUrl: string): { owner: string; repo: string } | null {
  const match = baseUrl.match(/github(?:usercontent)?\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

/**
 * Create manifest from registry data with content
 */
function createManifestWithContent(pkg: RegistryPackage, content: string): PackageManifest {
  return {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    type: pkg.type,
    author: { name: pkg.author },
    keywords: pkg.keywords,
    universal: {
      rules: content,
      prompt: content,
    },
    skill: pkg.type === 'skill' ? {
      command: `/${pkg.name.split('/').pop()}`,
      description: pkg.description,
    } : undefined,
  };
}

/**
 * Create manifest from registry data (fallback)
 */
function createManifestFromRegistry(pkg: RegistryPackage): PackageManifest {
  return {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    type: pkg.type,
    author: { name: pkg.author },
    repository: pkg.repository,
    keywords: pkg.keywords,
    universal: {
      rules: `# ${pkg.name}\n\n${pkg.description}`,
    },
  };
}
