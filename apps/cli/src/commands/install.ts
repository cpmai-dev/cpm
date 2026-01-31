/**
 * Install command for CPM
 * Handles downloading and installing packages from the registry
 */
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import type { PackageManifest, Platform, InstalledPackage } from '../types.js';
import type { InstallResult } from '../adapters/base.js';
import { getAdapter } from '../adapters/index.js';
import { getDetectedPlatforms } from '../utils/platform.js';
import { addInstalledPackage, ensureCpmDir } from '../utils/config.js';
import { registry } from '../utils/registry.js';
import { downloadPackage } from '../utils/downloader.js';

// ============================================================================
// Types
// ============================================================================

export interface InstallOptions {
  platform?: string;
  global?: boolean;
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
 * Follows npm package naming conventions with enhanced security checks
 */
function validatePackageName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Package name cannot be empty' };
  }

  // Decode URL encoding before validation
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // If decoding fails, use original
  }

  if (decoded.length > MAX_PACKAGE_NAME_LENGTH) {
    return { valid: false, error: `Package name too long (max ${MAX_PACKAGE_NAME_LENGTH} characters)` };
  }

  // Check for null bytes (security)
  if (decoded.includes('\0')) {
    return { valid: false, error: 'Invalid characters in package name' };
  }

  // Check for path traversal attempts (including encoded variants)
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

  // Package name pattern: optional @scope/ followed by package name
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

  // Auto-detect installed platforms
  let platforms = await getDetectedPlatforms();

  // Default to claude-code if nothing detected
  if (platforms.length === 0) {
    platforms = ['claude-code'];
  }

  // Filter to only claude-code for MVP
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
  packagePath: string,
  platforms: Platform[]
): Promise<InstallResult[]> {
  return Promise.all(
    platforms.map(async (platform) => {
      const adapter = getAdapter(platform);
      return adapter.install(manifest, process.cwd(), packagePath);
    })
  );
}

/**
 * Save installation to lockfile
 */
async function saveInstallation(
  manifest: PackageManifest,
  packagePath: string,
  successfulPlatforms: Platform[]
): Promise<void> {
  const installedPkg: InstalledPackage = {
    name: manifest.name,
    version: manifest.version,
    type: manifest.type,
    platforms: successfulPlatforms,
    installedAt: new Date().toISOString(),
    path: packagePath,
  };

  await addInstalledPackage(installedPkg);
}

/**
 * Display success message with installation details
 */
function displaySuccessMessage(
  manifest: PackageManifest,
  successfulResults: InstallResult[]
): void {
  // Show package info
  console.log(chalk.dim(`\n  ${manifest.description}`));

  // Show what was created
  console.log(chalk.dim('\n  Files created:'));
  for (const result of successfulResults) {
    for (const file of result.filesWritten) {
      console.log(chalk.dim(`    + ${path.relative(process.cwd(), file)}`));
    }
  }

  // Show usage hints based on package type
  console.log('');
  displayUsageHints(manifest);
}

/**
 * Display usage hints based on package type
 */
function displayUsageHints(manifest: PackageManifest): void {
  switch (manifest.type) {
    case 'skill':
      if (manifest.skill?.command) {
        console.log(
          `  ${chalk.cyan('Usage:')} Type ${chalk.yellow(manifest.skill.command)} in Claude Code`
        );
      }
      break;

    case 'rules':
      console.log(
        `  ${chalk.cyan('Usage:')} Rules are automatically applied to matching files`
      );
      break;

    case 'mcp':
      console.log(
        `  ${chalk.cyan('Usage:')} MCP server configured. Restart Claude Code to activate.`
      );
      displayMcpEnvVars(manifest);
      break;
  }
}

/**
 * Display required MCP environment variables
 */
function displayMcpEnvVars(manifest: PackageManifest): void {
  if (!manifest.mcp?.env) return;

  const envVars = Object.keys(manifest.mcp.env);
  if (envVars.length === 0) return;

  console.log(chalk.yellow(`\n  Required environment variables:`));
  for (const envVar of envVars) {
    console.log(chalk.dim(`    - ${envVar}`));
  }
}

/**
 * Display warnings for failed installations
 */
function displayWarnings(failedResults: InstallResult[]): void {
  if (failedResults.length === 0) return;

  console.log(chalk.yellow('\n  Warnings:'));
  for (const result of failedResults) {
    console.log(chalk.yellow(`    - ${result.platform}: ${result.error}`));
  }
}

/**
 * Show package not found message with suggestions
 */
function showNotFoundMessage(packageName: string): void {
  console.log(chalk.dim('\nTry searching for packages:'));
  console.log(chalk.dim(`  cpm search ${packageName.replace('@official/', '')}`));
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
  // Step 1: Validate package name
  const validation = validatePackageName(packageName);
  if (!validation.valid) {
    console.error(chalk.red(`Invalid package name: ${validation.error}`));
    return;
  }

  const spinner = ora(`Installing ${chalk.cyan(packageName)}...`).start();

  try {
    // Step 2: Normalize and find package
    const normalizedName = normalizePackageName(packageName);
    spinner.text = `Searching for ${chalk.cyan(normalizedName)}...`;

    const pkg = await registry.getPackage(normalizedName);
    if (!pkg) {
      spinner.fail(`Package ${chalk.red(normalizedName)} not found`);
      showNotFoundMessage(packageName);
      return;
    }

    // Step 3: Download package
    spinner.text = `Downloading ${chalk.cyan(pkg.name)}@${pkg.version}...`;
    const downloadResult = await downloadPackage(pkg);

    if (!downloadResult.success) {
      spinner.fail(`Failed to download ${pkg.name}: ${downloadResult.error}`);
      return;
    }

    // Step 4: Resolve target platforms
    const targetPlatforms = await resolveTargetPlatforms(options);
    if (!targetPlatforms) {
      spinner.fail(`Invalid platform: ${options.platform}`);
      console.log(chalk.dim(`Valid platforms: ${VALID_PLATFORMS.join(', ')}`));
      return;
    }

    // Step 5: Install to platforms
    spinner.text = `Installing to ${targetPlatforms.join(', ')}...`;
    await ensureCpmDir();

    const results = await installToPlatforms(
      downloadResult.manifest,
      downloadResult.packagePath,
      targetPlatforms
    );

    // Step 6: Process results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0) {
      await saveInstallation(
        downloadResult.manifest,
        downloadResult.packagePath,
        successful.map(r => r.platform) as Platform[]
      );

      spinner.succeed(
        `Installed ${chalk.green(downloadResult.manifest.name)}@${chalk.dim(downloadResult.manifest.version)}`
      );

      displaySuccessMessage(downloadResult.manifest, successful);
    }

    displayWarnings(failed);

  } catch (error) {
    spinner.fail(`Failed to install ${packageName}`);
    if (error instanceof Error) {
      console.error(chalk.red(`\n  ${error.message}`));
    }
  }
}
