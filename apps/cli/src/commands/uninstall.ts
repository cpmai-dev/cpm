import chalk from 'chalk';
import ora from 'ora';
import { getInstalledPackages, removeInstalledPackage } from '../utils/config.js';
import { getAdapter } from '../adapters/index.js';
import type { Platform } from '../types.js';

interface UninstallOptions {
  platform?: string;
}

export async function uninstallCommand(
  packageName: string,
  options: UninstallOptions
): Promise<void> {
  const spinner = ora(`Uninstalling ${chalk.cyan(packageName)}...`).start();

  try {
    // Find installed package
    const installed = await getInstalledPackages();
    const pkg = installed.find(p => p.name === packageName || p.name === `@official/${packageName}`);

    if (!pkg) {
      spinner.fail(`Package ${chalk.red(packageName)} is not installed`);
      return;
    }

    // Determine platforms to uninstall from
    const targetPlatforms = options.platform
      ? [options.platform as Platform]
      : pkg.platforms;

    // Uninstall from each platform
    const results = await Promise.all(
      targetPlatforms.map(async (platform) => {
        const adapter = getAdapter(platform);
        return adapter.uninstall(pkg.name.replace('@official/', ''), process.cwd());
      })
    );

    // Remove from lockfile
    await removeInstalledPackage(pkg.name);

    const successful = results.filter(r => r.success);

    if (successful.length > 0) {
      spinner.succeed(`Uninstalled ${chalk.green(pkg.name)}`);

      // Show what was removed
      console.log(chalk.dim('\nFiles removed:'));
      for (const result of successful) {
        for (const file of result.filesWritten) {
          console.log(chalk.dim(`  - ${file}`));
        }
      }
    } else {
      spinner.warn(`No files found for ${packageName}`);
    }
  } catch (error) {
    spinner.fail(`Failed to uninstall ${packageName}`);
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
  }
}
