/**
 * Install Command
 *
 * This module provides the install command for CPM. It follows clean
 * architecture principles with:
 *
 * - **Single Responsibility**: Each function does one thing
 * - **Dependency Inversion**: Uses abstractions (adapters, registry)
 * - **Open/Closed**: New display formats don't require code changes
 *
 * The command is a thin orchestration layer that:
 * 1. Parses and validates input (using type guards)
 * 2. Delegates to services (registry, downloader, adapters)
 * 3. Formats output (using UI layer)
 *
 * @example
 * ```bash
 * cpm install typescript-strict
 * cpm install @cpm/nextjs-rules --platform claude-code
 * ```
 */

import type { PackageManifest, Platform } from "../types.js";
import type { InstallResult as AdapterInstallResult } from "../adapters/base.js";
import { getAdapter } from "../adapters/index.js";
import { ensureClaudeDirs, ensureCursorDirs } from "../utils/config.js";
import { registry } from "../utils/registry.js";
import { downloadPackage, cleanupTempDir } from "../utils/downloader.js";
import { logger } from "../utils/logger.js";
import {
  validatePackageName,
  normalizePackageName,
} from "../validation/index.js";
import { VALID_PLATFORMS } from "../constants.js";

// Import UI layer
import {
  createSpinner,
  spinnerText,
  successText,
  failText,
  formatCreatedFiles,
  formatUsageHints,
  SEMANTIC_COLORS,
} from "./ui/index.js";

// Import command types
import { type RawInstallOptions, parseInstallOptions } from "./types.js";

// ============================================================================
// Core Installation Logic
// ============================================================================

/**
 * Install a package to all specified platforms.
 *
 * Runs installation in parallel across all platforms using
 * the appropriate adapter for each.
 *
 * @param manifest - The package manifest
 * @param tempDir - Temporary directory with package files
 * @param platforms - Target platforms for installation
 * @returns Array of results from each platform
 */
async function installToPlatforms(
  manifest: PackageManifest,
  tempDir: string | undefined,
  platforms: readonly Platform[],
): Promise<AdapterInstallResult[]> {
  // Run all platform installations in parallel
  return Promise.all(
    platforms.map(async (platform) => {
      const adapter = getAdapter(platform);
      return adapter.install(manifest, process.cwd(), tempDir);
    }),
  );
}

/**
 * Partition results into successful and failed arrays.
 *
 * Uses immutable pattern to separate results by success status.
 *
 * @param results - Array of installation results
 * @returns Tuple of [successful, failed] results
 */
function partitionResults(
  results: AdapterInstallResult[],
): [AdapterInstallResult[], AdapterInstallResult[]] {
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  return [successful, failed];
}

// ============================================================================
// Display Functions
// ============================================================================

/**
 * Display success message with installation details.
 *
 * Shows:
 * - Package description
 * - List of created files
 * - Usage hints based on package type
 *
 * @param manifest - The installed package manifest
 * @param results - Successful installation results
 */
function displaySuccess(
  manifest: PackageManifest,
  results: AdapterInstallResult[],
): void {
  // Show package description
  logger.log(SEMANTIC_COLORS.dim(`\n  ${manifest.description}`));

  // Show created files
  logger.log(SEMANTIC_COLORS.dim("\n  Files created:"));
  const allFiles = results.flatMap((r) => r.filesWritten);
  const formattedFiles = formatCreatedFiles(allFiles);
  formattedFiles.forEach((line) => logger.log(line));

  // Show usage hints
  logger.newline();
  const hints = formatUsageHints(manifest);
  hints.forEach((line) => logger.log(line));
}

/**
 * Display warnings for failed platform installations.
 *
 * @param results - Failed installation results
 */
function displayWarnings(results: AdapterInstallResult[]): void {
  if (results.length === 0) return;

  logger.log(SEMANTIC_COLORS.warning("\n  Warnings:"));
  for (const result of results) {
    logger.log(
      SEMANTIC_COLORS.warning(`    - ${result.platform}: ${result.error}`),
    );
  }
}

/**
 * Display helpful message when package is not found.
 *
 * @param packageName - The package that wasn't found
 */
function displayNotFound(packageName: string): void {
  logger.log(SEMANTIC_COLORS.dim("\nTry searching for packages:"));
  logger.log(
    SEMANTIC_COLORS.dim(`  cpm search ${packageName.replace(/^@[^/]+\//, "")}`),
  );
}

/**
 * Display message for invalid platform.
 */
function displayInvalidPlatform(): void {
  logger.log(
    SEMANTIC_COLORS.dim(`Valid platforms: ${VALID_PLATFORMS.join(", ")}`),
  );
}

// ============================================================================
// Main Command Handler
// ============================================================================

/**
 * Main install command entry point.
 *
 * This function orchestrates the installation workflow:
 * 1. Validate input (package name, options)
 * 2. Look up package in registry
 * 3. Download package manifest and files
 * 4. Install to target platforms
 * 5. Display results
 * 6. Clean up temporary files
 *
 * @param packageName - Name of the package to install
 * @param rawOptions - Raw CLI options (strings from parser)
 *
 * @example
 * ```typescript
 * await installCommand("typescript-strict", {});
 * await installCommand("@cpm/rules", { platform: "claude-code" });
 * ```
 */
export async function installCommand(
  packageName: string,
  rawOptions: RawInstallOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // Step 1: Validate package name
  // -------------------------------------------------------------------------
  const validation = validatePackageName(packageName);
  if (!validation.valid) {
    logger.error(`Invalid package name: ${validation.error}`);
    return;
  }

  // -------------------------------------------------------------------------
  // Step 2: Parse and validate options
  // -------------------------------------------------------------------------
  const options = parseInstallOptions(rawOptions);
  if (!options) {
    logger.error(`Invalid platform: ${rawOptions.platform}`);
    displayInvalidPlatform();
    return;
  }

  // -------------------------------------------------------------------------
  // Step 3: Create progress spinner
  // -------------------------------------------------------------------------
  const spinner = createSpinner(spinnerText("Installing", packageName));
  let tempDir: string | undefined;

  try {
    // -----------------------------------------------------------------------
    // Step 4: Normalize package name and look up in registry
    // -----------------------------------------------------------------------
    const normalizedName = normalizePackageName(packageName);
    spinner.update(spinnerText("Searching for", normalizedName));

    const pkg = await registry.getPackage(normalizedName);
    if (!pkg) {
      spinner.fail(failText("Package not found", normalizedName));
      displayNotFound(packageName);
      return;
    }

    // -----------------------------------------------------------------------
    // Step 5: Download package
    // -----------------------------------------------------------------------
    spinner.update(spinnerText("Downloading", `${pkg.name}@${pkg.version}`));
    const downloadResult = await downloadPackage(pkg);

    if (!downloadResult.success) {
      spinner.fail(
        failText("Failed to download", pkg.name, downloadResult.error),
      );
      return;
    }

    // TypeScript narrows type after success check
    const manifest = downloadResult.manifest;
    tempDir = downloadResult.tempDir;

    // -----------------------------------------------------------------------
    // Step 6: Install to platforms
    // -----------------------------------------------------------------------
    const targetPlatforms = [options.platform] as const;
    spinner.update(`Installing to ${targetPlatforms.join(", ")}...`);

    if (options.platform === "cursor") {
      await ensureCursorDirs(process.cwd());
    } else {
      await ensureClaudeDirs();
    }
    const results = await installToPlatforms(
      manifest,
      tempDir,
      targetPlatforms,
    );

    // -----------------------------------------------------------------------
    // Step 7: Display results
    // -----------------------------------------------------------------------
    const [successful, failed] = partitionResults(results);

    if (successful.length > 0) {
      spinner.succeed(
        successText("Installed", manifest.name, manifest.version),
      );
      displaySuccess(manifest, successful);
    } else {
      spinner.fail(failText("Failed to install", manifest.name));
    }

    displayWarnings(failed);
  } catch (error) {
    // Handle unexpected errors
    spinner.fail(failText("Failed to install", packageName));
    if (error instanceof Error) {
      logger.error(error.message);
    }
  } finally {
    // Always clean up temporary files
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
