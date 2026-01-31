/**
 * UI Module for CLI Commands
 *
 * This module exports all UI utilities for the CLI commands.
 * It provides a centralized set of tools for:
 *
 * - Colors and styling (type colors, emojis, semantic colors)
 * - Text formatting (numbers, paths, packages)
 * - Progress indicators (spinners with null-safe API)
 *
 * Usage:
 * ```typescript
 * import {
 *   getTypeColor,
 *   formatPackageEntry,
 *   createSpinner
 * } from "./ui";
 * ```
 */

// ============================================================================
// Color Exports
// ============================================================================

export {
  // Type-specific colors
  TYPE_COLORS,
  TYPE_EMOJIS,
  getTypeColor,
  getTypeEmoji,
  // Semantic colors
  SEMANTIC_COLORS,
  // Types
  type ColorFn,
} from "./colors.js";

// ============================================================================
// Formatter Exports
// ============================================================================

export {
  // Number formatting
  formatNumber,
  // Path formatting
  formatPath,
  // Package formatting
  formatPackageHeader,
  formatPackageMetadata,
  formatPackageEntry,
  // File list formatting
  formatCreatedFiles,
  formatRemovedFiles,
  // Usage hints
  formatUsageHints,
  // Separators
  formatSeparator,
} from "./formatters.js";

// ============================================================================
// Spinner Exports
// ============================================================================

export {
  // Spinner factory
  createSpinner,
  // Text helpers
  spinnerText,
  successText,
  failText,
  // Types
  type ProgressSpinner,
} from "./spinner.js";
