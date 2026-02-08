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

import { getAdapter } from "../adapters/index.js";
import { logger } from "../utils/logger.js";
import { VALID_PLATFORMS } from "../constants.js";

// Import UI layer
import {
  createSpinner,
  spinnerText,
  successText,
  failText,
  formatRemovedFiles,
  SEMANTIC_COLORS,
} from "./ui/index.js";

function extractFolderName(packageName: string): string {
  if (packageName.includes("/")) {
    return packageName.split("/").pop() || packageName;
  }
  return packageName.replace(/^@/, "");
}

function displayRemovedFiles(files: string[]): void {
  logger.log(SEMANTIC_COLORS.dim("\nFiles removed:"));
  const formatted = formatRemovedFiles(files);
  formatted.forEach((line) => logger.log(line));
}

export async function uninstallCommand(packageName: string): Promise<void> {
  const spinner = createSpinner(spinnerText("Uninstalling", packageName));

  try {
    const folderName = extractFolderName(packageName);
    const allFilesRemoved: string[] = [];

    // Try uninstalling from all platforms
    for (const platform of VALID_PLATFORMS) {
      try {
        const adapter = getAdapter(platform);
        const result = await adapter.uninstall(folderName, process.cwd());
        if (result.success) {
          allFilesRemoved.push(...result.filesWritten);
        }
      } catch {
        // Adapter may not exist for this platform, skip
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
