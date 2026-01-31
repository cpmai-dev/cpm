import type { PackageManifest, Platform } from '../types.js';

export interface InstallResult {
  success: boolean;
  platform: Platform;
  filesWritten: string[];
  error?: string;
}

export abstract class PlatformAdapter {
  abstract platform: Platform;
  abstract displayName: string;

  abstract install(manifest: PackageManifest, projectPath: string, packagePath?: string): Promise<InstallResult>;
  abstract uninstall(packageName: string, projectPath: string): Promise<InstallResult>;
  abstract isAvailable(projectPath: string): Promise<boolean>;
}
