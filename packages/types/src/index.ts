/**
 * @cpm/types - Shared TypeScript types for CPM
 */

// Package types
export type PackageType = 'rules' | 'mcp' | 'skill' | 'agent' | 'hook' | 'workflow' | 'template' | 'bundle';

// Supported platforms
export type Platform = 'cursor' | 'claude-code' | 'windsurf' | 'continue';

/**
 * Package manifest (cpm.yaml)
 */
export interface PackageManifest {
  name: string;
  version: string;
  description: string;
  type: PackageType;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  repository?: string;
  license?: string;
  keywords?: string[];

  // Universal content (works across platforms)
  universal?: {
    rules?: string;
    prompt?: string;
    globs?: string[];
  };

  // Platform-specific configuration
  platforms?: {
    cursor?: PlatformConfig;
    'claude-code'?: PlatformConfig;
    windsurf?: PlatformConfig;
    continue?: PlatformConfig;
  };

  // MCP server configuration
  mcp?: MCPConfig;

  // Skill configuration (Claude Code)
  skill?: SkillConfig;
}

export interface PlatformConfig {
  rules_path?: string;
  format?: 'markdown' | 'mdc' | 'yaml';
  settings?: Record<string, unknown>;
}

export interface MCPConfig {
  transport?: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface SkillConfig {
  command?: string;
  description?: string;
}

/**
 * Installed package record (stored in cpm-lock.json)
 */
export interface InstalledPackage {
  name: string;
  version: string;
  type: PackageType;
  platforms: Platform[];
  installedAt: string;
  path: string;
  hash?: string;
}

/**
 * Package in the registry
 */
export interface RegistryPackage {
  name: string;
  version: string;
  description: string;
  type: PackageType;
  author: string;
  downloads: number;
  stars: number;
  verified: boolean;
  official: boolean;
  repository?: string;
  tarball?: string;
  keywords?: string[];
  publishedAt?: string;
  license?: string;
}

/**
 * Search results from registry
 */
export interface SearchResult {
  packages: RegistryPackage[];
  total: number;
}

/**
 * Registry data structure
 */
export interface RegistryData {
  version: number;
  generated: string;
  packages: RegistryPackage[];
}

/**
 * Search options
 */
export interface SearchOptions {
  query?: string;
  type?: PackageType;
  limit?: number;
  offset?: number;
  sort?: 'downloads' | 'stars' | 'recent' | 'name';
}

/**
 * Installation result
 */
export interface InstallResult {
  success: boolean;
  platform: Platform;
  filesWritten: string[];
  error?: string;
}

/**
 * Download result
 */
export interface DownloadResult {
  success: boolean;
  packagePath: string;
  manifest: PackageManifest;
  error?: string;
}
