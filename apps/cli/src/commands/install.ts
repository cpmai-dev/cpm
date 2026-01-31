/**
 * Install command for CPM
 * Downloads and installs packages directly to ~/.claude/
 */
import chalk from "chalk";
import ora from "ora";
import path from "path";
import type { PackageManifest, Platform } from "../types.js";
import { isValidPlatform } from "../types.js";
import type { InstallResult } from "../adapters/base.js";
import { getAdapter } from "../adapters/index.js";
import { ensureClaudeDirs } from "../utils/config.js";
import { registry } from "../utils/registry.js";
import { downloadPackage, cleanupTempDir } from "../utils/downloader.js";
import { logger } from "../utils/logger.js";
import {
  validatePackageName,
  normalizePackageName,
} from "../validation/index.js";
import { VALID_PLATFORMS } from "../constants.js";

// ============================================================================
// Types
// ============================================================================

interface InstallOptions {
  platform?: string;
  version?: string;
}

// ============================================================================
// Installation Steps
// ============================================================================

/**
 * Resolve target platforms for installation
 */
function resolveTargetPlatforms(options: InstallOptions): Platform[] | null {
  if (options.platform && options.platform !== "all") {
    if (!isValidPlatform(options.platform)) {
      return null;
    }
    return [options.platform];
  }

  return ["claude-code"];
}

/**
 * Install package to all target platforms
 */
async function installToPlatforms(
  manifest: PackageManifest,
  tempDir: string | undefined,
  platforms: Platform[],
): Promise<InstallResult[]> {
  return Promise.all(
    platforms.map(async (platform) => {
      const adapter = getAdapter(platform);
      return adapter.install(manifest, process.cwd(), tempDir);
    }),
  );
}

/**
 * Display success message with installation details
 */
function displaySuccessMessage(
  manifest: PackageManifest,
  successfulResults: InstallResult[],
): void {
  logger.log(chalk.dim(`\n  ${manifest.description}`));

  logger.log(chalk.dim("\n  Files created:"));
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
    case "skill":
      if ("skill" in manifest && manifest.skill?.command) {
        logger.log(
          `  ${chalk.cyan("Usage:")} Type ${chalk.yellow(manifest.skill.command)} in Claude Code`,
        );
      }
      break;

    case "rules":
      logger.log(
        `  ${chalk.cyan("Usage:")} Rules are automatically applied to matching files`,
      );
      break;

    case "mcp":
      logger.log(
        `  ${chalk.cyan("Usage:")} MCP server configured. Restart Claude Code to activate.`,
      );
      if ("mcp" in manifest && manifest.mcp?.env) {
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

  logger.log(chalk.yellow("\n  Warnings:"));
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
  options: InstallOptions,
): Promise<void> {
  const validation = validatePackageName(packageName);
  if (!validation.valid) {
    logger.error(`Invalid package name: ${validation.error}`);
    return;
  }

  const spinner = logger.isQuiet()
    ? null
    : ora(`Installing ${chalk.cyan(packageName)}...`).start();
  let tempDir: string | undefined;

  try {
    const normalizedName = normalizePackageName(packageName);
    if (spinner)
      spinner.text = `Searching for ${chalk.cyan(normalizedName)}...`;

    const pkg = await registry.getPackage(normalizedName);
    if (!pkg) {
      if (spinner)
        spinner.fail(`Package ${chalk.red(normalizedName)} not found`);
      else logger.error(`Package ${normalizedName} not found`);
      logger.log(chalk.dim("\nTry searching for packages:"));
      logger.log(
        chalk.dim(`  cpm search ${packageName.replace(/^@[^/]+\//, "")}`),
      );
      return;
    }

    if (spinner)
      spinner.text = `Downloading ${chalk.cyan(pkg.name)}@${pkg.version}...`;
    const downloadResult = await downloadPackage(pkg);

    if (!downloadResult.success) {
      if (spinner)
        spinner.fail(`Failed to download ${pkg.name}: ${downloadResult.error}`);
      else
        logger.error(`Failed to download ${pkg.name}: ${downloadResult.error}`);
      return;
    }

    // TypeScript narrows the type after success check above
    const manifest = downloadResult.manifest;
    tempDir = downloadResult.tempDir;

    const targetPlatforms = resolveTargetPlatforms(options);
    if (!targetPlatforms) {
      if (spinner) spinner.fail(`Invalid platform: ${options.platform}`);
      else logger.error(`Invalid platform: ${options.platform}`);
      logger.log(chalk.dim(`Valid platforms: ${VALID_PLATFORMS.join(", ")}`));
      return;
    }

    if (spinner)
      spinner.text = `Installing to ${targetPlatforms.join(", ")}...`;
    await ensureClaudeDirs();

    const results = await installToPlatforms(
      manifest,
      tempDir,
      targetPlatforms,
    );

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (successful.length > 0) {
      if (spinner) {
        spinner.succeed(
          `Installed ${chalk.green(manifest.name)}@${chalk.dim(manifest.version)}`,
        );
      } else {
        logger.success(`Installed ${manifest.name}@${manifest.version}`);
      }
      displaySuccessMessage(manifest, successful);
    }

    displayWarnings(failed);
  } catch (error) {
    if (spinner) spinner.fail(`Failed to install ${packageName}`);
    else logger.error(`Failed to install ${packageName}`);
    if (error instanceof Error) {
      logger.error(error.message);
    }
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
