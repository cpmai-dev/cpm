/**
 * Embedded Source
 *
 * This source returns package manifests from embedded/bundled packages.
 * Some popular packages are bundled directly into CPM to provide:
 *
 * - Offline installation capability
 * - Faster installation (no network required)
 * - Guaranteed availability of essential packages
 *
 * Embedded packages are defined in the embedded-packages.ts utility file.
 * They include complete manifest data and content, so they can be
 * installed without any network access.
 *
 * This source is used as a fallback when:
 * - Network access fails
 * - The repository source can't find the manifest
 * - The tarball download fails
 *
 * Limitations:
 * - Only works for packages that are bundled with CPM
 * - Bundled versions may be older than the latest release
 */

import type { RegistryPackage, PackageManifest } from "../types.js";
import type { ManifestSource, FetchContext } from "./types.js";
import { getEmbeddedManifest } from "../utils/embedded-packages.js";

/**
 * Source that returns embedded package manifests.
 *
 * This source provides manifests for packages that are bundled
 * directly into the CPM CLI. It's useful for:
 * - Ensuring popular packages are always available
 * - Working offline or in restricted network environments
 * - Fast installation without network delays
 *
 * @example
 * ```typescript
 * const source = new EmbeddedSource();
 *
 * // Check if the package is bundled
 * if (source.canFetch(pkg)) {
 *   // Get the bundled manifest (instant, no network)
 *   const manifest = await source.fetch(pkg, context);
 * }
 * ```
 */
export class EmbeddedSource implements ManifestSource {
  /**
   * Name of this source for logging and debugging.
   */
  readonly name = "embedded";

  /**
   * Priority 3 - used as a fallback after network sources.
   * Embedded packages are tried after repository and tarball sources
   * because they may be older versions.
   */
  readonly priority = 3;

  /**
   * Check if this source can fetch the given package.
   *
   * We can only fetch packages that are bundled into CPM.
   * This check looks up the package name in the embedded packages map.
   *
   * @param pkg - The registry package to check
   * @returns true if the package is bundled with CPM
   *
   * @example
   * ```typescript
   * // Bundled package
   * canFetch({ name: "@cpm/typescript-strict" }) // true (if bundled)
   *
   * // Not bundled
   * canFetch({ name: "@custom/my-package" }) // false
   * ```
   */
  canFetch(pkg: RegistryPackage): boolean {
    // Check if we have an embedded manifest for this package name
    // getEmbeddedManifest returns null if the package isn't bundled
    return getEmbeddedManifest(pkg.name) !== null;
  }

  /**
   * Fetch the manifest from embedded packages.
   *
   * This method simply looks up the package in the embedded packages
   * map and returns the manifest. It's synchronous internally but
   * returns a Promise to match the interface.
   *
   * @param pkg - The registry package to fetch
   * @param _context - Fetch context (not used by this source)
   * @returns The embedded manifest, or null if not found
   *
   * @example
   * ```typescript
   * const manifest = await source.fetch(pkg, context);
   * if (manifest) {
   *   console.log("Using bundled manifest for:", manifest.name);
   * }
   * ```
   */
  async fetch(
    pkg: RegistryPackage,
    _context: FetchContext,
  ): Promise<PackageManifest | null> {
    // Look up the embedded manifest by package name
    // Returns the manifest if found, null otherwise
    return getEmbeddedManifest(pkg.name);
  }
}
