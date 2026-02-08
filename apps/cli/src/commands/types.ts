/**
 * Command Types
 *
 * This module defines strong types for CLI command options and results.
 * Using discriminated unions and type guards ensures type safety at
 * the CLI boundary where user input is parsed.
 *
 * Design principles:
 * - All options have explicit types (not just `string`)
 * - Results use discriminated unions for exhaustive checking
 * - Type guards validate raw CLI input
 */

import type { PackageType, Platform } from "../types.js";
import { isPackageType, isSearchSort, isValidPlatform } from "../types.js";
import { SEARCH_SORT_OPTIONS } from "../constants.js";

// ============================================================================
// Search Sort Type
// ============================================================================

/**
 * Valid sort options for search results.
 */
export type SearchSort = (typeof SEARCH_SORT_OPTIONS)[number];

// ============================================================================
// Install Command Types
// ============================================================================

/**
 * Raw options from CLI parser for install command.
 *
 * These are strings because that's what the CLI parser provides.
 * They need to be validated and converted to typed options.
 */
export interface RawInstallOptions {
  platform?: string;
  version?: string;
}

/**
 * Validated and typed install options.
 *
 * After validation, we have type-safe options.
 */
export interface InstallOptions {
  /** Target platform for installation */
  platform: Platform;
  /** Specific version to install (optional) */
  version?: string;
}

/**
 * Parse and validate raw install options.
 *
 * Converts raw CLI strings to typed options.
 * Returns default values for missing options.
 *
 * @param raw - Raw options from CLI parser
 * @returns Validated options or null if invalid
 *
 * @example
 * ```typescript
 * const options = parseInstallOptions({ platform: "claude-code" });
 * if (options) {
 *   // options.platform is typed as Platform
 * }
 * ```
 */
export function parseInstallOptions(
  raw: RawInstallOptions,
): InstallOptions | null {
  // Validate platform if provided
  if (raw.platform && raw.platform !== "all") {
    if (!isValidPlatform(raw.platform)) {
      return null;
    }
    return {
      platform: raw.platform,
      version: raw.version,
    };
  }

  // Default to claude-code
  return {
    platform: "claude-code",
    version: raw.version,
  };
}

// ============================================================================
// Search Command Types
// ============================================================================

/**
 * Raw options from CLI parser for search command.
 */
export interface RawSearchOptions {
  type?: string;
  limit?: string;
  sort?: string;
}

/**
 * Validated and typed search options.
 */
export interface SearchOptions {
  /** Search query string */
  query: string;
  /** Filter by package type */
  type?: PackageType;
  /** Maximum results to return */
  limit: number;
  /** Sort order */
  sort?: SearchSort;
}

/**
 * Default values for search options.
 */
const SEARCH_DEFAULTS = {
  limit: 10,
  minLimit: 1,
  maxLimit: 100,
} as const;

/**
 * Parse and validate raw search options.
 *
 * Converts raw CLI strings to typed options.
 * Validates and clamps limit to valid range.
 *
 * @param query - The search query string
 * @param raw - Raw options from CLI parser
 * @returns Validated search options
 *
 * @example
 * ```typescript
 * const options = parseSearchOptions("react", { type: "rules", limit: "20" });
 * // options.type is PackageType | undefined
 * // options.limit is number (clamped to 1-100)
 * ```
 */
export function parseSearchOptions(
  query: string,
  raw: RawSearchOptions,
): SearchOptions {
  // Parse and clamp limit
  const parsedLimit = parseInt(raw.limit || "", 10);
  const limit = Number.isNaN(parsedLimit)
    ? SEARCH_DEFAULTS.limit
    : Math.max(
        SEARCH_DEFAULTS.minLimit,
        Math.min(parsedLimit, SEARCH_DEFAULTS.maxLimit),
      );

  // Build validated options
  const options: SearchOptions = {
    query,
    limit,
  };

  // Validate and add type if provided
  if (raw.type && isPackageType(raw.type)) {
    options.type = raw.type;
  }

  // Validate and add sort if provided
  if (raw.sort && isSearchSort(raw.sort)) {
    options.sort = raw.sort;
  }

  return options;
}

// ============================================================================
// List Command Types
// ============================================================================

/**
 * Information about an installed package.
 */
export interface InstalledPackage {
  /** Full package name (e.g., @cpm/typescript-strict) */
  name: string;
  /** Folder name for uninstall command */
  folderName: string;
  /** Package type */
  type: "rules" | "skill" | "mcp";
  /** Version if available from metadata */
  version?: string;
  /** Absolute path to the package location */
  path: string;
  /** Platform this package is installed for */
  platform?: "claude-code" | "cursor";
}

/**
 * List command result.
 */
export interface ListResult {
  /** Array of installed packages */
  packages: InstalledPackage[];
  /** Packages grouped by type */
  byType: Record<string, InstalledPackage[]>;
}
