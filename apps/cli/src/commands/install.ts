import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import type { PackageManifest, Platform, InstalledPackage } from '../types.js';
import { getAdapter } from '../adapters/index.js';
import { getDetectedPlatforms } from '../utils/platform.js';
import { addInstalledPackage, ensureCpmDir } from '../utils/config.js';
import { registry } from '../utils/registry.js';
import { downloadPackage } from '../utils/downloader.js';

interface InstallOptions {
  platform?: string;
  global?: boolean;
  version?: string;
}

// Valid platforms for installation
const VALID_PLATFORMS: readonly Platform[] = ['claude-code'] as const;

/**
 * Validate package name format
 * Follows npm package naming conventions
 */
function validatePackageName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Package name cannot be empty' };
  }

  if (name.length > 214) {
    return { valid: false, error: 'Package name too long (max 214 characters)' };
  }

  // Package name pattern: optional @scope/ followed by package name
  const packageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  if (!packageNameRegex.test(name.toLowerCase())) {
    return { valid: false, error: 'Invalid package name format' };
  }

  // Check for path traversal attempts
  if (name.includes('..') || name.includes('\\')) {
    return { valid: false, error: 'Invalid characters in package name' };
  }

  return { valid: true };
}

/**
 * Validate platform option
 */
function isValidPlatform(platform: string): platform is Platform {
  return VALID_PLATFORMS.includes(platform as Platform);
}

export async function installCommand(
  packageName: string,
  options: InstallOptions
): Promise<void> {
  // Validate package name first
  const validation = validatePackageName(packageName);
  if (!validation.valid) {
    console.error(chalk.red(`Invalid package name: ${validation.error}`));
    return;
  }

  const spinner = ora(`Installing ${chalk.cyan(packageName)}...`).start();

  try {
    // Normalize package name (add @official/ if no scope)
    const normalizedName = normalizePackageName(packageName);

    // Search for the package in registry
    spinner.text = `Searching for ${chalk.cyan(normalizedName)}...`;
    const pkg = await registry.getPackage(normalizedName);

    if (!pkg) {
      spinner.fail(`Package ${chalk.red(normalizedName)} not found`);
      console.log(chalk.dim('\nTry searching for packages:'));
      console.log(chalk.dim(`  cpm search ${packageName.replace('@official/', '')}`));
      return;
    }

    // Download the package
    spinner.text = `Downloading ${chalk.cyan(pkg.name)}@${pkg.version}...`;
    const downloadResult = await downloadPackage(pkg);

    if (!downloadResult.success) {
      spinner.fail(`Failed to download ${pkg.name}: ${downloadResult.error}`);
      return;
    }

    const manifest = downloadResult.manifest;

    // Determine target platforms (Claude Code only for MVP)
    let targetPlatforms: Platform[];

    if (options.platform && options.platform !== 'all') {
      // Validate platform option
      if (!isValidPlatform(options.platform)) {
        spinner.fail(`Invalid platform: ${options.platform}`);
        console.log(chalk.dim(`Valid platforms: ${VALID_PLATFORMS.join(', ')}`));
        return;
      }
      targetPlatforms = [options.platform];
    } else {
      // Auto-detect installed platforms
      targetPlatforms = await getDetectedPlatforms();

      // Default to claude-code if nothing detected
      if (targetPlatforms.length === 0) {
        targetPlatforms = ['claude-code'];
      }

      // Filter to only claude-code for MVP
      targetPlatforms = targetPlatforms.filter(p => p === 'claude-code');
      if (targetPlatforms.length === 0) {
        targetPlatforms = ['claude-code'];
      }
    }

    spinner.text = `Installing to ${targetPlatforms.join(', ')}...`;

    // Ensure cpm directory exists
    await ensureCpmDir();

    // Install to each platform
    const results = await Promise.all(
      targetPlatforms.map(async (platform) => {
        const adapter = getAdapter(platform);
        return adapter.install(manifest, process.cwd(), downloadResult.packagePath);
      })
    );

    // Check results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0) {
      // Save to lockfile
      const installedPkg: InstalledPackage = {
        name: manifest.name,
        version: manifest.version,
        type: manifest.type,
        platforms: successful.map(r => r.platform),
        installedAt: new Date().toISOString(),
        path: downloadResult.packagePath,
      };

      await addInstalledPackage(installedPkg);

      spinner.succeed(
        `Installed ${chalk.green(manifest.name)}@${chalk.dim(manifest.version)}`
      );

      // Show package info
      console.log(chalk.dim(`\n  ${manifest.description}`));

      // Show what was created
      console.log(chalk.dim('\n  Files created:'));
      for (const result of successful) {
        for (const file of result.filesWritten) {
          console.log(chalk.dim(`    + ${path.relative(process.cwd(), file)}`));
        }
      }

      // Show usage hints based on package type
      console.log('');
      if (manifest.type === 'skill' && manifest.skill?.command) {
        console.log(
          `  ${chalk.cyan('Usage:')} Type ${chalk.yellow(manifest.skill.command)} in Claude Code`
        );
      } else if (manifest.type === 'rules') {
        console.log(
          `  ${chalk.cyan('Usage:')} Rules are automatically applied to matching files`
        );
      } else if (manifest.type === 'mcp') {
        console.log(
          `  ${chalk.cyan('Usage:')} MCP server configured. Restart Claude Code to activate.`
        );
        if (manifest.mcp?.env) {
          const envVars = Object.keys(manifest.mcp.env);
          if (envVars.length > 0) {
            console.log(chalk.yellow(`\n  Required environment variables:`));
            for (const envVar of envVars) {
              console.log(chalk.dim(`    - ${envVar}`));
            }
          }
        }
      }
    }

    if (failed.length > 0) {
      console.log(chalk.yellow('\n  Warnings:'));
      for (const result of failed) {
        console.log(chalk.yellow(`    - ${result.platform}: ${result.error}`));
      }
    }
  } catch (error) {
    spinner.fail(`Failed to install ${packageName}`);
    if (error instanceof Error) {
      console.error(chalk.red(`\n  ${error.message}`));
    }
  }
}

/**
 * Normalize package name - add @official/ scope if not present
 */
function normalizePackageName(name: string): string {
  // Already has a scope
  if (name.startsWith('@')) {
    return name;
  }

  // Try with @official/ scope
  return `@official/${name}`;
}

/**
 * Install multiple packages
 */
export async function installMultiple(
  packages: string[],
  options: InstallOptions
): Promise<void> {
  console.log(chalk.cyan(`\nInstalling ${packages.length} packages...\n`));

  for (const pkg of packages) {
    await installCommand(pkg, options);
    console.log(''); // Add spacing between packages
  }

  console.log(chalk.green('✓ All packages installed'));
}
