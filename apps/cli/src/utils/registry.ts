/**
 * Registry client for fetching and searching packages
 * Implements Interface Segregation with focused interfaces
 */
import got from "got";
import fs from "fs-extra";
import path from "path";
import os from "os";
import type { RegistryPackage, PackageType, SearchSort } from "../types.js";
import { resolvePackageType } from "../types.js";
import { LIMITS, TIMEOUTS } from "../constants.js";

// Registry configuration
const DEFAULT_REGISTRY_URL =
  process.env.CPM_REGISTRY_URL ||
  "https://raw.githubusercontent.com/cpmai-dev/packages/main/registry.json";
const CACHE_DIR = path.join(os.homedir(), ".cpm", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "registry.json");

// ============================================================================
// Types
// ============================================================================

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
  sort?: SearchSort;
}

export interface SearchResult {
  packages: RegistryPackage[];
  total: number;
}

// ============================================================================
// Interfaces (Interface Segregation Principle)
// ============================================================================

/**
 * Interface for fetching registry data
 */
export interface RegistryFetcher {
  fetch(forceRefresh?: boolean): Promise<RegistryData>;
}

/**
 * Interface for searching packages
 */
export interface PackageSearcher {
  search(options?: SearchOptions): Promise<SearchResult>;
}

/**
 * Interface for looking up individual packages
 */
export interface PackageLookup {
  getPackage(name: string): Promise<RegistryPackage | null>;
}

// ============================================================================
// Comparators for sorting
// ============================================================================

type PackageComparator = (a: RegistryPackage, b: RegistryPackage) => number;

const comparators: Record<SearchSort, PackageComparator> = {
  downloads: (a, b) => (b.downloads ?? 0) - (a.downloads ?? 0),
  stars: (a, b) => (b.stars ?? 0) - (a.stars ?? 0),
  recent: (a, b) =>
    new Date(b.publishedAt || 0).getTime() -
    new Date(a.publishedAt || 0).getTime(),
  name: (a, b) => (a.name ?? "").localeCompare(b.name ?? ""),
};

// ============================================================================
// Registry Implementation
// ============================================================================

/**
 * Registry client for fetching and searching packages
 * Implements all segregated interfaces
 */
export class Registry
  implements RegistryFetcher, PackageSearcher, PackageLookup
{
  private readonly registryUrl: string;
  private cache: RegistryData | null = null;
  private cacheTimestamp: number = 0;

  constructor(registryUrl: string = DEFAULT_REGISTRY_URL) {
    this.registryUrl = registryUrl;
  }

  /**
   * Fetch the registry data (with caching)
   */
  async fetch(forceRefresh: boolean = false): Promise<RegistryData> {
    if (this.hasValidMemoryCache() && !forceRefresh) {
      return this.cache!;
    }

    if (!forceRefresh) {
      const fileCache = await this.loadFileCache();
      if (fileCache) {
        this.updateMemoryCache(fileCache);
        return fileCache;
      }
    }

    return this.fetchFromNetwork();
  }

  /**
   * Search for packages
   */
  async search(options: SearchOptions = {}): Promise<SearchResult> {
    const data = await this.fetch();
    let packages = [...data.packages];

    packages = this.filterByQuery(packages, options.query);
    packages = this.filterByType(packages, options.type);
    packages = this.sortPackages(packages, options.sort || "downloads");

    const total = packages.length;
    packages = this.paginate(packages, options.offset, options.limit);

    return { packages, total };
  }

  /**
   * Get a specific package by name
   */
  async getPackage(name: string): Promise<RegistryPackage | null> {
    const data = await this.fetch();
    return data.packages.find((pkg) => pkg.name === name) || null;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private hasValidMemoryCache(): boolean {
    return (
      this.cache !== null &&
      Date.now() - this.cacheTimestamp < LIMITS.CACHE_TTL_MS
    );
  }

  private updateMemoryCache(data: RegistryData): void {
    this.cache = data;
    this.cacheTimestamp = Date.now();
  }

  private async loadFileCache(): Promise<RegistryData | null> {
    try {
      await fs.ensureDir(CACHE_DIR);
      if (await fs.pathExists(CACHE_FILE)) {
        const stat = await fs.stat(CACHE_FILE);
        if (Date.now() - stat.mtimeMs < LIMITS.CACHE_TTL_MS) {
          return await fs.readJson(CACHE_FILE);
        }
      }
    } catch {
      // Cache read failed
    }
    return null;
  }

  private async saveFileCache(data: RegistryData): Promise<void> {
    try {
      await fs.ensureDir(CACHE_DIR);
      await fs.writeJson(CACHE_FILE, data, { spaces: 2 });
    } catch {
      // Cache write failed, not critical
    }
  }

  private async fetchFromNetwork(): Promise<RegistryData> {
    try {
      const response = await got(this.registryUrl, {
        timeout: { request: TIMEOUTS.REGISTRY_FETCH },
        responseType: "json",
      });

      const data = response.body as RegistryData;
      this.updateMemoryCache(data);
      await this.saveFileCache(data);

      return data;
    } catch {
      return this.handleNetworkError();
    }
  }

  private async handleNetworkError(): Promise<RegistryData> {
    if (this.cache) {
      return this.cache;
    }

    try {
      if (await fs.pathExists(CACHE_FILE)) {
        const cached = await fs.readJson(CACHE_FILE);
        this.cache = cached;
        return cached;
      }
    } catch {
      // Stale cache also failed
    }

    throw new Error(
      "Unable to fetch package registry. Please check your internet connection and try again.",
    );
  }

  private filterByQuery(
    packages: RegistryPackage[],
    query?: string,
  ): RegistryPackage[] {
    if (!query) return packages;

    const lowerQuery = query.toLowerCase();
    return packages.filter(
      (pkg) =>
        pkg.name?.toLowerCase().includes(lowerQuery) ||
        pkg.description?.toLowerCase().includes(lowerQuery) ||
        pkg.keywords?.some((k) => k?.toLowerCase().includes(lowerQuery)),
    );
  }

  private filterByType(
    packages: RegistryPackage[],
    type?: PackageType,
  ): RegistryPackage[] {
    if (!type) return packages;

    return packages.filter((pkg) => {
      try {
        return resolvePackageType(pkg) === type;
      } catch {
        return false;
      }
    });
  }

  private sortPackages(
    packages: RegistryPackage[],
    sort: SearchSort,
  ): RegistryPackage[] {
    const comparator = comparators[sort];
    return [...packages].sort(comparator);
  }

  private paginate(
    packages: RegistryPackage[],
    offset?: number,
    limit?: number,
  ): RegistryPackage[] {
    const start = offset || 0;
    const end = start + (limit || 10);
    return packages.slice(start, end);
  }
}

// Default registry instance
export const registry = new Registry();
