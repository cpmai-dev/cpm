/**
 * Package downloader utilities
 * Handles downloading, extracting, and caching packages from the registry
 */
import got from 'got';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import * as tar from 'tar';
import yaml from 'yaml';
import type { RegistryPackage, PackageManifest, PackageType } from '../types.js';
import { getCpmDir, ensureCpmDir } from './config.js';
import { getEmbeddedManifest } from './embedded-packages.js';

/** Cache directory for downloaded packages */
const DOWNLOAD_CACHE_DIR = path.join(os.homedir(), '.cpm', 'cache', 'packages');

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
  packagePath: string;
  manifest: PackageManifest;
  error?: string;
}

// ============================================================================
// Main Download Function
// ============================================================================

/**
 * Download and extract a package from the registry
 * Tries multiple sources in priority order:
 * 1. Path-based fetch (cpmai-dev registry)
 * 2. Repository fetch (GitHub repos)
 * 3. Tarball download
 * 4. Embedded manifest (offline fallback)
 * 5. Registry data (last resort)
 */
export async function downloadPackage(
  pkg: RegistryPackage,
  projectPath: string = process.cwd()
): Promise<DownloadResult> {
  try {
    await ensureCpmDir(projectPath);
    await fs.ensureDir(DOWNLOAD_CACHE_DIR);

    const packageDir = path.join(getCpmDir(projectPath), 'packages', pkg.name);
    await fs.ensureDir(packageDir);

    let manifest: PackageManifest | null = null;

    // Try sources in priority order
    if (pkg.path) {
      manifest = await fetchPackageFromPath(pkg, packageDir);
    }

    if (!manifest && pkg.repository) {
      manifest = await fetchManifestFromRepo(pkg.repository);
    }

    if (!manifest && pkg.tarball) {
      manifest = await downloadAndExtractTarball(pkg, packageDir);
    }

    if (!manifest) {
      manifest = getEmbeddedManifest(pkg.name);
    }

    if (!manifest) {
      manifest = createManifestFromRegistry(pkg);
    }

    // Write manifest to package directory
    await fs.writeFile(
      path.join(packageDir, 'cpm.yaml'),
      yaml.stringify(manifest),
      'utf-8'
    );

    return { success: true, packagePath: packageDir, manifest };
  } catch (error) {
    return {
      success: false,
      packagePath: '',
      manifest: {} as PackageManifest,
      error: error instanceof Error ? error.message : 'Download failed',
    };
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
  packageDir: string
): Promise<PackageManifest | null> {
  if (!pkg.tarball) return null;

  try {
    const tarballPath = await downloadTarball(pkg.tarball, pkg.name, pkg.version);
    if (!tarballPath) return null;

    await extractTarball(tarballPath, packageDir);

    const manifestPath = path.join(packageDir, 'cpm.yaml');
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
 * Download tarball to cache
 */
async function downloadTarball(url: string, name: string, version: string): Promise<string | null> {
  try {
    // Enforce HTTPS for security
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed for downloads');
    }

    const safeName = name.replace(/[@\/]/g, '_');
    const tarballPath = path.join(DOWNLOAD_CACHE_DIR, `${safeName}-${version}.tar.gz`);

    if (await fs.pathExists(tarballPath)) {
      return tarballPath;
    }

    const response = await got(url, {
      timeout: { request: TIMEOUTS.TARBALL_DOWNLOAD },
      followRedirect: true,
      responseType: 'buffer',
    });

    await fs.writeFile(tarballPath, response.body);
    return tarballPath;
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
        console.warn(`Blocked path traversal in tarball: ${entryPath}`);
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
  packageDir: string
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
        const destPath = path.join(packageDir, safeFileName);

        validatePathWithinDir(destPath, packageDir);

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
