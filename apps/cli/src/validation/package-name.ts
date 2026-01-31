/**
 * Package Name Validation
 *
 * This module provides validation and normalization functions for package names.
 * Package names must follow npm naming conventions and be safe for use as
 * file paths and folder names.
 *
 * Security is a key concern because:
 * - Package names are used to create directory paths
 * - Malicious names could attempt path traversal attacks
 * - Names are displayed in URLs and file systems
 *
 * Validation rules (following npm conventions):
 * - Maximum 214 characters
 * - Lowercase letters, numbers, and certain punctuation
 * - Optional scope prefix (e.g., @cpm/)
 * - No path traversal characters (.., /, \)
 * - No null bytes or control characters
 */

import { LIMITS } from "../constants.js";
import type { ValidationResult } from "../types.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Regular expression for valid package names.
 *
 * This follows the npm package name specification:
 * - Optional scope: @scope-name/
 * - Package name: lowercase letters, numbers, hyphens, dots, underscores, tildes
 *
 * The scope part: (@[a-z0-9-~][a-z0-9-._~]*\/)?
 * - Starts with @ followed by a letter, number, hyphen, or tilde
 * - Followed by letters, numbers, hyphens, dots, underscores, tildes
 * - Ends with /
 * - The whole scope is optional (?)
 *
 * The name part: [a-z0-9-~][a-z0-9-._~]*
 * - Starts with a letter, number, hyphen, or tilde
 * - Followed by letters, numbers, hyphens, dots, underscores, tildes
 */
const PACKAGE_NAME_REGEX =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

/**
 * Patterns that indicate path traversal attempts.
 *
 * These strings should never appear in a package name:
 * - ".." - Parent directory reference
 * - "\" - Windows path separator
 * - URL-encoded versions of the above
 *
 * URL-encoded patterns are checked because attackers might try
 * to bypass validation by encoding dangerous characters.
 */
const PATH_TRAVERSAL_PATTERNS = [
  "..", // Parent directory
  "\\", // Windows path separator
  "%2e", // URL-encoded "." (lowercase)
  "%2E", // URL-encoded "." (uppercase)
  "%5c", // URL-encoded "\" (lowercase)
  "%5C", // URL-encoded "\" (uppercase)
  "%2f", // URL-encoded "/" (lowercase)
  "%2F", // URL-encoded "/" (uppercase)
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a string contains any path traversal patterns.
 *
 * This function scans the input for dangerous patterns that could
 * be used to escape the intended directory structure.
 *
 * @param value - The string to check
 * @returns true if any path traversal pattern is found
 *
 * @example
 * ```typescript
 * hasPathTraversal("../etc/passwd")  // true
 * hasPathTraversal("%2e%2e/secret")  // true
 * hasPathTraversal("my-package")     // false
 * ```
 */
function hasPathTraversal(value: string): boolean {
  // Check if any of the dangerous patterns exist in the value
  return PATH_TRAVERSAL_PATTERNS.some((pattern) => value.includes(pattern));
}

// ============================================================================
// Exported Functions
// ============================================================================

/**
 * Validate a package name format.
 *
 * This function performs comprehensive validation:
 * 1. Checks for empty/non-string input
 * 2. Decodes URL encoding to catch encoded attacks
 * 3. Checks length limits
 * 4. Checks for null bytes
 * 5. Checks for path traversal patterns
 * 6. Validates against the package name regex
 *
 * @param name - The package name to validate
 * @returns ValidationResult with valid=true if valid, or valid=false with error
 *
 * @example
 * ```typescript
 * // Valid names
 * validatePackageName("my-package")        // { valid: true }
 * validatePackageName("@cpm/rules")        // { valid: true }
 *
 * // Invalid names
 * validatePackageName("")                  // { valid: false, error: "..." }
 * validatePackageName("../evil")           // { valid: false, error: "..." }
 * validatePackageName("UPPERCASE")         // { valid: false, error: "..." }
 * ```
 */
export function validatePackageName(name: string): ValidationResult {
  // Check for empty or non-string input
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Package name cannot be empty" };
  }

  // Try to decode URL encoding to catch encoded attacks
  // e.g., "%2e%2e" would decode to ".."
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // If decoding fails, use the original string
    // This could happen with invalid percent encoding
  }

  // Check length limit (npm standard is 214 characters)
  if (decoded.length > LIMITS.MAX_PACKAGE_NAME_LENGTH) {
    return {
      valid: false,
      error: `Package name too long (max ${LIMITS.MAX_PACKAGE_NAME_LENGTH} characters)`,
    };
  }

  // Check for null bytes (can truncate strings in some systems)
  if (decoded.includes("\0")) {
    return { valid: false, error: "Invalid characters in package name" };
  }

  // Check for path traversal patterns (security check)
  if (hasPathTraversal(decoded)) {
    return { valid: false, error: "Invalid characters in package name" };
  }

  // Validate against the npm package name regex
  // Convert to lowercase for comparison since npm names are case-insensitive
  if (!PACKAGE_NAME_REGEX.test(name.toLowerCase())) {
    return { valid: false, error: "Invalid package name format" };
  }

  // All checks passed - package name is valid
  return { valid: true };
}

/**
 * Check if a package name is valid (simple boolean check).
 *
 * This is a convenience function for cases where you just need
 * a boolean result without the error message.
 *
 * @param name - The package name to check
 * @returns true if the name is valid, false otherwise
 *
 * @example
 * ```typescript
 * if (isValidPackageName(userInput)) {
 *   // Proceed with installation
 * } else {
 *   // Show error
 * }
 * ```
 */
export function isValidPackageName(name: string): boolean {
  // Delegate to validatePackageName and extract the boolean result
  const result = validatePackageName(name);
  return result.valid;
}

/**
 * Normalize a package name by adding the default scope if needed.
 *
 * CPM uses @cpm/ as the default scope. This function adds it
 * when the user provides a short name without a scope.
 *
 * @param name - The package name to normalize
 * @returns The normalized package name with scope
 *
 * @example
 * ```typescript
 * normalizePackageName("typescript-rules")
 * // Returns: "@cpm/typescript-rules"
 *
 * normalizePackageName("@custom/my-rules")
 * // Returns: "@custom/my-rules" (unchanged - already has scope)
 * ```
 */
export function normalizePackageName(name: string): string {
  // If the name already starts with @, it has a scope
  if (name.startsWith("@")) {
    return name;
  }

  // Add the default @cpm/ scope
  return `@cpm/${name}`;
}
