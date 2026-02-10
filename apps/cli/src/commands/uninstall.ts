/**
 * Uninstall Command
 *
 * Uninstalls packages from both Claude Code and Cursor platforms.
 * Tries all registered adapters to find and remove the package.
 *
 * @example
 * ```bash
 * cpm uninstall typescript-strict
 * cpm uninstall @cpm/nextjs-rules
 * ```
 */

import { getAllAdapters } from "../adapters/index.js";
import { logger } from "../utils/logger.js";
import { sanitizeFolderName } from "../security/index.js";

// Import UI layer
import {
  createSpinner,
  spinnerText,
  successText,
  failText,
  formatRemovedFiles,
  SEMANTIC_COLORS,
} from "./ui/index.js";

function displayRemovedFiles(files: string[]): void {
  logger.log(SEMANTIC_COLORS.dim("\nFiles removed:"));
  const formatted = formatRemovedFiles(files);
  formatted.forEach((line) => logger.log(line));
}

export async function uninstallCommand(packageName: string): Promise<void> {
  const spinner = createSpinner(spinnerText("Uninstalling", packageName));

  try {
    let folderName: string;
    try {
      folderName = sanitizeFolderName(packageName);
    } catch (error) {
      spinner.fail(`Invalid package name: ${packageName}`);
      logger.error(error instanceof Error ? error.message : "Invalid input");
      return;
    }

    const allFilesRemoved: string[] = [];

    // Try uninstalling from all registered adapters
    for (const adapter of getAllAdapters()) {
      try {
        const result = await adapter.uninstall(folderName, process.cwd());
        if (result.success) {
          allFilesRemoved.push(...result.filesWritten);
        }
      } catch {
        // Adapter may fail for this platform, skip
      }
    }

    if (allFilesRemoved.length > 0) {
      spinner.succeed(successText("Uninstalled", packageName));
      displayRemovedFiles(allFilesRemoved);
    } else {
      spinner.warn(`Package ${packageName} was not found`);
    }
  } catch (error) {
    spinner.fail(failText("Failed to uninstall", packageName));
    logger.error(error instanceof Error ? error.message : "Unknown error");
  }
}
