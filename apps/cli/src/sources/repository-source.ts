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
 */

import got from "got";
import yaml from "yaml";
import type { RegistryPackage, PackageManifest } from "../types.js";
import type { ManifestSource, FetchContext } from "./types.js";
import { TIMEOUTS } from "../constants.js";

const PACKAGES_REPO_BASE =
  "https://raw.githubusercontent.com/cpmai-dev/packages/main/packages";

export class RepositorySource implements ManifestSource {
  readonly name = "repository";
  readonly priority = 1;

  canFetch(pkg: RegistryPackage): boolean {
    return !!pkg.path || !!pkg.repository?.includes("github.com");
  }

  async fetch(
    pkg: RegistryPackage,
    _context: FetchContext,
  ): Promise<PackageManifest | null> {
    // Try packages repo first (most packages live here)
    if (pkg.path) {
      const manifest = await this.fetchFromPackagesRepo(pkg.path);
      if (manifest) return manifest;
    }

    // Fall back to standalone GitHub repo
    if (pkg.repository) {
      return this.fetchFromStandaloneRepo(pkg.repository);
    }

    return null;
  }

  private async fetchFromPackagesRepo(
    packagePath: string,
  ): Promise<PackageManifest | null> {
    if (
      packagePath.includes("..") ||
      packagePath.startsWith("/") ||
      packagePath.includes("\\")
    ) {
      return null;
    }

    const rawUrl = `${PACKAGES_REPO_BASE}/${packagePath}/cpm.yaml`;

    try {
      const response = await got(rawUrl, {
        timeout: { request: TIMEOUTS.MANIFEST_FETCH },
      });

      return yaml.parse(response.body);
    } catch {
      return null;
    }
  }

  private async fetchFromStandaloneRepo(
    repository: string,
  ): Promise<PackageManifest | null> {
    try {
      const match = repository.match(/github\.com\/([^/]+)\/([^/]+)/);
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
}
