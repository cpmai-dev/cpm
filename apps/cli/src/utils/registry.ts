import got from "got";
import fs from "fs-extra";
import path from "path";
import os from "os";
import type { RegistryPackage, PackageType } from "../types.js";
import { resolvePackageType } from "../types.js";

// Registry configuration (configurable via env)
const DEFAULT_REGISTRY_URL =
  process.env.CPM_REGISTRY_URL ||
  "https://raw.githubusercontent.com/cpmai-dev/packages/main/registry.json";
const CACHE_DIR = path.join(os.homedir(), ".cpm", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "registry.json");
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
  sort?: "downloads" | "stars" | "recent" | "name";
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
    if (
      !forceRefresh &&
      this.cache &&
      Date.now() - this.cacheTimestamp < CACHE_TTL
    ) {
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
        responseType: "json",
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
    } catch {
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
    const data = await this.fetch();
    let packages = [...data.packages];

    // Filter by query
    if (options.query) {
      const query = options.query.toLowerCase();
      packages = packages.filter(
        (pkg) =>
          pkg.name?.toLowerCase().includes(query) ||
          pkg.description?.toLowerCase().includes(query) ||
          pkg.keywords?.some((k) => k?.toLowerCase().includes(query)),
      );
    }

    // Filter by type
    if (options.type) {
      packages = packages.filter((pkg) => {
        try {
          return resolvePackageType(pkg) === options.type;
        } catch {
          return false;
        }
      });
    }

    // Sort
    const sort = options.sort || "downloads";
    packages.sort((a, b) => {
      switch (sort) {
        case "downloads":
          return (b.downloads ?? 0) - (a.downloads ?? 0);
        case "stars":
          return (b.stars ?? 0) - (a.stars ?? 0);
        case "recent":
          return (
            new Date(b.publishedAt || 0).getTime() -
            new Date(a.publishedAt || 0).getTime()
          );
        case "name":
          return (a.name ?? "").localeCompare(b.name ?? "");
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
    return data.packages.find((pkg) => pkg.name === name) || null;
  }
}

// Default registry instance
export const registry = new Registry();
