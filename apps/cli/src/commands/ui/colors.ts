/**
 * Color Configuration for CLI Output
 *
 * This module centralizes all color and visual configuration for the CLI.
 * By keeping colors in one place, we ensure:
 *
 * - Consistent visual styling across all commands
 * - Easy modification of the color scheme
 * - Type-safe access to colors and emojis
 *
 * Uses chalk for terminal color support with automatic detection
 * of terminal capabilities.
 */

import chalk from "chalk";
import type { PackageType } from "../../types.js";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * A function that applies a color to a string.
 * Chalk color functions follow this signature.
 */
export type ColorFn = (str: string) => string;

// ============================================================================
// Package Type Colors
// ============================================================================

/**
 * Color mapping for each package type.
 *
 * Each package type has a distinctive color to help users
 * quickly identify package types in search results and lists.
 *
 * Colors are chosen to be:
 * - Distinct from each other
 * - Readable on both light and dark terminals
 * - Semantically meaningful where possible
 */
export const TYPE_COLORS: Record<PackageType, ColorFn> = {
  rules: chalk.yellow, // Yellow - like warning/guidelines
  skill: chalk.blue, // Blue - quick actions
  mcp: chalk.magenta, // Magenta - special/protocol
  agent: chalk.green, // Green - AI/active
  hook: chalk.cyan, // Cyan - lifecycle
  workflow: chalk.red, // Red - processes
  template: chalk.white, // White - neutral/base
  bundle: chalk.gray, // Gray - collection
} as const;

/**
 * Get the color function for a package type.
 *
 * Falls back to white if the type is unknown.
 *
 * @param type - The package type
 * @returns The chalk color function for this type
 *
 * @example
 * ```typescript
 * const color = getTypeColor("rules");
 * console.log(color("Rules package")); // Yellow text
 * ```
 */
export function getTypeColor(type: string): ColorFn {
  return TYPE_COLORS[type as PackageType] ?? chalk.white;
}

// ============================================================================
// Package Type Emojis
// ============================================================================

/**
 * Emoji mapping for each package type.
 *
 * Visual icons that make it easy to scan search results
 * and quickly identify package types at a glance.
 */
export const TYPE_EMOJIS: Record<PackageType, string> = {
  rules: "📜", // Scroll - coding rules/guidelines
  skill: "⚡", // Lightning - quick commands
  mcp: "🔌", // Plug - server connections
  agent: "🤖", // Robot - AI agents
  hook: "🪝", // Hook - lifecycle events
  workflow: "📋", // Clipboard - workflows
  template: "📁", // Folder - project templates
  bundle: "📦", // Package - bundles
} as const;

/**
 * Get the emoji for a package type.
 *
 * Falls back to a generic package emoji if the type is unknown.
 *
 * @param type - The package type
 * @returns The emoji string for this type
 *
 * @example
 * ```typescript
 * const emoji = getTypeEmoji("skill");
 * console.log(`${emoji} My Skill`); // "⚡ My Skill"
 * ```
 */
export function getTypeEmoji(type: string): string {
  return TYPE_EMOJIS[type as PackageType] ?? "📦";
}

// ============================================================================
// Semantic Colors
// ============================================================================

/**
 * Semantic color functions for consistent messaging.
 *
 * Use these for status indicators and messages throughout the CLI.
 */
export const SEMANTIC_COLORS = {
  /** Success messages and indicators */
  success: chalk.green,
  /** Error messages */
  error: chalk.red,
  /** Warning messages */
  warning: chalk.yellow,
  /** Informational messages */
  info: chalk.cyan,
  /** Dimmed/secondary text */
  dim: chalk.dim,
  /** Bold emphasis */
  bold: chalk.bold,
  /** Package names and commands */
  highlight: chalk.cyan,
  /** Version numbers */
  version: chalk.dim,
} as const;
