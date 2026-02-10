import type { PackageManifest, Platform, InstalledPackage } from "../types.js";

export interface InstallResult {
  success: boolean;
  platform: Platform;
  filesWritten: string[];
  error?: string;
}

export abstract class PlatformAdapter {
  abstract platform: Platform;
  abstract displayName: string;

  abstract install(
    manifest: PackageManifest,
    projectPath: string,
    packagePath?: string,
  ): Promise<InstallResult>;
  abstract uninstall(
    packageName: string,
    projectPath: string,
  ): Promise<InstallResult>;
  abstract isAvailable(projectPath: string): Promise<boolean>;
  abstract listInstalled(projectPath: string): Promise<InstalledPackage[]>;
  abstract ensureDirs(projectPath: string): Promise<void>;
}
