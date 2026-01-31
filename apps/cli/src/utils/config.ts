import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import type { InstalledPackage } from '../types.js';

export const CPM_DIR = '.cpm';

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

// Add package to installed list (immutable update)
export async function addInstalledPackage(
  pkg: InstalledPackage,
  projectPath: string = process.cwd()
): Promise<void> {
  const packages = await getInstalledPackages(projectPath);
  const existingIndex = packages.findIndex(p => p.name === pkg.name);

  // Use immutable patterns - create new array instead of mutating
  const updatedPackages = existingIndex >= 0
    ? packages.map((p, i) => i === existingIndex ? pkg : p)
    : [...packages, pkg];

  await saveInstalledPackages(updatedPackages, projectPath);
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
