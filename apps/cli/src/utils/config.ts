import Conf from 'conf';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import type { InstalledPackage } from '../types.js';

// Global config store
const config = new Conf({
  projectName: 'cpm',
  schema: {
    installedPackages: {
      type: 'array',
      default: [],
    },
    registryUrl: {
      type: 'string',
      default: 'https://cpm-ai.dev/api',
    },
  },
});

export const CPM_DIR = '.cpm';
export const REGISTRY_URL = config.get('registryUrl') as string;

// Get the cpm directory for a project
export function getCpmDir(projectPath: string = process.cwd()): string {
  return path.join(projectPath, CPM_DIR);
}

// Get global cpm directory
export function getGlobalCpmDir(): string {
  return path.join(os.homedir(), CPM_DIR);
}

// Ensure cpm directory exists
export async function ensureCpmDir(projectPath: string = process.cwd()): Promise<string> {
  const cpmDir = getCpmDir(projectPath);
  await fs.ensureDir(cpmDir);
  await fs.ensureDir(path.join(cpmDir, 'packages'));
  return cpmDir;
}

// Get installed packages from lockfile
export async function getInstalledPackages(projectPath: string = process.cwd()): Promise<InstalledPackage[]> {
  const lockfilePath = path.join(getCpmDir(projectPath), 'cpm-lock.json');

  if (await fs.pathExists(lockfilePath)) {
    const lockfile = await fs.readJson(lockfilePath);
    return lockfile.packages || [];
  }

  return [];
}

// Save installed packages to lockfile
export async function saveInstalledPackages(
  packages: InstalledPackage[],
  projectPath: string = process.cwd()
): Promise<void> {
  const cpmDir = await ensureCpmDir(projectPath);
  const lockfilePath = path.join(cpmDir, 'cpm-lock.json');

  await fs.writeJson(lockfilePath, {
    version: 1,
    packages,
    updatedAt: new Date().toISOString(),
  }, { spaces: 2 });
}

// Add package to installed list
export async function addInstalledPackage(
  pkg: InstalledPackage,
  projectPath: string = process.cwd()
): Promise<void> {
  const packages = await getInstalledPackages(projectPath);
  const existingIndex = packages.findIndex(p => p.name === pkg.name);

  if (existingIndex >= 0) {
    packages[existingIndex] = pkg;
  } else {
    packages.push(pkg);
  }

  await saveInstalledPackages(packages, projectPath);
}

// Remove package from installed list
export async function removeInstalledPackage(
  packageName: string,
  projectPath: string = process.cwd()
): Promise<void> {
  const packages = await getInstalledPackages(projectPath);
  const filtered = packages.filter(p => p.name !== packageName);
  await saveInstalledPackages(filtered, projectPath);
}

export { config };
