/**
 * Application-Wide Constants
 *
 * This module centralizes all configuration constants used throughout CPM.
 * By keeping constants in one place, we ensure:
 *
 * - Easy modification of values (change once, apply everywhere)
 * - Consistency across the codebase
 * - Clear documentation of configuration values
 * - Type safety with TypeScript's const assertions
 *
 * All constants use `as const` to create literal types, enabling
 * TypeScript to provide better type checking and autocomplete.
 */

// ============================================================================
// Network Configuration
// ============================================================================

/**
 * Request timeout values in milliseconds.
 *
 * These timeouts prevent the CLI from hanging indefinitely
 * when network requests fail or are slow.
 *
 * @property MANIFEST_FETCH - Timeout for fetching cpm.yaml from GitHub (5s)
 *                            Short because it's a single small file
 * @property TARBALL_DOWNLOAD - Timeout for downloading package tarballs (30s)
 *                              Longer because tarballs can be large
 * @property REGISTRY_FETCH - Timeout for fetching the package registry (10s)
 *                            Medium timeout for the registry JSON
 */
export const TIMEOUTS = {
  MANIFEST_FETCH: 5000, // 5 seconds - quick manifest lookups
  TARBALL_DOWNLOAD: 30000, // 30 seconds - allow time for large downloads
  REGISTRY_FETCH: 10000, // 10 seconds - registry can be slow sometimes
} as const;

// ============================================================================
// Path Configuration
// ============================================================================

/**
 * Directory and path constants.
 *
 * These define where CPM stores its files and caches.
 * All paths are relative to the user's home directory.
 *
 * @property RULES_DIR - Subdirectory for rules packages ("rules")
 * @property SKILLS_DIR - Subdirectory for skill packages ("skills")
 * @property CACHE_DIR - Directory for caching registry data (".cpm/cache")
 * @property CACHE_FILE - Filename for the cached registry ("registry.json")
 */
export const PATHS = {
  RULES_DIR: "rules", // ~/.claude/rules/
  SKILLS_DIR: "skills", // ~/.claude/skills/
  CACHE_DIR: ".cpm/cache", // ~/.cpm/cache/
  CACHE_FILE: "registry.json", // ~/.cpm/cache/registry.json
} as const;

// ============================================================================
// Validation Limits
// ============================================================================

/**
 * Validation limits and thresholds.
 *
 * These values define the boundaries for valid input
 * and control caching behavior.
 *
 * @property MAX_PACKAGE_NAME_LENGTH - Maximum length for package names (npm standard: 214)
 * @property CACHE_TTL_MS - How long to cache the registry before refreshing (5 minutes)
 */
export const LIMITS = {
  MAX_PACKAGE_NAME_LENGTH: 214, // npm standard maximum
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes in milliseconds
} as const;

// ============================================================================
// Package Types
// ============================================================================

/**
 * Valid package types supported by CPM.
 *
 * Each type has different installation behavior:
 * - rules: Coding guidelines installed to ~/.claude/rules/
 * - mcp: Model Context Protocol servers configured in ~/.claude.json
 * - skill: Slash commands installed to ~/.claude/skills/
 * - agent: AI agent definitions
 * - hook: Git or lifecycle hooks
 * - workflow: Multi-step workflows
 * - template: Project templates
 * - bundle: Collections of other packages
 *
 * Using `as const` creates a tuple type that TypeScript can use
 * for exhaustive checking and type inference.
 */
export const PACKAGE_TYPES = [
  "rules", // Coding guidelines and best practices
  "mcp", // Model Context Protocol servers
  "skill", // Slash commands for Claude Code
  "agent", // AI agent definitions
  "hook", // Git or lifecycle hooks
  "workflow", // Multi-step workflows
  "template", // Project templates
  "bundle", // Collections of packages
] as const;

// ============================================================================
// Search Configuration
// ============================================================================

/**
 * Valid sort options for package search.
 *
 * These define how search results can be ordered:
 * - downloads: Sort by download count (most popular first)
 * - stars: Sort by star count (most liked first)
 * - recent: Sort by publish date (newest first)
 * - name: Sort alphabetically by name
 */
export const SEARCH_SORT_OPTIONS = [
  "downloads", // Most downloaded first
  "stars", // Most starred first
  "recent", // Most recently published first
  "name", // Alphabetical order
] as const;

// ============================================================================
// Platform Configuration
// ============================================================================

/**
 * Valid platforms for package installation.
 *
 * Currently, CPM only supports Claude Code, but this array
 * allows for future expansion to other platforms.
 */
export const VALID_PLATFORMS = [
  "claude-code", // Currently the only supported platform
] as const;

// ============================================================================
// Security: MCP Command Allowlist
// ============================================================================

/**
 * Allowed commands for MCP servers (security allowlist).
 *
 * MCP servers can execute arbitrary commands, so we restrict
 * which commands are allowed to prevent security issues.
 *
 * Only these package runners and interpreters are permitted:
 * - npx: Node Package eXecute (run npm packages)
 * - node: Node.js runtime
 * - python/python3: Python interpreters
 * - deno: Deno runtime (secure JavaScript/TypeScript)
 * - bun: Bun runtime (fast JavaScript runtime)
 * - uvx: Python package runner (like npx for Python)
 *
 * Commands NOT in this list (like bash, sh, rm, etc.) are blocked.
 */
export const ALLOWED_MCP_COMMANDS = [
  "npx", // Node package executor
  "node", // Node.js runtime
  "python", // Python 2.x interpreter
  "python3", // Python 3.x interpreter
  "deno", // Deno runtime
  "bun", // Bun runtime
  "uvx", // Python package runner
] as const;

// ============================================================================
// Security: MCP Argument Blocklist
// ============================================================================

/**
 * Blocked patterns in MCP arguments (security blocklist).
 *
 * Even with allowed commands, certain arguments could be dangerous.
 * These regex patterns detect and block:
 *
 * Code execution flags:
 * - --eval, -e, -c: Inline code execution
 *
 * Dangerous commands in arguments:
 * - curl, wget: Could exfiltrate data
 * - rm: Could delete files
 * - sudo: Could escalate privileges
 * - chmod, chown: Could modify permissions
 *
 * Shell metacharacters:
 * - | ; & ` $: Could chain commands or inject code
 *
 * @example
 * // These would be blocked:
 * args: ["--eval", "malicious code"]
 * args: ["; rm -rf /"]
 * args: ["$(cat /etc/passwd)"]
 */
export const BLOCKED_MCP_ARG_PATTERNS = [
  /--eval/i, // Node.js eval flag
  /-e\s/, // Short eval flag with space
  /-c\s/, // Command flag with space
  /\bcurl\b/i, // curl command (data exfiltration)
  /\bwget\b/i, // wget command (data exfiltration)
  /\brm\s/i, // rm command (file deletion)
  /\bsudo\b/i, // sudo command (privilege escalation)
  /\bchmod\b/i, // chmod command (permission changes)
  /\bchown\b/i, // chown command (ownership changes)
  /[|;&`$]/, // Shell metacharacters (command chaining/injection)
] as const;
