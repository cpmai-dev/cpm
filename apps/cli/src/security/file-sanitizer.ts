/**
 * File and Folder Name Sanitization
 *
 * This module provides security functions to sanitize file and folder names,
 * preventing path traversal attacks and other file system exploits.
 *
 * Path traversal attacks occur when an attacker uses special characters
 * like ".." to escape the intended directory and access other parts of
 * the file system. For example:
 *   - "../../../etc/passwd" could read system files
 *   - "..\..\Windows\System32" could access system directories
 *
 * This module prevents such attacks by:
 * 1. Extracting only the base filename (no directories)
 * 2. Checking for null bytes and hidden file prefixes
 * 3. Removing dangerous characters
 * 4. Verifying paths don't escape allowed directories
 *
 * @see https://owasp.org/www-community/attacks/Path_Traversal
 */

import path from "path";
import type { ValidationResult } from "../types.js";

/**
 * Sanitize a single file name (not a path).
 *
 * This function validates and sanitizes a file name to prevent:
 * - Path traversal via ".." sequences
 * - Hidden file attacks via "." prefix
 * - Null byte injection
 * - Special characters that could cause issues
 *
 * For CPM, we only allow .md (markdown) files because that's all
 * we need for rules and skills.
 *
 * @param fileName - The file name to sanitize (just the name, not a path)
 * @returns Object with:
 *   - valid: boolean indicating if the name is safe
 *   - error: string describing why validation failed (if valid=false)
 *   - sanitized: the cleaned file name (empty string if invalid)
 *
 * @example
 * ```typescript
 * // Valid file
 * sanitizeFileName("RULES.md")
 * // Returns: { valid: true, sanitized: "RULES.md" }
 *
 * // Path traversal attempt
 * sanitizeFileName("../../../etc/passwd")
 * // Returns: { valid: false, error: "...", sanitized: "" }
 *
 * // Hidden file
 * sanitizeFileName(".secret")
 * // Returns: { valid: false, error: "Hidden files not allowed", sanitized: "" }
 * ```
 */
export function sanitizeFileName(fileName: string): ValidationResult & {
  sanitized: string;
} {
  // Check for empty or non-string input
  if (!fileName || typeof fileName !== "string") {
    return { valid: false, error: "File name cannot be empty", sanitized: "" };
  }

  // Extract just the file name, removing any directory components
  // This is our first defense against path traversal
  // e.g., "../../evil.md" becomes "evil.md"
  const baseName = path.basename(fileName);

  // Check for null byte injection
  // Null bytes can truncate strings in some systems, leading to attacks
  // e.g., "file.txt\0.exe" might be treated as "file.txt" but execute as .exe
  if (baseName.includes("\0")) {
    return {
      valid: false,
      error: "File name contains null bytes",
      sanitized: "",
    };
  }

  // Check for hidden files (starting with ".")
  // Hidden files are often configuration files that shouldn't be overwritten
  // Exception: we allow ".md" by itself (though it's unusual)
  if (baseName.startsWith(".") && baseName !== ".md") {
    return { valid: false, error: "Hidden files not allowed", sanitized: "" };
  }

  // Replace dangerous characters with underscores
  // These characters have special meaning on Windows or could cause issues
  // < > : " | ? * \ are all problematic on Windows file systems
  const sanitized = baseName.replace(/[<>:"|?*\\]/g, "_");

  // Double-check for path traversal after sanitization
  // Belt-and-suspenders approach to security
  if (
    sanitized.includes("..") ||
    sanitized.includes("/") ||
    sanitized.includes("\\")
  ) {
    return {
      valid: false,
      error: "Path traversal detected in file name",
      sanitized: "",
    };
  }

  // For CPM, we only allow markdown files
  // This limits the attack surface - we won't accidentally copy executables
  if (!sanitized.endsWith(".md")) {
    return { valid: false, error: "Only .md files allowed", sanitized: "" };
  }

  // File name passed all checks - it's safe to use
  return { valid: true, sanitized };
}

/**
 * Sanitize a package name for use as a folder name.
 *
 * Package names can be scoped (e.g., "@cpm/typescript-rules") but we only
 * want the actual package name part for the folder. This function:
 * 1. Extracts the package name (removes scope)
 * 2. Decodes URL encoding (prevents %2e%2e attacks)
 * 3. Removes dangerous characters
 * 4. Verifies no path traversal is possible
 *
 * @param name - The package name to sanitize (e.g., "@cpm/typescript-rules")
 * @returns The sanitized folder name (e.g., "typescript-rules")
 * @throws Error if the package name is invalid or contains path traversal
 *
 * @example
 * ```typescript
 * sanitizeFolderName("@cpm/typescript-rules")
 * // Returns: "typescript-rules"
 *
 * sanitizeFolderName("my-package")
 * // Returns: "my-package"
 *
 * sanitizeFolderName("../../../etc")
 * // Throws: Error("Invalid package name (path traversal detected): ../../../etc")
 * ```
 */
export function sanitizeFolderName(name: string): string {
  // Check for empty or non-string input
  if (!name || typeof name !== "string") {
    throw new Error("Package name cannot be empty");
  }

  // Decode URL encoding to catch encoded attacks
  // e.g., "%2e%2e" is ".." URL-encoded
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // If decoding fails, use original (might be invalid encoding)
  }

  // Check for null byte injection
  // Null bytes are never valid in package names
  if (decoded.includes("\0")) {
    throw new Error("Invalid package name: contains null bytes");
  }

  // Extract just the package name from scoped packages
  // "@cpm/typescript-rules" → "typescript-rules"
  // "my-package" → "my-package"
  let sanitized = decoded.includes("/")
    ? decoded.split("/").pop() || decoded // Get part after "/"
    : decoded.replace(/^@/, ""); // Remove leading @ if no scope

  // Remove path traversal sequences (both encoded and decoded)
  sanitized = sanitized.replace(/\.\./g, ""); // Remove ".."
  sanitized = sanitized.replace(/%2e%2e/gi, ""); // Remove URL-encoded ".."
  sanitized = sanitized.replace(/%2f/gi, ""); // Remove URL-encoded "/"
  sanitized = sanitized.replace(/%5c/gi, ""); // Remove URL-encoded "\"

  // Remove dangerous file system characters
  sanitized = sanitized.replace(/[<>:"|?*\\]/g, "");

  // Verify we have a valid result
  // Empty result or hidden folder (starting with .) are not allowed
  if (!sanitized || sanitized.startsWith(".")) {
    throw new Error(`Invalid package name: ${name}`);
  }

  // Normalize the path and check for any remaining traversal
  // path.normalize resolves things like "foo/../bar" to "bar"
  const normalized = path.normalize(sanitized);

  // If normalization changed the path or ".." still exists, it's suspicious
  if (normalized !== sanitized || normalized.includes("..")) {
    throw new Error(`Invalid package name (path traversal detected): ${name}`);
  }

  // Final verification: join with a test path and make sure it doesn't escape
  // This catches any edge cases we might have missed
  const testPath = path.join("/test", sanitized);
  const resolved = path.resolve(testPath);

  // If the resolved path doesn't start with "/test/", we've escaped
  if (!resolved.startsWith("/test/")) {
    throw new Error(`Invalid package name (path traversal detected): ${name}`);
  }

  // All checks passed - return the sanitized folder name
  return sanitized;
}
