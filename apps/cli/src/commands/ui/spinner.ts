/**
 * Spinner Abstraction for CLI Progress
 *
 * This module provides a type-safe abstraction over the ora spinner library.
 * It handles the complexity of:
 *
 * - Creating spinners only when not in quiet mode
 * - Providing a null-safe API for spinner operations
 * - Consistent spinner styling across the CLI
 *
 * The abstraction uses the Null Object pattern - when in quiet mode,
 * operations are no-ops instead of requiring null checks everywhere.
 */

import ora, { type Ora } from "ora";
import chalk from "chalk";
import { logger } from "../../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a spinner that may or may not be visible.
 *
 * Provides the same API regardless of whether the spinner is shown,
 * following the Null Object pattern.
 */
export interface ProgressSpinner {
  /** Update the spinner text */
  update(text: string): void;
  /** Mark as successful and stop */
  succeed(text: string): void;
  /** Mark as failed and stop */
  fail(text: string): void;
  /** Mark as warning and stop */
  warn(text: string): void;
  /** Stop the spinner without a status */
  stop(): void;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Active spinner implementation that wraps ora.
 */
class ActiveSpinner implements ProgressSpinner {
  constructor(private readonly spinner: Ora) {}

  update(text: string): void {
    this.spinner.text = text;
  }

  succeed(text: string): void {
    this.spinner.succeed(text);
  }

  fail(text: string): void {
    this.spinner.fail(text);
  }

  warn(text: string): void {
    this.spinner.warn(text);
  }

  stop(): void {
    this.spinner.stop();
  }
}

/**
 * Null spinner implementation for quiet mode.
 *
 * All operations are no-ops, but final statuses are still logged
 * so the user knows the outcome even in quiet mode.
 */
class QuietSpinner implements ProgressSpinner {
  update(_text: string): void {
    // No-op in quiet mode
  }

  succeed(text: string): void {
    // Log success even in quiet mode
    logger.success(text.replace(chalk.green(""), "").trim());
  }

  fail(text: string): void {
    // Log errors even in quiet mode
    logger.error(text.replace(chalk.red(""), "").trim());
  }

  warn(text: string): void {
    // Log warnings even in quiet mode
    logger.warn(text.replace(chalk.yellow(""), "").trim());
  }

  stop(): void {
    // No-op in quiet mode
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a progress spinner for an operation.
 *
 * Returns an ActiveSpinner in normal mode, QuietSpinner in quiet mode.
 * Both implement the same interface, so callers don't need null checks.
 *
 * @param initialText - The initial spinner text
 * @returns A ProgressSpinner instance
 *
 * @example
 * ```typescript
 * const spinner = createSpinner("Installing package...");
 * spinner.update("Downloading...");
 * spinner.succeed("Installed successfully");
 * ```
 */
export function createSpinner(initialText: string): ProgressSpinner {
  if (logger.isQuiet()) {
    return new QuietSpinner();
  }

  const spinner = ora(initialText).start();
  return new ActiveSpinner(spinner);
}

/**
 * Create a highlighted spinner text with a cyan package name.
 *
 * @param action - The action being performed
 * @param packageName - The package name to highlight
 * @returns Formatted spinner text
 *
 * @example
 * ```typescript
 * spinnerText("Installing", "@cpm/typescript-strict")
 * // "Installing @cpm/typescript-strict..."
 * ```
 */
export function spinnerText(action: string, packageName: string): string {
  return `${action} ${chalk.cyan(packageName)}...`;
}

/**
 * Create a success message with green package name.
 *
 * @param action - The action completed (past tense)
 * @param packageName - The package name
 * @param version - Optional version string
 * @returns Formatted success message
 *
 * @example
 * ```typescript
 * successText("Installed", "@cpm/typescript-strict", "1.0.0")
 * // "Installed @cpm/typescript-strict@1.0.0"
 * ```
 */
export function successText(
  action: string,
  packageName: string,
  version?: string,
): string {
  const versionStr = version ? `@${chalk.dim(version)}` : "";
  return `${action} ${chalk.green(packageName)}${versionStr}`;
}

/**
 * Create a failure message with red package name.
 *
 * @param action - The action that failed
 * @param packageName - The package name
 * @param error - Optional error message
 * @returns Formatted failure message
 *
 * @example
 * ```typescript
 * failText("Failed to install", "@cpm/package", "Not found")
 * // "Failed to install @cpm/package: Not found"
 * ```
 */
export function failText(
  action: string,
  packageName: string,
  error?: string,
): string {
  const errorStr = error ? `: ${error}` : "";
  return `${action} ${chalk.red(packageName)}${errorStr}`;
}
