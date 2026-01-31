import got from 'got';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { RegistryPackage, PackageType, PackageManifest } from '../types.js';
import { resolvePackageType } from '../types.js';

// Registry configuration (configurable via env)
const DEFAULT_REGISTRY_URL = process.env.CPM_REGISTRY_URL || 'https://raw.githubusercontent.com/cpmai-dev/packages/main/registry.json';
const CACHE_DIR = path.join(os.homedir(), '.cpm', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'registry.json');
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface RegistryData {
  version: number;
  updated: string;
  packages: RegistryPackage[];
}

export interface SearchOptions {
  query?: string;
  type?: PackageType;
  limit?: number;
  offset?: number;
  sort?: 'downloads' | 'stars' | 'recent' | 'name';
}

export interface SearchResult {
  packages: RegistryPackage[];
  total: number;
}

/**
 * Registry client for fetching and searching packages
 */
export class Registry {
  private registryUrl: string;
  private cache: RegistryData | null = null;
  private cacheTimestamp: number = 0;

  constructor(registryUrl: string = DEFAULT_REGISTRY_URL) {
    this.registryUrl = registryUrl;
  }

  /**
   * Fetch the registry data (with caching)
   */
  async fetch(forceRefresh: boolean = false): Promise<RegistryData> {
    // Check memory cache first
    if (!forceRefresh && this.cache && Date.now() - this.cacheTimestamp < CACHE_TTL) {
      return this.cache;
    }

    // Check file cache
    if (!forceRefresh) {
      try {
        await fs.ensureDir(CACHE_DIR);
        if (await fs.pathExists(CACHE_FILE)) {
          const stat = await fs.stat(CACHE_FILE);
          if (Date.now() - stat.mtimeMs < CACHE_TTL) {
            const cached = await fs.readJson(CACHE_FILE);
            this.cache = cached;
            this.cacheTimestamp = Date.now();
            return cached;
          }
        }
      } catch {
        // Cache read failed, continue to fetch
      }
    }

    // Fetch from registry
    try {
      const response = await got(this.registryUrl, {
        timeout: { request: 10000 },
        responseType: 'json',
      });

      const data = response.body as RegistryData;

      // Update caches
      this.cache = data;
      this.cacheTimestamp = Date.now();

      // Write to file cache
      try {
        await fs.ensureDir(CACHE_DIR);
        await fs.writeJson(CACHE_FILE, data, { spaces: 2 });
      } catch {
        // Cache write failed, not critical
      }

      return data;
    } catch (error) {
      // If fetch fails and we have stale cache, use it
      if (this.cache) {
        return this.cache;
      }

      // Try to load stale file cache
      try {
        if (await fs.pathExists(CACHE_FILE)) {
          const cached = await fs.readJson(CACHE_FILE);
          this.cache = cached;
          return cached;
        }
      } catch {
        // Stale cache also failed
      }

      // Return built-in fallback packages
      return this.getFallbackRegistry();
    }
  }

  /**
   * Search for packages
   */
  async search(options: SearchOptions = {}): Promise<SearchResult> {
    const data = await this.fetch();
    let packages = [...data.packages];

    // Filter by query
    if (options.query) {
      const query = options.query.toLowerCase();
      packages = packages.filter(pkg =>
        pkg.name.toLowerCase().includes(query) ||
        pkg.description.toLowerCase().includes(query) ||
        (pkg.keywords?.some(k => k.toLowerCase().includes(query)))
      );
    }

    // Filter by type
    if (options.type) {
      packages = packages.filter(pkg => {
        try {
          return resolvePackageType(pkg) === options.type;
        } catch {
          return false;
        }
      });
    }

    // Sort
    const sort = options.sort || 'downloads';
    packages.sort((a, b) => {
      switch (sort) {
        case 'downloads':
          return b.downloads - a.downloads;
        case 'stars':
          return (b.stars ?? 0) - (a.stars ?? 0);
        case 'recent':
          return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    const total = packages.length;

    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 10;
    packages = packages.slice(offset, offset + limit);

    return { packages, total };
  }

  /**
   * Get a specific package by name
   */
  async getPackage(name: string): Promise<RegistryPackage | null> {
    const data = await this.fetch();
    return data.packages.find(pkg => pkg.name === name) || null;
  }

  /**
   * Get package manifest from GitHub
   */
  async getManifest(pkg: RegistryPackage): Promise<PackageManifest | null> {
    if (!pkg.repository) {
      return null;
    }

    try {
      // Convert GitHub URL to raw content URL
      const repoUrl = pkg.repository.replace('github.com', 'raw.githubusercontent.com');
      const manifestUrl = `${repoUrl}/main/cpm.yaml`;

      const response = await got(manifestUrl, {
        timeout: { request: 10000 },
      });

      // Parse YAML (need to import yaml)
      const yaml = await import('yaml');
      return yaml.parse(response.body) as PackageManifest;
    } catch {
      return null;
    }
  }

  /**
   * Fallback registry data when network is unavailable
   */
  private getFallbackRegistry(): RegistryData {
    return {
      version: 1,
      updated: new Date().toISOString(),
      packages: [
        {
          name: '@cpm/nextjs-rules',
          version: '1.0.0',
          description: 'Next.js 14+ App Router conventions and best practices for Claude Code',
          type: 'rules',
          author: 'cpm',
          downloads: 1250,
          stars: 89,
          verified: true,
                    repository: 'https://github.com/cpm-ai/nextjs-rules',
          tarball: 'https://github.com/cpm-ai/nextjs-rules/releases/download/v1.0.0/package.tar.gz',
          keywords: ['nextjs', 'react', 'typescript', 'app-router'],
        },
        {
          name: '@cpm/typescript-strict',
          version: '1.0.0',
          description: 'TypeScript strict mode best practices and conventions',
          type: 'rules',
          author: 'cpm',
          downloads: 980,
          stars: 67,
          verified: true,
                    repository: 'https://github.com/cpm-ai/typescript-strict',
          tarball: 'https://github.com/cpm-ai/typescript-strict/releases/download/v1.0.0/package.tar.gz',
          keywords: ['typescript', 'strict', 'types'],
        },
        {
          name: '@cpm/react-patterns',
          version: '1.0.0',
          description: 'React component patterns and best practices',
          type: 'rules',
          author: 'cpm',
          downloads: 875,
          stars: 54,
          verified: true,
                    repository: 'https://github.com/cpm-ai/react-patterns',
          tarball: 'https://github.com/cpm-ai/react-patterns/releases/download/v1.0.0/package.tar.gz',
          keywords: ['react', 'components', 'hooks', 'patterns'],
        },
        {
          name: '@cpm/code-review',
          version: '1.0.0',
          description: 'Automated code review skill for Claude Code',
          type: 'skill',
          author: 'cpm',
          downloads: 2100,
          stars: 156,
          verified: true,
                    repository: 'https://github.com/cpm-ai/code-review',
          tarball: 'https://github.com/cpm-ai/code-review/releases/download/v1.0.0/package.tar.gz',
          keywords: ['code-review', 'quality', 'skill'],
        },
        {
          name: '@cpm/git-commit',
          version: '1.0.0',
          description: 'Smart commit message generation skill',
          type: 'skill',
          author: 'cpm',
          downloads: 1800,
          stars: 112,
          verified: true,
                    repository: 'https://github.com/cpm-ai/git-commit',
          tarball: 'https://github.com/cpm-ai/git-commit/releases/download/v1.0.0/package.tar.gz',
          keywords: ['git', 'commit', 'messages', 'skill'],
        },
        {
          name: '@cpm/api-design',
          version: '1.0.0',
          description: 'REST and GraphQL API design conventions',
          type: 'rules',
          author: 'cpm',
          downloads: 650,
          stars: 43,
          verified: true,
                    repository: 'https://github.com/cpm-ai/api-design',
          tarball: 'https://github.com/cpm-ai/api-design/releases/download/v1.0.0/package.tar.gz',
          keywords: ['api', 'rest', 'graphql', 'design'],
        },
        {
          name: '@cpm/testing-patterns',
          version: '1.0.0',
          description: 'Testing best practices for JavaScript/TypeScript projects',
          type: 'rules',
          author: 'cpm',
          downloads: 720,
          stars: 51,
          verified: true,
                    repository: 'https://github.com/cpm-ai/testing-patterns',
          tarball: 'https://github.com/cpm-ai/testing-patterns/releases/download/v1.0.0/package.tar.gz',
          keywords: ['testing', 'jest', 'vitest', 'patterns'],
        },
        {
          name: '@cpm/refactor',
          version: '1.0.0',
          description: 'Code refactoring assistant skill',
          type: 'skill',
          author: 'cpm',
          downloads: 1450,
          stars: 98,
          verified: true,
                    repository: 'https://github.com/cpm-ai/refactor',
          tarball: 'https://github.com/cpm-ai/refactor/releases/download/v1.0.0/package.tar.gz',
          keywords: ['refactor', 'clean-code', 'skill'],
        },
        {
          name: '@cpm/explain',
          version: '1.0.0',
          description: 'Code explanation and documentation skill',
          type: 'skill',
          author: 'cpm',
          downloads: 1320,
          stars: 87,
          verified: true,
                    repository: 'https://github.com/cpm-ai/explain',
          tarball: 'https://github.com/cpm-ai/explain/releases/download/v1.0.0/package.tar.gz',
          keywords: ['explain', 'documentation', 'skill'],
        },
        {
          name: '@cpm/github-mcp',
          version: '1.0.0',
          description: 'GitHub API integration MCP server for Claude Code',
          type: 'mcp',
          author: 'cpm',
          downloads: 890,
          stars: 72,
          verified: true,
                    repository: 'https://github.com/cpm-ai/github-mcp',
          tarball: 'https://github.com/cpm-ai/github-mcp/releases/download/v1.0.0/package.tar.gz',
          keywords: ['github', 'mcp', 'api', 'integration'],
        },
      ],
    };
  }
}

// Default registry instance
export const registry = new Registry();
