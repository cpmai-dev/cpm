/**
 * Validation Module
 *
 * This module provides centralized validation utilities for CPM.
 * It exports functions for validating and normalizing user input,
 * particularly package names.
 *
 * Validation is important for:
 * - Security: Preventing path traversal and injection attacks
 * - Correctness: Ensuring inputs match expected formats
 * - User experience: Providing helpful error messages
 *
 * Usage:
 * ```typescript
 * import {
 *   validatePackageName,
 *   isValidPackageName,
 *   normalizePackageName
 * } from "./validation";
 *
 * // Validate with error message
 * const result = validatePackageName(userInput);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 *
 * // Simple boolean check
 * if (isValidPackageName(name)) {
 *   // proceed
 * }
 *
 * // Add default scope
 * const fullName = normalizePackageName("my-rules");
 * // fullName is "@cpm/my-rules"
 * ```
 */

// ============================================================================
// Package Name Validation
// ============================================================================

/**
 * Export package name validation functions.
 *
 * - validatePackageName: Full validation with error messages
 * - isValidPackageName: Simple boolean check
 * - normalizePackageName: Add @cpm/ scope if missing
 */
export {
  validatePackageName,
  isValidPackageName,
  normalizePackageName,
} from "./package-name.js";
