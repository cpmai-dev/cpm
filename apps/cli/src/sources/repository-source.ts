/**
 * Repository Source
 *
 * This source fetches package manifests directly from GitHub repositories.
 * It's the highest priority source because:
 * - It provides the most up-to-date manifest
 * - It's fast (single HTTP request for the YAML file)
 * - It doesn't require downloading the entire package
 *
 * The source works by:
 * 1. Parsing the GitHub URL from the package's repository field
 * 2. Constructing a raw.githubusercontent.com URL for the cpm.yaml file
 * 3. Fetching and parsing the YAML content
 *
 * Limitations:
 * - Only works with GitHub repositories
 * - Requires the package to have a repository URL
 * - The cpm.yaml must be in the repository root on the main branch
 */

import got from "got";
import yaml from "yaml";
import type { RegistryPackage, PackageManifest } from "../types.js";
import type { ManifestSource, FetchContext } from "./types.js";
import { TIMEOUTS } from "../constants.js";

/**
 * Source that fetches manifests from GitHub repositories.
 *
 * This is the primary source for package manifests. When a package
 * has a GitHub repository URL, we try to fetch the cpm.yaml file
 * directly from the repository.
 *
 * @example
 * ```typescript
 * const source = new RepositorySource();
 *
 * // Check if this source can handle a package
 * if (source.canFetch(pkg)) {
 *   const manifest = await source.fetch(pkg, context);
 *   if (manifest) {
 *     console.log("Got manifest from GitHub:", manifest.name);
 *   }
 * }
 * ```
 */
export class RepositorySource implements ManifestSource {
  /**
   * Name of this source for logging and debugging.
   */
  readonly name = "repository";

  /**
   * Priority 1 - this is the first source tried.
   * Repository fetching is fast and provides complete manifests.
   */
  readonly priority = 1;

  /**
   * Check if this source can fetch the given package.
   *
   * We can only fetch from GitHub repositories, so we check
   * if the package has a repository URL that includes "github.com".
   *
   * @param pkg - The registry package to check
   * @returns true if the package has a GitHub repository URL
   *
   * @example
   * ```typescript
   * // Package with GitHub repo
   * canFetch({ repository: "https://github.com/cpm/rules" }) // true
   *
   * // Package without repo
   * canFetch({ repository: undefined }) // false
   *
   * // Package with non-GitHub repo
   * canFetch({ repository: "https://gitlab.com/..." }) // false
   * ```
   */
  canFetch(pkg: RegistryPackage): boolean {
    // Check if repository field exists and contains github.com
    return !!pkg.repository?.includes("github.com");
  }

  /**
   * Fetch the manifest from the package's GitHub repository.
   *
   * This method:
   * 1. Extracts the owner and repo name from the URL
   * 2. Constructs a raw.githubusercontent.com URL for cpm.yaml
   * 3. Fetches the file with a timeout
   * 4. Parses the YAML content
   *
   * @param pkg - The registry package to fetch
   * @param _context - Fetch context (not used by this source)
   * @returns The parsed manifest, or null if fetch fails
   *
   * @example
   * ```typescript
   * const manifest = await source.fetch({
   *   name: "@cpm/typescript-rules",
   *   repository: "https://github.com/cpm/typescript-rules",
   *   // ... other fields
   * }, context);
   *
   * if (manifest) {
   *   console.log("Fetched:", manifest.name, manifest.version);
   * }
   * ```
   */
  async fetch(
    pkg: RegistryPackage,
    _context: FetchContext,
  ): Promise<PackageManifest | null> {
    // Double-check we have a repository URL
    if (!pkg.repository) return null;

    try {
      // Parse the GitHub URL to extract owner and repo name
      // Matches: https://github.com/owner/repo or github.com/owner/repo
      const match = pkg.repository.match(/github\.com\/([^/]+)\/([^/]+)/);

      // If URL doesn't match expected format, we can't fetch
      if (!match) return null;

      // Extract owner and repo from the regex match
      // match[0] is the full match, match[1] is owner, match[2] is repo
      const [, owner, repo] = match;

      // Construct the raw file URL
      // raw.githubusercontent.com serves file contents without HTML wrapper
      // We assume the cpm.yaml is on the main branch in the repo root
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/cpm.yaml`;

      // Fetch the manifest file with a timeout
      // Using got library for HTTP requests with built-in timeout support
      const response = await got(rawUrl, {
        timeout: { request: TIMEOUTS.MANIFEST_FETCH }, // 5 second timeout
      });

      // Parse the YAML content and return the manifest
      return yaml.parse(response.body);
    } catch {
      // If anything fails (network error, 404, invalid YAML), return null
      // The resolver will try the next source
      return null;
    }
  }
}
