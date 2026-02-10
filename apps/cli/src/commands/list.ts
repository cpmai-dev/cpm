/**
 * List Command
 *
 * Lists all installed packages across all registered platforms.
 * Delegates scanning to platform adapters — no platform-specific
 * paths or logic in this module.
 *
 * @example
 * ```bash
 * cpm list
 * cpm ls  # alias
 * ```
 */

import chalk from "chalk";
import { logger } from "../utils/logger.js";
import { getAllAdapters } from "../adapters/index.js";
import type { InstalledPackage } from "../types.js";

// Import UI layer
import { getTypeColor, SEMANTIC_COLORS } from "./ui/index.js";

// ============================================================================
// Scanning Functions
// ============================================================================

async function scanInstalledPackages(): Promise<InstalledPackage[]> {
  const adapters = getAllAdapters();
  const results = await Promise.all(
    adapters.map((adapter) => adapter.listInstalled(process.cwd())),
  );
  return results.flat();
}

function groupByType(
  packages: InstalledPackage[],
): Record<string, InstalledPackage[]> {
  return packages.reduce<Record<string, InstalledPackage[]>>(
    (acc, pkg) => ({
      ...acc,
      [pkg.type]: [...(acc[pkg.type] || []), pkg],
    }),
    {},
  );
}

// ============================================================================
// Display Functions
// ============================================================================

function displayPackage(pkg: InstalledPackage): void {
  const version = pkg.version ? SEMANTIC_COLORS.dim(` v${pkg.version}`) : "";
  const platform = pkg.platform
    ? SEMANTIC_COLORS.dim(` [${pkg.platform}]`)
    : "";
  logger.log(
    `    ${SEMANTIC_COLORS.success("◉")} ${chalk.bold(pkg.name)}${version}${platform}`,
  );
}

function displayByType(byType: Record<string, InstalledPackage[]>): void {
  for (const [type, items] of Object.entries(byType)) {
    const typeColor = getTypeColor(type);
    logger.log(typeColor(`  ${type.toUpperCase()}`));

    for (const item of items) {
      displayPackage(item);
    }

    logger.newline();
  }
}

function displayEmpty(): void {
  logger.warn("No packages installed");
  logger.log(
    SEMANTIC_COLORS.dim(
      `\nRun ${SEMANTIC_COLORS.highlight("cpm install <package>")} to install a package`,
    ),
  );
}

function displayFooter(): void {
  logger.log(
    SEMANTIC_COLORS.dim("Run cpm uninstall <package-name> to remove a package"),
  );
  logger.log(SEMANTIC_COLORS.dim("  e.g., cpm uninstall backend-patterns"));
}

// ============================================================================
// Main Command Handler
// ============================================================================

export async function listCommand(): Promise<void> {
  try {
    const packages = await scanInstalledPackages();

    if (packages.length === 0) {
      displayEmpty();
      return;
    }

    logger.log(chalk.bold(`\nInstalled packages (${packages.length}):\n`));

    const byType = groupByType(packages);
    displayByType(byType);
    displayFooter();
  } catch (error) {
    logger.error("Failed to list packages");
    logger.error(error instanceof Error ? error.message : "Unknown error");
  }
}
