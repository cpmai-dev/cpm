/**
 * Registry Source
 *
 * This source creates package manifests from registry metadata.
 * It's the last resort fallback when all other sources fail.
 *
 * Unlike other sources that fetch pre-existing manifests, this source
 * generates a minimal manifest from the information available in the
 * registry entry (name, version, description, type).
 *
 * This ensures that packages can always be installed, even if:
 * - The package doesn't have a GitHub repository
 * - The tarball download fails
 * - The package isn't bundled with CPM
 *
 * Limitations:
 * - Generated manifests are minimal (just basic info)
 * - Content is auto-generated from name/description
 * - May not include all features of the actual package
 */

import type { RegistryPackage, PackageManifest } from "../types.js";
import { resolvePackageType } from "../types.js";
import type { ManifestSource, FetchContext } from "./types.js";

/**
 * Source that creates manifests from registry data.
 *
 * This is the final fallback source. It always succeeds because it
 * generates a manifest from the registry metadata rather than fetching
 * an existing manifest.
 *
 * The generated manifest includes:
 * - Basic metadata (name, version, description, author)
 * - Type-specific configuration based on the package type
 * - Auto-generated content from the description
 *
 * @example
 * ```typescript
 * const source = new RegistrySource();
 *
 * // This source can always fetch (it generates the manifest)
 * console.log(source.canFetch(pkg)); // Always true
 *
 * // Get a generated manifest
 * const manifest = await source.fetch(pkg, context);
 * // manifest.type is inferred from the package
 * // manifest content is auto-generated
 * ```
 */
export class RegistrySource implements ManifestSource {
  /**
   * Name of this source for logging and debugging.
   */
  readonly name = "registry";

  /**
   * Priority 4 - the lowest priority (last resort).
   * This source generates manifests rather than fetching them,
   * so it's only used when all other sources fail.
   */
  readonly priority = 4;

  /**
   * Check if this source can fetch the given package.
   *
   * This source always returns true because it generates manifests
   * from registry data. It doesn't need anything special from the package.
   *
   * @param _pkg - The registry package to check (ignored)
   * @returns Always true - we can always generate a manifest
   */
  canFetch(_pkg: RegistryPackage): boolean {
    // We can always create a manifest from registry data
    return true;
  }

  /**
   * Fetch (generate) the manifest from registry data.
   *
   * This method creates a manifest based on:
   * - The package's registry metadata (name, version, etc.)
   * - The inferred or explicit package type
   *
   * Different manifest structures are created for different types:
   * - "rules": Creates universal.rules with basic content
   * - "skill": Creates skill config with slash command
   * - "mcp": Creates mcp config with npx command
   *
   * @param pkg - The registry package to create a manifest for
   * @param _context - Fetch context (not used by this source)
   * @returns A generated manifest (never null)
   */
  async fetch(
    pkg: RegistryPackage,
    _context: FetchContext,
  ): Promise<PackageManifest | null> {
    // Generate and return the manifest
    return this.createManifestFromRegistry(pkg);
  }

  /**
   * Create a manifest from registry package data.
   *
   * This method builds a type-appropriate manifest using the
   * information available in the registry entry. The content
   * is auto-generated based on the package name and description.
   *
   * @param pkg - The registry package to create a manifest from
   * @returns A complete PackageManifest object
   */
  private createManifestFromRegistry(pkg: RegistryPackage): PackageManifest {
    // Determine the package type from the registry data
    // This uses the explicit type or infers it from the path
    const packageType = resolvePackageType(pkg);

    // Build the common base fields that all manifests share
    const baseFields = {
      name: pkg.name, // e.g., "@cpm/typescript-strict"
      version: pkg.version, // e.g., "1.0.0"
      description: pkg.description, // e.g., "TypeScript strict mode rules"
      author: { name: pkg.author }, // e.g., { name: "cpm" }
      repository: pkg.repository, // e.g., "https://github.com/..."
      keywords: pkg.keywords, // e.g., ["typescript", "rules"]
    };

    // Create type-specific manifest based on the package type
    if (packageType === "mcp") {
      // MCP packages need command configuration
      return {
        ...baseFields,
        type: "mcp",
        mcp: {
          command: "npx", // Default to npx for Node packages
          args: [], // Empty args - user will need to configure
        },
      } as PackageManifest;
    }

    if (packageType === "skill") {
      // Skill packages need command and content
      return {
        ...baseFields,
        type: "skill",
        skill: {
          // Create slash command from package name
          // e.g., "@cpm/commit-skill" becomes "/commit-skill"
          command: `/${pkg.name.replace(/^@[^/]+\//, "")}`,
          description: pkg.description,
        },
        universal: {
          // Auto-generate prompt content from package info
          prompt: `# ${pkg.name}\n\n${pkg.description}`,
        },
      } as PackageManifest;
    }

    // Default to rules type for unknown or rules packages
    return {
      ...baseFields,
      type: "rules",
      universal: {
        // Auto-generate rules content from package info
        rules: `# ${pkg.name}\n\n${pkg.description}`,
      },
    } as PackageManifest;
  }
}
