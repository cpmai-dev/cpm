/**
 * Search Command
 *
 * This module provides the search command for CPM. It follows clean
 * architecture principles:
 *
 * - **Single Responsibility**: Display logic delegated to UI layer
 * - **Open/Closed**: New package types don't require code changes
 * - **Type Safety**: All options validated through type guards
 *
 * Features:
 * - Full-text search across package names, descriptions, and keywords
 * - Filter by package type (rules, skill, mcp, etc.)
 * - Sort results by downloads, stars, recency, or name
 * - Limit the number of results
 *
 * @example
 * ```bash
 * cpm search typescript
 * cpm search react --type rules
 * cpm search nextjs --sort stars --limit 5
 * ```
 */

import { registry } from "../utils/registry.js";
import { logger } from "../utils/logger.js";

// Import UI layer
import {
  createSpinner,
  formatPackageEntry,
  formatSeparator,
  SEMANTIC_COLORS,
} from "./ui/index.js";

// Import command types
import { type RawSearchOptions, parseSearchOptions } from "./types.js";

// ============================================================================
// Display Functions
// ============================================================================

/**
 * Display search results.
 *
 * Renders each package using the UI layer's formatPackageEntry.
 *
 * @param packages - Array of packages to display
 * @param total - Total number of matching packages
 */
function displayResults(
  packages: import("../types.js").RegistryPackage[],
  total: number,
): void {
  // Show result count
  logger.log(SEMANTIC_COLORS.dim(`\nFound ${total} package(s)\n`));

  // Display each package
  for (const pkg of packages) {
    const lines = formatPackageEntry(pkg);
    lines.forEach((line) => logger.log(line));
    logger.newline();
  }

  // Footer with install instructions
  logger.log(formatSeparator());
  logger.log(
    SEMANTIC_COLORS.dim(
      `Install with: ${SEMANTIC_COLORS.highlight("cpm install <package-name>")}`,
    ),
  );
}

/**
 * Display message when no results are found.
 *
 * @param query - The search query that had no results
 */
function displayNoResults(query: string, platform?: string): void {
  logger.warn(
    `No packages found for "${query}"${platform ? ` on ${platform}` : ""}`,
  );
  logger.log(
    SEMANTIC_COLORS.dim("\nAvailable package types: rules, skill, mcp"),
  );
  logger.log(SEMANTIC_COLORS.dim("Try: cpm search react --type rules"));
  if (platform) {
    logger.log(
      SEMANTIC_COLORS.dim("Try removing --platform to search all platforms"),
    );
  }
}

// ============================================================================
// Main Command Handler
// ============================================================================

/**
 * Main search command entry point.
 *
 * This function orchestrates the search workflow:
 * 1. Parse and validate search options
 * 2. Query the registry
 * 3. Display results or helpful message
 *
 * @param query - The search query string
 * @param rawOptions - Raw CLI options (strings from parser)
 *
 * @example
 * ```typescript
 * await searchCommand("typescript", {});
 * await searchCommand("react", { type: "rules", limit: "5" });
 * ```
 */
export async function searchCommand(
  query: string,
  rawOptions: RawSearchOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // Step 1: Parse and validate options
  // -------------------------------------------------------------------------
  const options = parseSearchOptions(query, rawOptions);

  // -------------------------------------------------------------------------
  // Step 2: Create progress spinner
  // -------------------------------------------------------------------------
  const spinner = createSpinner(`Searching for "${query}"...`);

  try {
    // -----------------------------------------------------------------------
    // Step 3: Execute search
    // -----------------------------------------------------------------------
    const results = await registry.search({
      query: options.query,
      limit: options.limit,
      type: options.type,
      platform: options.platform,
      sort: options.sort,
    });

    // Stop spinner before showing results
    spinner.stop();

    // -----------------------------------------------------------------------
    // Step 4: Display results
    // -----------------------------------------------------------------------
    if (results.packages.length === 0) {
      displayNoResults(query, options.platform);
      return;
    }

    displayResults(results.packages, results.total);
  } catch (error) {
    // Handle search errors
    spinner.fail("Search failed");
    logger.error(error instanceof Error ? error.message : "Unknown error");
  }
}
