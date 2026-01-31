/**
 * Manifest Resolver
 *
 * This module provides the ManifestResolver class, which coordinates
 * multiple manifest sources to fetch package manifests.
 *
 * The resolver implements the Chain of Responsibility pattern:
 * - It holds a list of sources, each capable of fetching manifests
 * - Sources are tried in priority order (lowest priority number first)
 * - The first source to successfully return a manifest "wins"
 * - If all sources fail, an error is thrown
 *
 * This design provides:
 * - Graceful fallback when primary sources fail (e.g., network issues)
 * - Easy addition of new sources without changing the resolver
 * - Clear separation between source selection and source implementation
 *
 * @example
 * ```typescript
 * const resolver = new ManifestResolver([
 *   new RepositorySource(),   // Priority 1: Try GitHub first
 *   new TarballSource(),      // Priority 2: Download tarball
 *   new EmbeddedSource(),     // Priority 3: Use bundled packages
 *   new RegistrySource(),     // Priority 4: Generate from registry
 * ]);
 *
 * const manifest = await resolver.resolve(pkg, { tempDir: "/tmp/..." });
 * ```
 */

import type { RegistryPackage, PackageManifest } from "../types.js";
import type { ManifestSource, FetchContext } from "./types.js";

/**
 * Resolves package manifests by trying sources in priority order.
 *
 * This class is the main entry point for fetching package manifests.
 * It manages a list of sources and coordinates the fetch process.
 *
 * How it works:
 * 1. Sources are sorted by priority when the resolver is created
 * 2. When resolve() is called, each source is tried in order
 * 3. For each source, canFetch() is called to check if it applies
 * 4. If canFetch() returns true, fetch() is called
 * 5. If fetch() returns a manifest, that manifest is returned
 * 6. If fetch() returns null, the next source is tried
 * 7. If all sources fail, an error is thrown
 *
 * @example
 * ```typescript
 * // Create a resolver with custom sources
 * const resolver = new ManifestResolver([
 *   new MyHighPrioritySource(),
 *   new MyFallbackSource(),
 * ]);
 *
 * // Resolve a package manifest
 * try {
 *   const manifest = await resolver.resolve(pkg, context);
 *   console.log(`Got manifest from source: ${manifest.name}`);
 * } catch (error) {
 *   console.error("All sources failed:", error.message);
 * }
 * ```
 */
export class ManifestResolver {
  /**
   * List of sources, sorted by priority (lowest first).
   * This array is created once during construction and never modified.
   */
  private readonly sources: ManifestSource[];

  /**
   * Create a new ManifestResolver with the given sources.
   *
   * The sources are automatically sorted by priority (lowest first)
   * so they're tried in the correct order during resolution.
   *
   * @param sources - Array of manifest sources to use
   *
   * @example
   * ```typescript
   * const resolver = new ManifestResolver([
   *   new RepositorySource(),  // priority: 1
   *   new TarballSource(),     // priority: 2
   *   new RegistrySource(),    // priority: 4
   * ]);
   * // Sources will be tried in order: Repository, Tarball, Registry
   * ```
   */
  constructor(sources: ManifestSource[]) {
    // Copy the array to avoid modifying the original
    // Sort by priority (lower numbers come first)
    this.sources = [...sources].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Resolve the manifest for a package.
   *
   * This method tries each source in priority order until one
   * successfully returns a manifest. If all sources fail, an
   * error is thrown.
   *
   * The resolution process:
   * 1. For each source (in priority order):
   *    a. Check if the source can fetch this package (canFetch)
   *    b. If yes, try to fetch the manifest
   *    c. If fetch returns a manifest, return it immediately
   *    d. If fetch returns null, continue to the next source
   * 2. If no source returned a manifest, throw an error
   *
   * @param pkg - The registry package to resolve
   * @param context - Context with temp directory for downloads
   * @returns The resolved package manifest
   * @throws Error if no source can provide a manifest
   *
   * @example
   * ```typescript
   * const pkg = await registry.getPackage("@cpm/typescript-rules");
   * const context = { tempDir: "/tmp/cpm-download-123" };
   *
   * const manifest = await resolver.resolve(pkg, context);
   * console.log(`Package type: ${manifest.type}`);
   * ```
   */
  async resolve(
    pkg: RegistryPackage,
    context: FetchContext,
  ): Promise<PackageManifest> {
    // Try each source in priority order
    for (const source of this.sources) {
      // Check if this source can potentially fetch this package
      if (source.canFetch(pkg)) {
        // Try to fetch the manifest from this source
        const manifest = await source.fetch(pkg, context);

        // If we got a manifest, return it immediately
        if (manifest) {
          return manifest;
        }
        // If fetch returned null, continue to the next source
      }
      // If canFetch returned false, skip to the next source
    }

    // All sources failed - no manifest could be found
    throw new Error(`No manifest found for package: ${pkg.name}`);
  }

  /**
   * Get the names of all registered sources.
   *
   * Useful for debugging and displaying information about
   * which sources are configured.
   *
   * @returns Array of source names in priority order
   *
   * @example
   * ```typescript
   * const names = resolver.getSourceNames();
   * console.log("Configured sources:", names.join(", "));
   * // Output: "Configured sources: repository, tarball, embedded, registry"
   * ```
   */
  getSourceNames(): string[] {
    // Map each source to its name
    return this.sources.map((s) => s.name);
  }
}
