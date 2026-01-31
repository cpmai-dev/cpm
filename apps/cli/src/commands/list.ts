/**
 * List Command
 *
 * This module provides the list command for CPM. It follows clean
 * architecture principles:
 *
 * - **Single Responsibility**: Scanning and display are separated
 * - **Open/Closed**: New package types use centralized color config
 * - **Type Safety**: Uses InstalledPackage type from command types
 *
 * The list command scans:
 * - ~/.claude/rules/ - Rules packages
 * - ~/.claude/skills/ - Skill packages
 * - ~/.claude.json - MCP server configurations
 *
 * @example
 * ```bash
 * cpm list
 * cpm ls  # alias
 * ```
 */

import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { logger } from "../utils/logger.js";
import type { PackageMetadata } from "../types.js";

// Import UI layer
import { getTypeColor, SEMANTIC_COLORS } from "./ui/index.js";

// Import command types
import type { InstalledPackage } from "./types.js";

// ============================================================================
// Scanning Functions
// ============================================================================

/**
 * Read package metadata from the .cpm.json file.
 *
 * @param packageDir - Path to the package directory
 * @returns The metadata if found, null otherwise
 */
async function readPackageMetadata(
  packageDir: string,
): Promise<PackageMetadata | null> {
  const metadataPath = path.join(packageDir, ".cpm.json");

  try {
    if (await fs.pathExists(metadataPath)) {
      return await fs.readJson(metadataPath);
    }
  } catch {
    // Ignore read errors
  }

  return null;
}

/**
 * Scan a directory for package subdirectories.
 *
 * @param dir - Directory to scan
 * @param type - Package type for found packages
 * @returns Array of installed packages
 */
async function scanDirectory(
  dir: string,
  type: InstalledPackage["type"],
): Promise<InstalledPackage[]> {
  const items: InstalledPackage[] = [];

  if (!(await fs.pathExists(dir))) {
    return items;
  }

  const entries = await fs.readdir(dir);

  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    const stat = await fs.stat(entryPath);

    if (stat.isDirectory()) {
      const metadata = await readPackageMetadata(entryPath);
      items.push({
        name: metadata?.name || entry,
        folderName: entry,
        type,
        version: metadata?.version,
        path: entryPath,
      });
    }
  }

  return items;
}

/**
 * Scan MCP servers from ~/.claude.json.
 *
 * @returns Array of MCP server entries
 */
async function scanMcpServers(): Promise<InstalledPackage[]> {
  const items: InstalledPackage[] = [];
  const configPath = path.join(os.homedir(), ".claude.json");

  if (!(await fs.pathExists(configPath))) {
    return items;
  }

  try {
    const config = await fs.readJson(configPath);
    const mcpServers = config.mcpServers || {};

    for (const name of Object.keys(mcpServers)) {
      items.push({
        name,
        folderName: name,
        type: "mcp",
        path: configPath,
      });
    }
  } catch {
    // Ignore parse errors
  }

  return items;
}

/**
 * Scan all installation locations for packages.
 *
 * @returns Array of all installed packages
 */
async function scanInstalledPackages(): Promise<InstalledPackage[]> {
  const claudeHome = path.join(os.homedir(), ".claude");

  // Scan all locations in parallel
  const [rules, skills, mcp] = await Promise.all([
    scanDirectory(path.join(claudeHome, "rules"), "rules"),
    scanDirectory(path.join(claudeHome, "skills"), "skill"),
    scanMcpServers(),
  ]);

  return [...rules, ...skills, ...mcp];
}

/**
 * Group packages by type using immutable pattern.
 *
 * @param packages - Array of packages to group
 * @returns Record of type -> packages
 */
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

/**
 * Display a single installed package.
 *
 * @param pkg - The package to display
 */
function displayPackage(pkg: InstalledPackage): void {
  const version = pkg.version ? SEMANTIC_COLORS.dim(` v${pkg.version}`) : "";
  logger.log(
    `    ${SEMANTIC_COLORS.success("◉")} ${chalk.bold(pkg.name)}${version}`,
  );
}

/**
 * Display packages grouped by type.
 *
 * @param byType - Packages grouped by type
 */
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

/**
 * Display message when no packages are installed.
 */
function displayEmpty(): void {
  logger.warn("No packages installed");
  logger.log(
    SEMANTIC_COLORS.dim(
      `\nRun ${SEMANTIC_COLORS.highlight("cpm install <package>")} to install a package`,
    ),
  );
}

/**
 * Display footer with uninstall instructions.
 */
function displayFooter(): void {
  logger.log(
    SEMANTIC_COLORS.dim("Run cpm uninstall <package-name> to remove a package"),
  );
  logger.log(SEMANTIC_COLORS.dim("  e.g., cpm uninstall backend-patterns"));
}

// ============================================================================
// Main Command Handler
// ============================================================================

/**
 * Main list command entry point.
 *
 * This function orchestrates the list workflow:
 * 1. Scan all installation locations
 * 2. Group packages by type
 * 3. Display results
 *
 * @example
 * ```typescript
 * await listCommand();
 * ```
 */
export async function listCommand(): Promise<void> {
  try {
    // -----------------------------------------------------------------------
    // Step 1: Scan for installed packages
    // -----------------------------------------------------------------------
    const packages = await scanInstalledPackages();

    // -----------------------------------------------------------------------
    // Step 2: Handle empty case
    // -----------------------------------------------------------------------
    if (packages.length === 0) {
      displayEmpty();
      return;
    }

    // -----------------------------------------------------------------------
    // Step 3: Display packages grouped by type
    // -----------------------------------------------------------------------
    logger.log(chalk.bold(`\nInstalled packages (${packages.length}):\n`));

    const byType = groupByType(packages);
    displayByType(byType);
    displayFooter();
  } catch (error) {
    logger.error("Failed to list packages");
    logger.error(error instanceof Error ? error.message : "Unknown error");
  }
}
