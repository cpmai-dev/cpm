export type PackageType = 'rules' | 'mcp' | 'skill' | 'agent' | 'hook' | 'workflow' | 'template' | 'bundle';

export type Platform = 'claude-code';

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

  // Universal content
  universal?: {
    rules?: string;
    prompt?: string;
    globs?: string[];
  };

  // Platform-specific
  platforms?: {
    cursor?: PlatformConfig;
    'claude-code'?: PlatformConfig;
    windsurf?: PlatformConfig;
    continue?: PlatformConfig;
  };

  // MCP server config
  mcp?: {
    transport?: 'stdio' | 'http';
    command?: string;
    args?: string[];
    env?: Record<string, string>;
  };

  // Skill config (Claude Code)
  skill?: {
    command?: string;
    description?: string;
  };
}

export interface PlatformConfig {
  rules_path?: string;
  format?: 'markdown' | 'mdc' | 'yaml';
  settings?: Record<string, unknown>;
}

export interface InstalledPackage {
  name: string;
  version: string;
  type: PackageType;
  platforms: Platform[];
  installedAt: string;
  path: string;
}

export interface RegistryPackage {
  name: string;
  version: string;
  description: string;
  type: PackageType;
  author: string;
  downloads: number;
  path?: string;
  stars?: number;
  verified?: boolean;
  official?: boolean;
  repository?: string;
  tarball?: string;
  keywords?: string[];
  publishedAt?: string;
  license?: string;
}

export interface SearchResult {
  packages: RegistryPackage[];
  total: number;
}
