/**
 * List Command
 *
 * The list command scans:
 * - ~/.claude/rules/ - Claude Code rules packages
 * - ~/.claude/skills/ - Claude Code skill packages
 * - ~/.claude.json - Claude Code MCP server configurations
 * - .cursor/rules/ - Cursor rules packages (project-level)
 * - ~/.cursor/mcp.json - Cursor MCP server configurations
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
import { getCursorMcpConfigPath } from "../utils/platform.js";

// Import UI layer
import { getTypeColor, SEMANTIC_COLORS } from "./ui/index.js";

// Import command types
import type { InstalledPackage } from "./types.js";

// ============================================================================
// Scanning Functions
// ============================================================================

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

async function scanDirectory(
  dir: string,
  type: InstalledPackage["type"],
  platform?: InstalledPackage["platform"],
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
        platform,
      });
    }
  }

  return items;
}

async function scanMcpServersFromConfig(
  configPath: string,
  platform: InstalledPackage["platform"],
): Promise<InstalledPackage[]> {
  const items: InstalledPackage[] = [];

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
        platform,
      });
    }
  } catch {
    // Ignore parse errors
  }

  return items;
}

async function scanInstalledPackages(): Promise<InstalledPackage[]> {
  const claudeHome = path.join(os.homedir(), ".claude");
  const cursorRulesDir = path.join(process.cwd(), ".cursor", "rules");
  const cursorMcpConfig = getCursorMcpConfigPath();
  const claudeMcpConfig = path.join(os.homedir(), ".claude.json");

  const [claudeRules, claudeSkills, claudeMcp, cursorRules, cursorMcp] =
    await Promise.all([
      scanDirectory(path.join(claudeHome, "rules"), "rules", "claude-code"),
      scanDirectory(path.join(claudeHome, "skills"), "skill", "claude-code"),
      scanMcpServersFromConfig(claudeMcpConfig, "claude-code"),
      scanDirectory(cursorRulesDir, "rules", "cursor"),
      scanMcpServersFromConfig(cursorMcpConfig, "cursor"),
    ]);

  return [
    ...claudeRules,
    ...claudeSkills,
    ...claudeMcp,
    ...cursorRules,
    ...cursorMcp,
  ];
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
