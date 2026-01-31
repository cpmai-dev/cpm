/**
 * List installed packages by scanning ~/.claude/
 */
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';

interface InstalledItem {
  name: string;
  type: 'rules' | 'skill' | 'mcp';
  path: string;
}

const typeColors: Record<string, (str: string) => string> = {
  rules: chalk.yellow,
  skill: chalk.blue,
  mcp: chalk.magenta,
};

/**
 * Scan ~/.claude/ directories to find installed packages
 */
async function scanInstalledPackages(): Promise<InstalledItem[]> {
  const items: InstalledItem[] = [];
  const claudeHome = path.join(os.homedir(), '.claude');

  // Scan rules directory
  const rulesDir = path.join(claudeHome, 'rules');
  if (await fs.pathExists(rulesDir)) {
    const files = await fs.readdir(rulesDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        items.push({
          name: file.replace('.md', ''),
          type: 'rules',
          path: path.join(rulesDir, file),
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
        items.push({
          name: dir,
          type: 'skill',
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

    // Group by type
    const byType: Record<string, InstalledItem[]> = {};
    for (const pkg of packages) {
      if (!byType[pkg.type]) {
        byType[pkg.type] = [];
      }
      byType[pkg.type].push(pkg);
    }

    // Display by type
    for (const [type, items] of Object.entries(byType)) {
      const typeColor = typeColors[type] || chalk.white;
      logger.log(typeColor(`  ${type.toUpperCase()}`));

      for (const item of items) {
        logger.log(`    ${chalk.green('◉')} ${chalk.bold(item.name)}`);
      }
      logger.newline();
    }

    logger.log(chalk.dim('Run cpm uninstall <package> to remove a package'));
  } catch (error) {
    logger.error('Failed to list packages');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
  }
}
