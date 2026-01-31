export type PackageType =
  | "rules"
  | "mcp"
  | "skill"
  | "agent"
  | "hook"
  | "workflow"
  | "template"
  | "bundle";

export type Platform = "claude-code";

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

  // MCP server config
  mcp?: {
    transport?: "stdio" | "http";
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

export interface RegistryPackage {
  name: string;
  version: string;
  description: string;
  type?: PackageType; // Optional - can be derived from path
  author: string;
  downloads?: number; // Optional - defaults to 0
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
 * Path format: {type}/{author}/{package}
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

/**
 * Package metadata stored in each installed package folder (.cpm.json)
 */
export interface PackageMetadata {
  name: string;
  version: string;
  type: string;
  installedAt: string;
}
