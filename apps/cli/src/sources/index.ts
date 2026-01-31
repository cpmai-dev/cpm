/**
 * Sources Module
 *
 * This module provides the manifest source system for CPM.
 * Sources are responsible for fetching package manifests from various locations.
 *
 * The source system uses a priority-based fallback chain:
 *
 * 1. **RepositorySource** (Priority 1)
 *    - Fetches cpm.yaml directly from GitHub repositories
 *    - Fastest when the package has a GitHub repo URL
 *    - Provides the most complete manifest information
 *
 * 2. **TarballSource** (Priority 2)
 *    - Downloads and extracts the package tarball
 *    - Used when repository fetch fails or isn't available
 *    - Also provides complete manifest and package files
 *
 * 3. **EmbeddedSource** (Priority 3)
 *    - Returns pre-bundled manifests for popular packages
 *    - Works offline and is very fast
 *    - Limited to packages bundled with CPM
 *
 * 4. **RegistrySource** (Priority 4)
 *    - Generates a minimal manifest from registry data
 *    - Last resort when no other source works
 *    - Provides basic functionality but may lack full content
 *
 * @example
 * ```typescript
 * import { defaultResolver } from "./sources";
 *
 * // Use the default resolver with all sources configured
 * const manifest = await defaultResolver.resolve(pkg, {
 *   tempDir: "/tmp/cpm-download"
 * });
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Export interface types for external use.
 * These define the contracts that sources must implement.
 */
export type { ManifestSource, FetchContext } from "./types.js";

// ============================================================================
// Class Exports
// ============================================================================

/**
 * The ManifestResolver coordinates multiple sources to fetch manifests.
 */
export { ManifestResolver } from "./manifest-resolver.js";

/**
 * Individual source implementations.
 * Each knows how to fetch manifests from a specific location.
 */
export { RepositorySource } from "./repository-source.js";
export { TarballSource } from "./tarball-source.js";
export { EmbeddedSource } from "./embedded-source.js";
export { RegistrySource } from "./registry-source.js";

// ============================================================================
// Imports for Factory Functions
// ============================================================================

import { ManifestResolver } from "./manifest-resolver.js";
import { RepositorySource } from "./repository-source.js";
import { TarballSource } from "./tarball-source.js";
import { EmbeddedSource } from "./embedded-source.js";
import { RegistrySource } from "./registry-source.js";

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a ManifestResolver with all default sources configured.
 *
 * This is the recommended way to create a resolver for normal use.
 * It includes all built-in sources in the correct priority order.
 *
 * The sources are:
 * 1. RepositorySource - Fetch from GitHub repos (priority 1)
 * 2. TarballSource - Download and extract tarballs (priority 2)
 * 3. EmbeddedSource - Use bundled packages (priority 3)
 * 4. RegistrySource - Generate from registry data (priority 4)
 *
 * @returns A new ManifestResolver with all default sources
 *
 * @example
 * ```typescript
 * // Create a fresh resolver (useful for testing)
 * const resolver = createDefaultResolver();
 *
 * // Use it to resolve a package
 * const manifest = await resolver.resolve(pkg, context);
 * ```
 */
export function createDefaultResolver(): ManifestResolver {
  return new ManifestResolver([
    // Priority 1: Try GitHub repository first (fastest, most complete)
    new RepositorySource(),

    // Priority 2: Download tarball if repo fails
    new TarballSource(),

    // Priority 3: Use bundled packages as fallback
    new EmbeddedSource(),

    // Priority 4: Generate from registry data as last resort
    new RegistrySource(),
  ]);
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default resolver instance with all sources configured.
 *
 * This singleton is used throughout CPM for resolving manifests.
 * It's created once when this module is first imported.
 *
 * For most use cases, import and use this directly:
 * ```typescript
 * import { defaultResolver } from "./sources";
 *
 * const manifest = await defaultResolver.resolve(pkg, context);
 * ```
 *
 * For testing or custom configurations, use createDefaultResolver()
 * or create a ManifestResolver with custom sources.
 */
export const defaultResolver = createDefaultResolver();
