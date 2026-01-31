/**
 * Security Module Exports
 *
 * This is the main entry point for all security-related utilities in CPM.
 * It provides centralized access to:
 *
 * - MCP Validation: Ensures MCP server configurations are safe to execute
 * - File Sanitization: Prevents malicious file names from being processed
 * - Path Validation: Ensures file operations stay within allowed directories
 *
 * Security is a critical concern for CPM because:
 * 1. Packages are downloaded from the internet
 * 2. MCP packages can execute commands on the user's system
 * 3. File operations could potentially affect system files
 *
 * By centralizing security functions in this module, we ensure:
 * - Consistent security checks across the codebase
 * - Easy auditing of security-related code
 * - Single source of truth for security policies
 *
 * @example
 * ```typescript
 * import {
 *   validateMcpConfig,
 *   sanitizeFileName,
 *   isPathWithinDirectory
 * } from "./security";
 *
 * // Validate an MCP configuration before installing
 * const result = validateMcpConfig(manifest.mcp);
 * if (!result.valid) {
 *   throw new Error(`Security check failed: ${result.error}`);
 * }
 *
 * // Sanitize a filename before copying
 * const sanitized = sanitizeFileName("user-provided.md");
 * if (!sanitized.valid) {
 *   console.warn(`Skipping unsafe file: ${sanitized.error}`);
 * }
 *
 * // Verify a path is within the allowed directory
 * if (!isPathWithinDirectory(destPath, allowedDir)) {
 *   throw new Error("Path traversal detected!");
 * }
 * ```
 */

// ============================================================================
// MCP Validation Exports
// ============================================================================

/**
 * Functions for validating MCP (Model Context Protocol) server configurations.
 *
 * - validateMcpConfig: Main validation function - checks command and arguments
 * - getAllowedCommands: Returns the list of allowed MCP commands for display
 */
export { validateMcpConfig, getAllowedCommands } from "./mcp-validator.js";

/**
 * Type definition for MCP configuration objects.
 * Use this to type-check MCP configs before validation.
 */
export type { McpConfig } from "./mcp-validator.js";

// ============================================================================
// File Sanitization Exports
// ============================================================================

/**
 * Functions for sanitizing file and folder names.
 *
 * - sanitizeFileName: Validates and cleans individual file names
 * - sanitizeFolderName: Extracts and sanitizes folder names from package names
 */
export { sanitizeFileName, sanitizeFolderName } from "./file-sanitizer.js";

// ============================================================================
// Path Validation Exports
// ============================================================================

/**
 * Functions for validating file paths.
 *
 * - isPathWithinDirectory: Checks if a path is within an allowed directory
 * - resolveSecurePath: Resolves a path and validates it in one step
 */
export { isPathWithinDirectory, resolveSecurePath } from "./path-validator.js";
