import type { RegistryPackage, PackageManifest } from '@cpm/types';

/**
 * Parse GitHub repository URL to get owner and repo
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  const owner = match?.[1];
  const repo = match?.[2];
  if (!owner || !repo) return null;
  return { owner, repo: repo.replace(/\.git$/, '') };
}

/**
 * Fetch README from a GitHub repository
 */
export async function fetchPackageReadme(pkg: RegistryPackage): Promise<string | null> {
  if (!pkg.repository) return null;

  const parsed = parseGitHubUrl(pkg.repository);
  if (!parsed) return null;

  const { owner, repo } = parsed;

  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
      { headers: { 'Accept': 'text/plain' } }
    );

    if (!response.ok) {
      // Try master branch
      const masterResponse = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`,
        { headers: { 'Accept': 'text/plain' } }
      );
      if (!masterResponse.ok) return null;
      return await masterResponse.text();
    }

    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Fetch package manifest (cpm.yaml) from GitHub
 */
export async function fetchPackageManifest(pkg: RegistryPackage): Promise<PackageManifest | null> {
  if (!pkg.repository) return null;

  const parsed = parseGitHubUrl(pkg.repository);
  if (!parsed) return null;

  const { owner, repo } = parsed;

  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/main/cpm.yaml`,
      { headers: { 'Accept': 'text/plain' } }
    );

    if (!response.ok) return null;

    const yaml = await response.text();
    // Note: Caller needs to parse YAML
    return yaml as unknown as PackageManifest;
  } catch {
    return null;
  }
}

/**
 * Fetch available versions from GitHub releases
 */
export async function fetchPackageVersions(
  pkg: RegistryPackage
): Promise<{ version: string; publishedAt: string }[]> {
  if (!pkg.repository) return [];

  const parsed = parseGitHubUrl(pkg.repository);
  if (!parsed) return [];

  const { owner, repo } = parsed;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'cpm-registry-client',
        },
      }
    );

    if (!response.ok) return [];

    const releases = await response.json() as Array<{
      tag_name: string;
      published_at: string;
    }>;

    return releases.map(release => ({
      version: release.tag_name.replace(/^v/, ''),
      publishedAt: release.published_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Get tarball URL for a specific version
 */
export function getTarballUrl(pkg: RegistryPackage, version?: string): string | null {
  if (pkg.tarball) return pkg.tarball;

  if (!pkg.repository) return null;

  const parsed = parseGitHubUrl(pkg.repository);
  if (!parsed) return null;

  const { owner, repo } = parsed;
  const v = version || pkg.version;

  return `https://github.com/${owner}/${repo}/releases/download/v${v}/package.tar.gz`;
}
