/**
 * Path Validation Utilities
 *
 * This module provides functions to validate file paths and prevent
 * path traversal attacks during file operations.
 *
 * Path traversal (also known as directory traversal) is a security
 * vulnerability that allows attackers to access files outside of
 * the intended directory by using special path sequences like:
 * - ".." (parent directory)
 * - Absolute paths starting with "/"
 * - Symbolic links that point outside the directory
 *
 * These functions provide the last line of defense after filename
 * sanitization, ensuring that the final resolved paths stay within
 * the allowed directories.
 *
 * @see https://owasp.org/www-community/attacks/Path_Traversal
 */

import path from "path";

/**
 * Verify that a file path is within an allowed directory.
 *
 * This function resolves both paths to their absolute forms and
 * checks that the file path starts with the directory path.
 *
 * This check is critical for preventing path traversal attacks,
 * as it catches any escape attempts regardless of how they're
 * constructed (via "..", symlinks, or other means).
 *
 * @param filePath - The file path to check
 * @param directory - The directory that should contain the file
 * @returns true if filePath is within directory, false otherwise
 *
 * @example
 * ```typescript
 * const rulesDir = "/Users/dev/.claude/rules/my-package";
 *
 * // Valid paths within the directory
 * isPathWithinDirectory("/Users/dev/.claude/rules/my-package/RULES.md", rulesDir);
 * // Returns: true
 *
 * // Path that escapes the directory
 * isPathWithinDirectory("/Users/dev/.claude/rules/my-package/../../../etc/passwd", rulesDir);
 * // Returns: false (resolves to /Users/dev/etc/passwd)
 *
 * // Exact directory match is allowed
 * isPathWithinDirectory("/Users/dev/.claude/rules/my-package", rulesDir);
 * // Returns: true
 * ```
 */
export function isPathWithinDirectory(
  filePath: string,
  directory: string,
): boolean {
  // Resolve both paths to absolute paths
  // This normalizes "..", ".", symlinks, and relative paths
  // e.g., "/foo/bar/../baz" becomes "/foo/baz"
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(directory);

  // Check if the file path starts with the directory path
  // We add path.sep (/ or \) to prevent partial matches
  // e.g., "/foo/bar" shouldn't match directory "/foo/ba"
  return (
    resolvedPath.startsWith(resolvedDir + path.sep) ||
    resolvedPath === resolvedDir // Allow exact match of the directory itself
  );
}

/**
 * Validate and resolve a path, ensuring it stays within bounds.
 *
 * This is a convenience function that combines path resolution
 * with security validation. It takes a base path and a relative
 * path, resolves them together, and returns the result only if
 * it's within the base path.
 *
 * Use this when you have user-provided or external paths that
 * need to be safely resolved within a specific directory.
 *
 * @param basePath - The base directory that should contain the result
 * @param relativePath - The relative path to join with the base
 * @returns The resolved absolute path if safe, null if it would escape
 *
 * @example
 * ```typescript
 * const baseDir = "/Users/dev/.claude/rules";
 *
 * // Safe relative path
 * resolveSecurePath(baseDir, "my-package/RULES.md");
 * // Returns: "/Users/dev/.claude/rules/my-package/RULES.md"
 *
 * // Path traversal attempt
 * resolveSecurePath(baseDir, "../../../etc/passwd");
 * // Returns: null (would escape to /Users/etc/passwd)
 *
 * // Absolute path that escapes
 * resolveSecurePath(baseDir, "/etc/passwd");
 * // Returns: null
 * ```
 */
export function resolveSecurePath(
  basePath: string,
  relativePath: string,
): string | null {
  // Resolve the paths together
  // path.resolve handles "..", "/", and normalizes the result
  const resolved = path.resolve(basePath, relativePath);

  // Check if the resolved path is within the allowed directory
  if (!isPathWithinDirectory(resolved, basePath)) {
    // Path would escape the allowed directory - reject it
    return null;
  }

  // Path is safe - return the resolved absolute path
  return resolved;
}
