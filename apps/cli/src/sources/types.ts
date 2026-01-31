/**
 * Manifest Source Interface Types
 *
 * This module defines the interfaces for the package manifest source system.
 * Sources are responsible for fetching package manifests from various locations
 * like GitHub repositories, tarballs, embedded packages, or the registry itself.
 *
 * The source system follows the Strategy Pattern, where each source implements
 * the same interface but fetches manifests differently. This allows:
 * - Easy addition of new source types without modifying existing code
 * - Fallback chains where sources are tried in priority order
 * - Clean separation between "what to fetch" and "how to fetch"
 *
 * The typical fetch order is:
 * 1. RepositorySource - Try to fetch from GitHub (has full package content)
 * 2. TarballSource - Download and extract tarball (has full package content)
 * 3. EmbeddedSource - Use bundled fallback packages
 * 4. RegistrySource - Generate minimal manifest from registry data
 */

import type { RegistryPackage, PackageManifest } from "../types.js";

/**
 * Context provided to manifest sources during fetching.
 *
 * This object contains information that sources need to do their work,
 * such as where to store downloaded files.
 *
 * @example
 * ```typescript
 * const context: FetchContext = {
 *   tempDir: "/tmp/cpm-downloads/package-123456"
 * };
 *
 * const manifest = await source.fetch(pkg, context);
 * ```
 */
export interface FetchContext {
  /**
   * Temporary directory for this download operation.
   *
   * Sources that need to download and extract files (like TarballSource)
   * use this directory to store their work. The directory is cleaned up
   * after the download operation completes.
   */
  tempDir: string;
}

/**
 * Interface for package manifest sources.
 *
 * Each source knows how to fetch manifests from a specific location.
 * Sources are used by the ManifestResolver, which tries them in order
 * until one succeeds.
 *
 * Implementing a new source requires:
 * 1. Setting a unique name for logging
 * 2. Setting a priority (lower = tried first)
 * 3. Implementing canFetch() to check if this source applies
 * 4. Implementing fetch() to actually retrieve the manifest
 *
 * @example
 * ```typescript
 * class MyCustomSource implements ManifestSource {
 *   readonly name = "custom";
 *   readonly priority = 5;
 *
 *   canFetch(pkg: RegistryPackage): boolean {
 *     return pkg.customUrl !== undefined;
 *   }
 *
 *   async fetch(pkg: RegistryPackage, context: FetchContext): Promise<PackageManifest | null> {
 *     // Fetch from custom URL...
 *     return manifest;
 *   }
 * }
 * ```
 */
export interface ManifestSource {
  /**
   * Human-readable name of this source.
   *
   * Used for logging and debugging to identify which source
   * was used to fetch a manifest.
   *
   * @example "repository", "tarball", "embedded", "registry"
   */
  readonly name: string;

  /**
   * Priority of this source (lower numbers = higher priority).
   *
   * When the ManifestResolver tries to fetch a manifest, it tries
   * sources in order of priority. Lower numbers are tried first.
   *
   * Recommended priority ranges:
   * - 1-2: Primary sources (repository, tarball)
   * - 3-4: Fallback sources (embedded packages)
   * - 5+: Last resort sources (generate from registry data)
   *
   * @example 1 (high priority) or 4 (low priority/fallback)
   */
  readonly priority: number;

  /**
   * Check if this source can attempt to fetch the given package.
   *
   * This is a quick check to determine if this source is applicable
   * for the given package. It should NOT make network requests.
   *
   * Return true if this source should be tried, false to skip.
   *
   * @param pkg - The registry package to check
   * @returns true if this source can potentially fetch the package
   *
   * @example
   * ```typescript
   * // RepositorySource checks if package has a GitHub URL
   * canFetch(pkg: RegistryPackage): boolean {
   *   return !!pkg.repository?.includes("github.com");
   * }
   * ```
   */
  canFetch(pkg: RegistryPackage): boolean;

  /**
   * Attempt to fetch the manifest for a package.
   *
   * This method does the actual work of retrieving the manifest.
   * It may make network requests, read files, or generate content.
   *
   * Return null if the fetch fails or the manifest isn't available
   * from this source. The resolver will try the next source.
   *
   * @param pkg - The registry package to fetch
   * @param context - Context with temp directory and other info
   * @returns The package manifest, or null if fetch failed
   *
   * @example
   * ```typescript
   * async fetch(pkg: RegistryPackage, context: FetchContext): Promise<PackageManifest | null> {
   *   try {
   *     const response = await fetch(pkg.manifestUrl);
   *     return await response.json();
   *   } catch {
   *     return null; // Let the next source try
   *   }
   * }
   * ```
   */
  fetch(
    pkg: RegistryPackage,
    context: FetchContext,
  ): Promise<PackageManifest | null>;
}
