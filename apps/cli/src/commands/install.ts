/**
 * Install command for CPM
 * Downloads and installs packages directly to ~/.claude/
 */
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import type { PackageManifest, Platform } from '../types.js';
import type { InstallResult } from '../adapters/base.js';
import { getAdapter } from '../adapters/index.js';
import { getDetectedPlatforms } from '../utils/platform.js';
import { ensureClaudeDirs } from '../utils/config.js';
import { registry } from '../utils/registry.js';
import { downloadPackage, cleanupTempDir } from '../utils/downloader.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface InstallOptions {
  platform?: string;
  version?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Valid platforms for installation */
const VALID_PLATFORMS: readonly Platform[] = ['claude-code'] as const;

/** Maximum allowed package name length (npm standard) */
const MAX_PACKAGE_NAME_LENGTH = 214;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate package name format
 */
function validatePackageName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Package name cannot be empty' };
  }

  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // Use original
  }

  if (decoded.length > MAX_PACKAGE_NAME_LENGTH) {
    return { valid: false, error: `Package name too long (max ${MAX_PACKAGE_NAME_LENGTH} characters)` };
  }

  if (decoded.includes('\0')) {
    return { valid: false, error: 'Invalid characters in package name' };
  }

  const hasPathTraversal = decoded.includes('..') ||
    decoded.includes('\\') ||
    decoded.includes('%2e') ||
    decoded.includes('%2E') ||
    decoded.includes('%5c') ||
    decoded.includes('%5C') ||
    decoded.includes('%2f') ||
    decoded.includes('%2F');

  if (hasPathTraversal) {
    return { valid: false, error: 'Invalid characters in package name' };
  }

  const packageNameRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  if (!packageNameRegex.test(name.toLowerCase())) {
    return { valid: false, error: 'Invalid package name format' };
  }

  return { valid: true };
}

/**
 * Validate platform option
 */
function isValidPlatform(platform: string): platform is Platform {
  return VALID_PLATFORMS.includes(platform as Platform);
}

/**
 * Normalize package name - add @official/ scope if not present
 */
function normalizePackageName(name: string): string {
  if (name.startsWith('@')) {
    return name;
  }
  return `@official/${name}`;
}

// ============================================================================
// Installation Steps
// ============================================================================

/**
 * Resolve target platforms for installation
 */
async function resolveTargetPlatforms(options: InstallOptions): Promise<Platform[] | null> {
  if (options.platform && options.platform !== 'all') {
    if (!isValidPlatform(options.platform)) {
      return null;
    }
    return [options.platform];
  }

  let platforms = await getDetectedPlatforms();

  if (platforms.length === 0) {
    platforms = ['claude-code'];
  }

  platforms = platforms.filter(p => p === 'claude-code');
  if (platforms.length === 0) {
    platforms = ['claude-code'];
  }

  return platforms;
}

/**
 * Install package to all target platforms
 */
async function installToPlatforms(
  manifest: PackageManifest,
  tempDir: string | undefined,
  platforms: Platform[]
): Promise<InstallResult[]> {
  return Promise.all(
    platforms.map(async (platform) => {
      const adapter = getAdapter(platform);
      return adapter.install(manifest, process.cwd(), tempDir);
    })
  );
}

/**
 * Display success message with installation details
 */
function displaySuccessMessage(
  manifest: PackageManifest,
  successfulResults: InstallResult[]
): void {
  logger.log(chalk.dim(`\n  ${manifest.description}`));

  logger.log(chalk.dim('\n  Files created:'));
  for (const result of successfulResults) {
    for (const file of result.filesWritten) {
      logger.log(chalk.dim(`    + ${path.relative(process.cwd(), file)}`));
    }
  }

  logger.newline();
  displayUsageHints(manifest);
}

/**
 * Display usage hints based on package type
 */
function displayUsageHints(manifest: PackageManifest): void {
  switch (manifest.type) {
    case 'skill':
      if (manifest.skill?.command) {
        logger.log(
          `  ${chalk.cyan('Usage:')} Type ${chalk.yellow(manifest.skill.command)} in Claude Code`
        );
      }
      break;

    case 'rules':
      logger.log(
        `  ${chalk.cyan('Usage:')} Rules are automatically applied to matching files`
      );
      break;

    case 'mcp':
      logger.log(
        `  ${chalk.cyan('Usage:')} MCP server configured. Restart Claude Code to activate.`
      );
      if (manifest.mcp?.env) {
        const envVars = Object.keys(manifest.mcp.env);
        if (envVars.length > 0) {
          logger.log(chalk.yellow(`\n  Required environment variables:`));
          for (const envVar of envVars) {
            logger.log(chalk.dim(`    - ${envVar}`));
          }
        }
      }
      break;
  }
}

/**
 * Display warnings for failed installations
 */
function displayWarnings(failedResults: InstallResult[]): void {
  if (failedResults.length === 0) return;

  logger.log(chalk.yellow('\n  Warnings:'));
  for (const result of failedResults) {
    logger.log(chalk.yellow(`    - ${result.platform}: ${result.error}`));
  }
}

// ============================================================================
// Main Command
// ============================================================================

/**
 * Install a package from the registry
 */
export async function installCommand(
  packageName: string,
  options: InstallOptions
): Promise<void> {
  const validation = validatePackageName(packageName);
  if (!validation.valid) {
    logger.error(`Invalid package name: ${validation.error}`);
    return;
  }

  const spinner = logger.isQuiet() ? null : ora(`Installing ${chalk.cyan(packageName)}...`).start();
  let tempDir: string | undefined;

  try {
    // Find package in registry
    const normalizedName = normalizePackageName(packageName);
    if (spinner) spinner.text = `Searching for ${chalk.cyan(normalizedName)}...`;

    const pkg = await registry.getPackage(normalizedName);
    if (!pkg) {
      if (spinner) spinner.fail(`Package ${chalk.red(normalizedName)} not found`);
      else logger.error(`Package ${normalizedName} not found`);
      logger.log(chalk.dim('\nTry searching for packages:'));
      logger.log(chalk.dim(`  cpm search ${packageName.replace('@official/', '')}`));
      return;
    }

    // Download package
    if (spinner) spinner.text = `Downloading ${chalk.cyan(pkg.name)}@${pkg.version}...`;
    const downloadResult = await downloadPackage(pkg);

    if (!downloadResult.success) {
      if (spinner) spinner.fail(`Failed to download ${pkg.name}: ${downloadResult.error}`);
      else logger.error(`Failed to download ${pkg.name}: ${downloadResult.error}`);
      return;
    }

    tempDir = downloadResult.tempDir;

    // Resolve platforms
    const targetPlatforms = await resolveTargetPlatforms(options);
    if (!targetPlatforms) {
      if (spinner) spinner.fail(`Invalid platform: ${options.platform}`);
      else logger.error(`Invalid platform: ${options.platform}`);
      logger.log(chalk.dim(`Valid platforms: ${VALID_PLATFORMS.join(', ')}`));
      return;
    }

    // Install to ~/.claude/
    if (spinner) spinner.text = `Installing to ${targetPlatforms.join(', ')}...`;
    await ensureClaudeDirs();

    const results = await installToPlatforms(
      downloadResult.manifest,
      tempDir,
      targetPlatforms
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0) {
      if (spinner) {
        spinner.succeed(
          `Installed ${chalk.green(downloadResult.manifest.name)}@${chalk.dim(downloadResult.manifest.version)}`
        );
      } else {
        logger.success(`Installed ${downloadResult.manifest.name}@${downloadResult.manifest.version}`);
      }
      displaySuccessMessage(downloadResult.manifest, successful);
    }

    displayWarnings(failed);

  } catch (error) {
    if (spinner) spinner.fail(`Failed to install ${packageName}`);
    else logger.error(`Failed to install ${packageName}`);
    if (error instanceof Error) {
      logger.error(error.message);
    }
  } finally {
    // Clean up temp directory
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
