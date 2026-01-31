/**
 * MCP Configuration Security Validator
 *
 * This module provides security validation for MCP (Model Context Protocol)
 * server configurations. MCP servers can execute arbitrary commands on the
 * user's system, so we need to carefully validate configurations to prevent:
 *
 * - Command injection attacks
 * - Execution of unauthorized programs
 * - Shell metacharacter exploitation
 *
 * Security is enforced through:
 * 1. Command allowlist - only specific, safe commands are allowed
 * 2. Argument blocklist - dangerous patterns in arguments are rejected
 *
 * @see https://owasp.org/www-community/attacks/Command_Injection
 */

import path from "path";
import {
  ALLOWED_MCP_COMMANDS,
  BLOCKED_MCP_ARG_PATTERNS,
} from "../constants.js";
import type { ValidationResult } from "../types.js";

/**
 * MCP configuration structure.
 *
 * This interface defines what an MCP server configuration looks like.
 * It's used to type-check configurations before validation.
 *
 * @example
 * ```typescript
 * const config: McpConfig = {
 *   transport: "stdio",
 *   command: "npx",
 *   args: ["-y", "@supabase/mcp"],
 *   env: { "SUPABASE_URL": "https://..." }
 * };
 * ```
 */
export interface McpConfig {
  /**
   * Transport protocol for communication with the MCP server.
   * - "stdio": Standard input/output (most common)
   * - "http": HTTP-based transport
   */
  transport?: "stdio" | "http";

  /**
   * The command to execute (e.g., "npx", "node", "python").
   * This MUST be in the allowlist to be accepted.
   */
  command?: string;

  /**
   * Arguments to pass to the command.
   * These are checked against blocked patterns for safety.
   */
  args?: string[];

  /**
   * Environment variables to set for the command.
   * Used for API keys, configuration, etc.
   */
  env?: Record<string, string>;
}

/**
 * Check if a command is in the allowed list.
 *
 * This is a type guard that also verifies the command is safe.
 * We only allow specific, well-known commands that are commonly
 * used for running Node.js, Python, and other package runners.
 *
 * The check uses the basename to handle absolute paths like
 * "/usr/bin/node" - we only care about the actual command name.
 *
 * @param command - The command string to check
 * @returns true if the command is allowed, false otherwise
 *
 * @example
 * ```typescript
 * isAllowedCommand("npx")           // true
 * isAllowedCommand("node")          // true
 * isAllowedCommand("/bin/bash")     // false - bash not allowed
 * isAllowedCommand("rm")            // false - destructive command
 * ```
 */
function isAllowedCommand(
  command: string,
): command is (typeof ALLOWED_MCP_COMMANDS)[number] {
  // Extract just the command name from potential absolute paths
  // e.g., "/usr/local/bin/node" becomes "node"
  const baseCommand = path.basename(command);

  // Check if it's in our allowlist
  return ALLOWED_MCP_COMMANDS.includes(
    baseCommand as (typeof ALLOWED_MCP_COMMANDS)[number],
  );
}

/**
 * Check if arguments contain any blocked patterns.
 *
 * This scans the combined argument string for dangerous patterns
 * that could be used for command injection or other attacks.
 *
 * Blocked patterns include:
 * - --eval, -e, -c: Code execution flags
 * - curl, wget: Network commands (could exfiltrate data)
 * - rm, sudo, chmod, chown: Destructive/privilege commands
 * - Shell metacharacters (|, &, ;, `, $): Command chaining
 *
 * @param args - Array of argument strings
 * @returns The matched pattern if found, null if safe
 *
 * @example
 * ```typescript
 * containsBlockedPattern(["--foo", "bar"])      // null (safe)
 * containsBlockedPattern(["--eval", "code"])    // RegExp (blocked)
 * containsBlockedPattern(["arg1", "; rm -rf"]) // RegExp (blocked)
 * ```
 */
function containsBlockedPattern(args: string[]): RegExp | null {
  // Join all arguments into a single string for pattern matching
  // This catches patterns that might span multiple arguments
  const argsString = args.join(" ");

  // Check each blocked pattern
  for (const pattern of BLOCKED_MCP_ARG_PATTERNS) {
    if (pattern.test(argsString)) {
      // Return the pattern that matched (for error message)
      return pattern;
    }
  }

  // No blocked patterns found - arguments are safe
  return null;
}

/**
 * Validate an MCP configuration for security.
 *
 * This is the main validation function. It checks:
 * 1. That a command is provided
 * 2. That the command is in the allowlist
 * 3. That arguments don't contain blocked patterns
 *
 * Use this before installing any MCP package to ensure
 * the configuration is safe to execute.
 *
 * @param mcp - The MCP configuration to validate
 * @returns ValidationResult with valid=true if safe, or valid=false with error message
 *
 * @example
 * ```typescript
 * const result = validateMcpConfig({
 *   command: "npx",
 *   args: ["-y", "@supabase/mcp"]
 * });
 *
 * if (result.valid) {
 *   // Safe to install
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateMcpConfig(
  mcp: McpConfig | undefined,
): ValidationResult {
  // Check that a command is provided
  if (!mcp?.command) {
    return { valid: false, error: "MCP command is required" };
  }

  // Get the base command name for the error message
  const baseCommand = path.basename(mcp.command);

  // SECURITY CHECK 1: Verify command is in the allowlist
  if (!isAllowedCommand(mcp.command)) {
    return {
      valid: false,
      error: `MCP command '${baseCommand}' is not allowed. Allowed: ${ALLOWED_MCP_COMMANDS.join(", ")}`,
    };
  }

  // SECURITY CHECK 2: Scan arguments for dangerous patterns
  if (mcp.args) {
    const blockedPattern = containsBlockedPattern(mcp.args);

    if (blockedPattern) {
      return {
        valid: false,
        error: `MCP arguments contain blocked pattern: ${blockedPattern.source}`,
      };
    }
  }

  // All checks passed - configuration is safe
  return { valid: true };
}

/**
 * Get the list of allowed MCP commands.
 *
 * This is useful for displaying help messages or documentation
 * to users about what commands are permitted.
 *
 * @returns Readonly array of allowed command names
 *
 * @example
 * ```typescript
 * const allowed = getAllowedCommands();
 * console.log("Allowed commands:", allowed.join(", "));
 * // Output: "Allowed commands: npx, node, python, python3, deno, bun, uvx"
 * ```
 */
export function getAllowedCommands(): readonly string[] {
  return ALLOWED_MCP_COMMANDS;
}
