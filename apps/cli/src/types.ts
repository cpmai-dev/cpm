/**
 * CPM CLI Types
 * Implements discriminated unions for type-safe package handling
 */

import {
  PACKAGE_TYPES,
  SEARCH_SORT_OPTIONS,
  VALID_PLATFORMS,
} from "./constants.js";

// ============================================================================
// Core Type Definitions
// ============================================================================

export type PackageType = (typeof PACKAGE_TYPES)[number];
export type Platform = (typeof VALID_PLATFORMS)[number];
export type SearchSort = (typeof SEARCH_SORT_OPTIONS)[number];

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a string is a valid PackageType
 */
export function isPackageType(value: string): value is PackageType {
  return PACKAGE_TYPES.includes(value as PackageType);
}

/**
 * Check if a string is a valid Platform
 */
export function isValidPlatform(value: string): value is Platform {
  return VALID_PLATFORMS.includes(value as Platform);
}

/**
 * Check if a string is a valid SearchSort option
 */
export function isSearchSort(value: string): value is SearchSort {
  return SEARCH_SORT_OPTIONS.includes(value as SearchSort);
}

// ============================================================================
// Author Type
// ============================================================================

export interface Author {
  name: string;
  email?: string;
  url?: string;
}

// ============================================================================
// Base Manifest (shared fields)
// ============================================================================

interface BaseManifest {
  name: string;
  version: string;
  description: string;
  author?: Author;
  repository?: string;
  license?: string;
  keywords?: string[];
}

// ============================================================================
// Package-Specific Manifests (Discriminated Union)
// ============================================================================

/**
 * Rules package manifest
 */
export interface RulesManifest extends BaseManifest {
  type: "rules";
  universal?: {
    rules?: string;
    globs?: string[];
    prompt?: string;
  };
  mcp?: never;
  skill?: never;
}

/**
 * Skill package manifest
 */
export interface SkillManifest extends BaseManifest {
  type: "skill";
  skill: {
    command: string;
    description: string;
  };
  universal?: {
    prompt?: string;
    rules?: string;
    globs?: string[];
  };
  mcp?: never;
}

/**
 * MCP package manifest
 */
export interface McpManifest extends BaseManifest {
  type: "mcp";
  mcp: {
    transport?: "stdio" | "http";
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };
  universal?: never;
  skill?: never;
}

/**
 * Agent package manifest
 */
export interface AgentManifest extends BaseManifest {
  type: "agent";
  universal?: {
    rules?: string;
    prompt?: string;
    globs?: string[];
  };
  mcp?: never;
  skill?: never;
}

/**
 * Hook package manifest
 */
export interface HookManifest extends BaseManifest {
  type: "hook";
  universal?: {
    rules?: string;
    prompt?: string;
    globs?: string[];
  };
  mcp?: never;
  skill?: never;
}

/**
 * Workflow package manifest
 */
export interface WorkflowManifest extends BaseManifest {
  type: "workflow";
  universal?: {
    rules?: string;
    prompt?: string;
    globs?: string[];
  };
  mcp?: never;
  skill?: never;
}

/**
 * Template package manifest
 */
export interface TemplateManifest extends BaseManifest {
  type: "template";
  universal?: {
    rules?: string;
    prompt?: string;
    globs?: string[];
  };
  mcp?: never;
  skill?: never;
}

/**
 * Bundle package manifest
 */
export interface BundleManifest extends BaseManifest {
  type: "bundle";
  universal?: {
    rules?: string;
    prompt?: string;
    globs?: string[];
  };
  mcp?: never;
  skill?: never;
}

/**
 * Combined PackageManifest type (discriminated union)
 */
export type PackageManifest =
  | RulesManifest
  | SkillManifest
  | McpManifest
  | AgentManifest
  | HookManifest
  | WorkflowManifest
  | TemplateManifest
  | BundleManifest;

// ============================================================================
// Manifest Type Guards
// ============================================================================

/**
 * Check if manifest is a Rules manifest
 */
export function isRulesManifest(
  manifest: PackageManifest,
): manifest is RulesManifest {
  return manifest.type === "rules";
}

/**
 * Check if manifest is a Skill manifest
 */
export function isSkillManifest(
  manifest: PackageManifest,
): manifest is SkillManifest {
  return manifest.type === "skill";
}

/**
 * Check if manifest is an MCP manifest
 */
export function isMcpManifest(
  manifest: PackageManifest,
): manifest is McpManifest {
  return manifest.type === "mcp";
}

// ============================================================================
// Registry Types
// ============================================================================

export interface RegistryPackage {
  name: string;
  version: string;
  description: string;
  type?: PackageType;
  platforms?: Platform[];
  author: string;
  downloads?: number;
  path?: string;
  stars?: number;
  verified?: boolean;
  repository?: string;
  tarball?: string;
  keywords?: string[];
  publishedAt?: string;
  license?: string;
}

/**
 * Derive package type from registry path
 */
export function getTypeFromPath(path: string): PackageType | null {
  if (path.startsWith("skills/")) return "skill";
  if (path.startsWith("rules/")) return "rules";
  if (path.startsWith("mcp/")) return "mcp";
  if (path.startsWith("agents/")) return "agent";
  if (path.startsWith("hooks/")) return "hook";
  if (path.startsWith("workflows/")) return "workflow";
  if (path.startsWith("templates/")) return "template";
  if (path.startsWith("bundles/")) return "bundle";
  return null;
}

/**
 * Get resolved type from package (explicit or derived from path)
 */
export function resolvePackageType(pkg: RegistryPackage): PackageType {
  if (pkg.type) return pkg.type;
  if (pkg.path) {
    const derived = getTypeFromPath(pkg.path);
    if (derived) return derived;
  }
  throw new Error(`Cannot determine type for package: ${pkg.name}`);
}

// ============================================================================
// Metadata Types
// ============================================================================

/**
 * Package metadata stored in each installed package folder (.cpm.json)
 */
export interface PackageMetadata {
  name: string;
  version: string;
  type: PackageType;
  installedAt: string;
}

// ============================================================================
// Installed Package Types
// ============================================================================

/**
 * Information about an installed package.
 * Used by adapters (listInstalled) and commands (list, uninstall).
 */
export interface InstalledPackage {
  /** Full package name (e.g., @cpm/typescript-strict) */
  name: string;
  /** Folder name for uninstall command */
  folderName: string;
  /** Package type */
  type: PackageType;
  /** Version if available from metadata */
  version?: string;
  /** Absolute path to the package location */
  path: string;
  /** Platform this package is installed for */
  platform?: Platform;
}

// ============================================================================
// Result Types (Discriminated Unions)
// ============================================================================

/**
 * Validation result with discriminated success/failure
 */
export type ValidationResult =
  | { valid: true; sanitized?: string }
  | { valid: false; error: string };

/**
 * Download result with discriminated success/failure
 */
export type DownloadResult =
  | { success: true; manifest: PackageManifest; tempDir: string }
  | { success: false; error: string };
