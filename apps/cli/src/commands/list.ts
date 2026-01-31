/**
 * List installed packages by scanning ~/.claude/
 */
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';

import type { PackageMetadata } from '../types.js';

interface InstalledItem {
  name: string;           // Full package name (e.g., @author/package)
  folderName: string;     // Folder name for uninstall
  type: 'rules' | 'skill' | 'mcp';
  version?: string;
  path: string;
}

const typeColors: Record<string, (str: string) => string> = {
  rules: chalk.yellow,
  skill: chalk.blue,
  mcp: chalk.magenta,
};

/**
 * Read package metadata from .cpm.json file
 */
async function readPackageMetadata(packageDir: string): Promise<PackageMetadata | null> {
  const metadataPath = path.join(packageDir, '.cpm.json');
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
 * Scan ~/.claude/ directories to find installed packages
 */
async function scanInstalledPackages(): Promise<InstalledItem[]> {
  const items: InstalledItem[] = [];
  const claudeHome = path.join(os.homedir(), '.claude');

  // Scan rules directory (each package is a subdirectory)
  const rulesDir = path.join(claudeHome, 'rules');
  if (await fs.pathExists(rulesDir)) {
    const entries = await fs.readdir(rulesDir);
    for (const entry of entries) {
      const entryPath = path.join(rulesDir, entry);
      const stat = await fs.stat(entryPath);
      if (stat.isDirectory()) {
        const metadata = await readPackageMetadata(entryPath);
        items.push({
          name: metadata?.name || entry,
          folderName: entry,
          type: 'rules',
          version: metadata?.version,
          path: entryPath,
        });
      }
    }
  }

  // Scan skills directory
  const skillsDir = path.join(claudeHome, 'skills');
  if (await fs.pathExists(skillsDir)) {
    const dirs = await fs.readdir(skillsDir);
    for (const dir of dirs) {
      const skillPath = path.join(skillsDir, dir);
      const stat = await fs.stat(skillPath);
      if (stat.isDirectory()) {
        const metadata = await readPackageMetadata(skillPath);
        items.push({
          name: metadata?.name || dir,
          folderName: dir,
          type: 'skill',
          version: metadata?.version,
          path: skillPath,
        });
      }
    }
  }

  // Scan MCP servers from .claude.json
  const mcpConfigPath = path.join(os.homedir(), '.claude.json');
  if (await fs.pathExists(mcpConfigPath)) {
    try {
      const config = await fs.readJson(mcpConfigPath);
      const mcpServers = config.mcpServers || {};
      for (const name of Object.keys(mcpServers)) {
        items.push({
          name,
          folderName: name,
          type: 'mcp',
          path: mcpConfigPath,
        });
      }
    } catch {
      // Ignore parse errors
    }
  }

  return items;
}

export async function listCommand(): Promise<void> {
  try {
    const packages = await scanInstalledPackages();

    if (packages.length === 0) {
      logger.warn('No packages installed');
      logger.log(chalk.dim(`\nRun ${chalk.cyan('cpm install <package>')} to install a package`));
      return;
    }

    logger.log(chalk.bold(`\nInstalled packages (${packages.length}):\n`));

    // Group by type (immutable pattern)
    const byType = packages.reduce<Record<string, InstalledItem[]>>((acc, pkg) => ({
      ...acc,
      [pkg.type]: [...(acc[pkg.type] || []), pkg],
    }), {});

    // Display by type
    for (const [type, items] of Object.entries(byType)) {
      const typeColor = typeColors[type] || chalk.white;
      logger.log(typeColor(`  ${type.toUpperCase()}`));

      for (const item of items) {
        const version = item.version ? chalk.dim(` v${item.version}`) : '';
        logger.log(`    ${chalk.green('◉')} ${chalk.bold(item.name)}${version}`);
      }
      logger.newline();
    }

    logger.log(chalk.dim('Run cpm uninstall <package-name> to remove a package'));
    logger.log(chalk.dim('  e.g., cpm uninstall backend-patterns'));
  } catch (error) {
    logger.error('Failed to list packages');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
  }
}
