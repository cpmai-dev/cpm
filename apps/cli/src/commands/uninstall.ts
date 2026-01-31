/**
 * Uninstall Command
 *
 * This module provides the uninstall command for CPM. It follows clean
 * architecture principles:
 *
 * - **Single Responsibility**: Display logic delegated to UI layer
 * - **Dependency Inversion**: Uses adapter abstraction
 *
 * The uninstall process:
 * 1. Extract the package folder name from the full package name
 * 2. Get the appropriate platform adapter
 * 3. Call the adapter's uninstall method
 * 4. Display results
 *
 * @example
 * ```bash
 * cpm uninstall typescript-strict
 * cpm uninstall @cpm/nextjs-rules
 * ```
 */

import { getAdapter } from "../adapters/index.js";
import { logger } from "../utils/logger.js";

// Import UI layer
import {
  createSpinner,
  spinnerText,
  successText,
  failText,
  formatRemovedFiles,
  SEMANTIC_COLORS,
} from "./ui/index.js";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract folder name from a package name.
 *
 * Handles different package name formats:
 * - "@author/package" → "package" (scoped packages)
 * - "@package" → "package" (removes @ prefix)
 * - "package" → "package" (no change)
 *
 * @param packageName - The full package name
 * @returns The folder name for uninstall lookup
 */
function extractFolderName(packageName: string): string {
  if (packageName.includes("/")) {
    // Scoped package: take part after /
    return packageName.split("/").pop() || packageName;
  }
  // Remove leading @ if present
  return packageName.replace(/^@/, "");
}

// ============================================================================
// Display Functions
// ============================================================================

/**
 * Display list of removed files.
 *
 * @param files - Array of removed file paths
 */
function displayRemovedFiles(files: string[]): void {
  logger.log(SEMANTIC_COLORS.dim("\nFiles removed:"));
  const formatted = formatRemovedFiles(files);
  formatted.forEach((line) => logger.log(line));
}

// ============================================================================
// Main Command Handler
// ============================================================================

/**
 * Main uninstall command entry point.
 *
 * This function orchestrates the uninstall workflow:
 * 1. Extract folder name from package name
 * 2. Call adapter's uninstall method
 * 3. Display appropriate result
 *
 * @param packageName - Name of the package to uninstall
 *
 * @example
 * ```typescript
 * await uninstallCommand("typescript-strict");
 * await uninstallCommand("@cpm/nextjs-rules");
 * ```
 */
export async function uninstallCommand(packageName: string): Promise<void> {
  // -------------------------------------------------------------------------
  // Step 1: Create progress spinner
  // -------------------------------------------------------------------------
  const spinner = createSpinner(spinnerText("Uninstalling", packageName));

  try {
    // -----------------------------------------------------------------------
    // Step 2: Extract folder name and get adapter
    // -----------------------------------------------------------------------
    const folderName = extractFolderName(packageName);
    const adapter = getAdapter("claude-code");

    // -----------------------------------------------------------------------
    // Step 3: Execute uninstall
    // -----------------------------------------------------------------------
    const result = await adapter.uninstall(folderName, process.cwd());

    // -----------------------------------------------------------------------
    // Step 4: Display results based on outcome
    // -----------------------------------------------------------------------
    if (result.success && result.filesWritten.length > 0) {
      // Success: Package was found and removed
      spinner.succeed(successText("Uninstalled", packageName));
      displayRemovedFiles(result.filesWritten);
    } else if (result.success) {
      // Success but no files: Package wasn't installed
      spinner.warn(`Package ${packageName} was not found`);
    } else {
      // Failure: Something went wrong
      spinner.fail(failText("Failed to uninstall", packageName, result.error));
    }
  } catch (error) {
    // Handle unexpected errors
    spinner.fail(failText("Failed to uninstall", packageName));
    logger.error(error instanceof Error ? error.message : "Unknown error");
  }
}
