/**
 * Text Formatters for CLI Output
 *
 * This module provides formatting utilities for displaying data
 * in the CLI. All formatters are pure functions that transform
 * data into human-readable strings.
 *
 * Design principles:
 * - Pure functions with no side effects
 * - Consistent formatting across the CLI
 * - Locale-aware where appropriate
 */

import chalk from "chalk";
import path from "path";
import type { RegistryPackage, PackageManifest } from "../../types.js";
import { resolvePackageType } from "../../types.js";
import { getTypeColor, getTypeEmoji, SEMANTIC_COLORS } from "./colors.js";

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format a number for display with K/M suffixes.
 *
 * Makes large numbers more readable:
 * - Under 1000: Display as-is
 * - 1000-999999: Display with K suffix (e.g., 1.5k)
 * - 1000000+: Display with M suffix (e.g., 1.2M)
 *
 * @param num - The number to format
 * @returns Formatted string representation
 *
 * @example
 * ```typescript
 * formatNumber(500)      // "500"
 * formatNumber(1500)     // "1.5k"
 * formatNumber(1500000)  // "1.5M"
 * ```
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

// ============================================================================
// Path Formatting
// ============================================================================

/**
 * Format a file path relative to the current directory.
 *
 * If the path is within the current directory, shows the relative path.
 * Otherwise shows the absolute path.
 *
 * @param filePath - The absolute file path
 * @returns The formatted path string
 *
 * @example
 * ```typescript
 * // If cwd is /home/user/project
 * formatPath("/home/user/project/src/file.ts")
 * // Returns: "src/file.ts"
 *
 * formatPath("/etc/config")
 * // Returns: "/etc/config"
 * ```
 */
export function formatPath(filePath: string): string {
  const relativePath = path.relative(process.cwd(), filePath);
  // If the relative path starts with "..", show absolute path
  if (relativePath.startsWith("..")) {
    return filePath;
  }
  return relativePath;
}

// ============================================================================
// Package Formatting
// ============================================================================

/**
 * Format a package header line for display.
 *
 * Creates a formatted line with:
 * - Type emoji
 * - Package name (bold)
 * - Version (dimmed)
 * - Badges (if applicable)
 *
 * @param pkg - The registry package to format
 * @returns Formatted header string
 *
 * @example
 * ```typescript
 * formatPackageHeader(pkg)
 * // "📜 @cpm/typescript-strict v1.0.0 ✓ verified"
 * ```
 */
export function formatPackageHeader(pkg: RegistryPackage): string {
  const pkgType = resolvePackageType(pkg);
  const emoji = getTypeEmoji(pkgType);
  const badges: string[] = [];

  if (pkg.verified) {
    badges.push(chalk.green("✓ verified"));
  }

  const badgeStr = badges.length > 0 ? ` ${badges.join(" ")}` : "";

  return `${emoji} ${chalk.bold.white(pkg.name)} ${chalk.dim(`v${pkg.version}`)}${badgeStr}`;
}

/**
 * Format package metadata line for display.
 *
 * Creates a formatted line with:
 * - Package type (colored)
 * - Download count
 * - Star count (if available)
 * - Author
 *
 * @param pkg - The registry package to format
 * @returns Formatted metadata string
 *
 * @example
 * ```typescript
 * formatPackageMetadata(pkg)
 * // "rules · ↓ 1.5k · ★ 42 · @author"
 * ```
 */
export function formatPackageMetadata(pkg: RegistryPackage): string {
  const pkgType = resolvePackageType(pkg);
  const typeColor = getTypeColor(pkgType);

  const parts = [
    typeColor(pkgType),
    chalk.dim(`↓ ${formatNumber(pkg.downloads ?? 0)}`),
    pkg.stars !== undefined ? chalk.dim(`★ ${pkg.stars}`) : null,
    chalk.dim(`@${pkg.author}`),
  ].filter(Boolean) as string[];

  return parts.join(chalk.dim(" · "));
}

/**
 * Format a complete package entry for search results.
 *
 * Returns an array of lines to display:
 * 1. Header (emoji, name, version, badges)
 * 2. Description (indented)
 * 3. Metadata (indented)
 *
 * @param pkg - The registry package to format
 * @returns Array of formatted lines
 *
 * @example
 * ```typescript
 * const lines = formatPackageEntry(pkg);
 * lines.forEach(line => console.log(line));
 * ```
 */
export function formatPackageEntry(pkg: RegistryPackage): string[] {
  return [
    formatPackageHeader(pkg),
    `   ${chalk.dim(pkg.description)}`,
    `   ${formatPackageMetadata(pkg)}`,
  ];
}

// ============================================================================
// Installation Result Formatting
// ============================================================================

/**
 * Format a list of created files for display.
 *
 * @param files - Array of absolute file paths
 * @returns Array of formatted file lines
 *
 * @example
 * ```typescript
 * formatCreatedFiles(["/path/to/file1.ts", "/path/to/file2.ts"])
 * // ["  + src/file1.ts", "  + src/file2.ts"]
 * ```
 */
export function formatCreatedFiles(files: string[]): string[] {
  return files.map((file) => chalk.dim(`    + ${formatPath(file)}`));
}

/**
 * Format a list of removed files for display.
 *
 * @param files - Array of file paths
 * @returns Array of formatted file lines
 *
 * @example
 * ```typescript
 * formatRemovedFiles(["file1.ts", "file2.ts"])
 * // ["  - file1.ts", "  - file2.ts"]
 * ```
 */
export function formatRemovedFiles(files: string[]): string[] {
  return files.map((file) => chalk.dim(`  - ${file}`));
}

// ============================================================================
// Usage Hint Formatting
// ============================================================================

/**
 * Format usage hints based on package type.
 *
 * @param manifest - The installed package manifest
 * @returns Array of hint lines to display
 *
 * @example
 * ```typescript
 * const hints = formatUsageHints(skillManifest);
 * // ["  Usage: Type /my-command in your editor"]
 * ```
 */
export function formatUsageHints(manifest: PackageManifest): string[] {
  const hints: string[] = [];

  switch (manifest.type) {
    case "skill":
      if ("skill" in manifest && manifest.skill?.command) {
        hints.push(
          `  ${SEMANTIC_COLORS.info("Usage:")} Type ${chalk.yellow(manifest.skill.command)} in your editor`,
        );
      }
      break;

    case "rules":
      hints.push(
        `  ${SEMANTIC_COLORS.info("Usage:")} Rules are automatically applied to matching files`,
      );
      break;

    case "mcp":
      hints.push(
        `  ${SEMANTIC_COLORS.info("Usage:")} MCP server configured. Restart your editor to activate.`,
      );

      if ("mcp" in manifest && manifest.mcp?.env) {
        const envVars = Object.keys(manifest.mcp.env);
        if (envVars.length > 0) {
          hints.push(
            chalk.yellow(
              `\n  Configure these environment variables in ~/.claude.json:`,
            ),
          );
          for (const envVar of envVars) {
            hints.push(chalk.dim(`    - ${envVar}`));
          }
        }
      }
      break;
  }

  return hints;
}

// ============================================================================
// Separator Formatting
// ============================================================================

/**
 * Create a horizontal separator line.
 *
 * @param width - Width of the separator (default: 50)
 * @returns The separator string
 */
export function formatSeparator(width: number = 50): string {
  return chalk.dim("─".repeat(width));
}
