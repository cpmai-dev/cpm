import type {
  RegistryPackage,
  RegistryData,
  SearchOptions,
  SearchResult,
  PackageType,
} from "@cpm/types";

// Registry configuration
const DEFAULT_REGISTRY_URL =
  "https://raw.githubusercontent.com/cpm-ai/registry/main/index.json";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface RegistryConfig {
  registryUrl?: string;
  cacheDir?: string;
}

/**
 * Registry client for fetching and searching packages
 */
export class Registry {
  private registryUrl: string;
  private cache: RegistryData | null = null;
  private cacheTimestamp: number = 0;

  constructor(config: RegistryConfig = {}) {
    this.registryUrl = config.registryUrl || DEFAULT_REGISTRY_URL;
  }

  /**
   * Load the registry data (with caching)
   */
  async load(forceRefresh: boolean = false): Promise<RegistryData> {
    // Check memory cache first
    if (
      !forceRefresh &&
      this.cache &&
      Date.now() - this.cacheTimestamp < CACHE_TTL
    ) {
      return this.cache;
    }

    // Try to fetch from registry
    try {
      const response = await fetch(this.registryUrl, {
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`Registry fetch failed: ${response.status}`);
      }

      const data = (await response.json()) as RegistryData;

      // Update cache
      this.cache = data;
      this.cacheTimestamp = Date.now();

      return data;
    } catch {
      // If fetch fails and we have stale cache, use it
      if (this.cache) {
        return this.cache;
      }

      // No cache available, throw error
      throw new Error(
        "Unable to fetch package registry. Please check your internet connection and try again.",
      );
    }
  }

  /**
   * Search for packages
   */
  async search(options: SearchOptions = {}): Promise<SearchResult> {
    const data = await this.load();
    let packages = [...data.packages];

    // Filter by query
    if (options.query) {
      const query = options.query.toLowerCase();
      packages = packages.filter(
        (pkg) =>
          pkg.name.toLowerCase().includes(query) ||
          pkg.description.toLowerCase().includes(query) ||
          pkg.keywords?.some((k) => k.toLowerCase().includes(query)),
      );
    }

    // Filter by type
    if (options.type) {
      packages = packages.filter((pkg) => pkg.type === options.type);
    }

    // Sort
    const sort = options.sort || "downloads";
    packages.sort((a, b) => {
      switch (sort) {
        case "downloads":
          return b.downloads - a.downloads;
        case "stars":
          return b.stars - a.stars;
        case "recent":
          return (
            new Date(b.publishedAt || 0).getTime() -
            new Date(a.publishedAt || 0).getTime()
          );
        case "name":
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
    const data = await this.load();
    return data.packages.find((pkg) => pkg.name === name) || null;
  }

  /**
   * Get all packages of a specific type
   */
  async getPackagesByType(type: PackageType): Promise<RegistryPackage[]> {
    const data = await this.load();
    return data.packages.filter((pkg) => pkg.type === type);
  }

  /**
   * Get featured/official packages
   */
  async getFeaturedPackages(limit: number = 10): Promise<RegistryPackage[]> {
    const data = await this.load();
    return data.packages
      .filter((pkg) => pkg.official || pkg.verified)
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }
}

// Default registry instance
export const registry = new Registry();
