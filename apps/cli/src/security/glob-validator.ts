/**
 * Glob Pattern Validator
 *
 * Validates glob patterns provided in package manifests to prevent
 * targeting sensitive files like .env, credentials, SSH keys, etc.
 *
 * Glob patterns are used in Cursor rules (.mdc) frontmatter to scope
 * when rules apply. A malicious package could target sensitive files
 * to inject rules that exfiltrate data.
 */

import type { ValidationResult } from "../types.js";

/**
 * Patterns that indicate targeting of sensitive files.
 * Each entry has a pattern (regex) and a human-readable reason.
 */
const BLOCKED_GLOB_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  reason: string;
}> = [
  // Environment and secret files
  { pattern: /\.env\b/i, reason: "targets environment/secret files" },
  { pattern: /\.secret/i, reason: "targets secret files" },
  { pattern: /credentials/i, reason: "targets credential files" },
  { pattern: /\.pem$/i, reason: "targets PEM certificate/key files" },
  { pattern: /\.key$/i, reason: "targets key files" },
  { pattern: /\.p12$/i, reason: "targets PKCS12 certificate files" },
  { pattern: /\.pfx$/i, reason: "targets PFX certificate files" },

  // SSH and GPG
  { pattern: /\.ssh\//i, reason: "targets SSH directory" },
  { pattern: /id_rsa/i, reason: "targets SSH private keys" },
  { pattern: /id_ed25519/i, reason: "targets SSH private keys" },
  { pattern: /\.gnupg\//i, reason: "targets GPG directory" },

  // Git internals
  { pattern: /\.git\//, reason: "targets git internals" },

  // Config files with potential secrets
  { pattern: /\.claude\.json$/i, reason: "targets Claude Code config" },
  { pattern: /\.npmrc$/i, reason: "targets npm config (may contain tokens)" },
  { pattern: /\.pypirc$/i, reason: "targets PyPI config (may contain tokens)" },

  // System files
  { pattern: /\/etc\//, reason: "targets system configuration" },
  { pattern: /\/passwd/, reason: "targets system password file" },
  { pattern: /\/shadow/, reason: "targets system shadow file" },

  // Path traversal in globs
  { pattern: /\.\.\//, reason: "contains path traversal" },
];

/**
 * Validate a single glob pattern for security.
 *
 * @param glob - The glob pattern to validate
 * @returns ValidationResult indicating if the pattern is safe
 */
export function validateGlob(glob: string): ValidationResult {
  if (!glob || typeof glob !== "string") {
    return { valid: false, error: "Glob pattern cannot be empty" };
  }

  // Check for null bytes
  if (glob.includes("\0")) {
    return { valid: false, error: "Glob pattern contains null bytes" };
  }

  for (const { pattern, reason } of BLOCKED_GLOB_PATTERNS) {
    if (pattern.test(glob)) {
      return {
        valid: false,
        error: `Glob pattern "${glob}" is blocked: ${reason}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate an array of glob patterns.
 *
 * @param globs - Array of glob patterns to validate
 * @returns ValidationResult indicating if all patterns are safe
 */
export function validateGlobs(globs: string[]): ValidationResult {
  for (const glob of globs) {
    const result = validateGlob(glob);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}
