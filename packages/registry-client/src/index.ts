/**
 * @cpm/registry-client - Registry client for CPM
 *
 * Fetches packages from GitHub-based registry
 */

export { Registry, registry } from './registry.js';
export { fetchPackageReadme, fetchPackageVersions } from './github.js';
export * from './fallback-packages.js';
