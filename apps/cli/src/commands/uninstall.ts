/**
 * Uninstall a package
 */
import chalk from 'chalk';
import ora from 'ora';
import { getAdapter } from '../adapters/index.js';
import { logger } from '../utils/logger.js';

export async function uninstallCommand(packageName: string): Promise<void> {
  const spinner = logger.isQuiet() ? null : ora(`Uninstalling ${chalk.cyan(packageName)}...`).start();

  try {
    // Normalize package name (remove @official/ prefix for folder lookup)
    const folderName = packageName
      .replace('@official/', '')
      .replace('@community/', '')
      .replace(/^@/, '')
      .replace(/\//g, '--');

    const adapter = getAdapter('claude-code');
    const result = await adapter.uninstall(folderName, process.cwd());

    if (result.success && result.filesWritten.length > 0) {
      if (spinner) spinner.succeed(`Uninstalled ${chalk.green(packageName)}`);
      else logger.success(`Uninstalled ${packageName}`);

      logger.log(chalk.dim('\nFiles removed:'));
      for (const file of result.filesWritten) {
        logger.log(chalk.dim(`  - ${file}`));
      }
    } else if (result.success) {
      if (spinner) spinner.warn(`Package ${packageName} was not found`);
      else logger.warn(`Package ${packageName} was not found`);
    } else {
      if (spinner) spinner.fail(`Failed to uninstall: ${result.error}`);
      else logger.error(`Failed to uninstall: ${result.error}`);
    }
  } catch (error) {
    if (spinner) spinner.fail(`Failed to uninstall ${packageName}`);
    else logger.error(`Failed to uninstall ${packageName}`);
    logger.error(error instanceof Error ? error.message : 'Unknown error');
  }
}
