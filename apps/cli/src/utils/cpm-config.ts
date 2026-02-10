/**
 * CPM Configuration
 *
 * Manages CPM's own configuration stored at ~/.cpm/config.json.
 * Currently supports:
 * - defaultPlatform: The platform to use when --platform flag is omitted
 */

import fs from "fs-extra";
import path from "path";
import os from "os";
import type { Platform } from "../types.js";
import { isValidPlatform } from "../types.js";
import { withFileLock } from "./file-lock.js";

export interface CpmConfig {
  defaultPlatform?: string;
}

const VALID_CONFIG_KEYS = ["platform"] as const;
export type ConfigKey = (typeof VALID_CONFIG_KEYS)[number];

export function isValidConfigKey(key: string): key is ConfigKey {
  return (VALID_CONFIG_KEYS as readonly string[]).includes(key);
}

export function getCpmConfigDir(): string {
  return path.join(os.homedir(), ".cpm");
}

export function getCpmConfigPath(): string {
  return path.join(getCpmConfigDir(), "config.json");
}

export async function readCpmConfig(): Promise<CpmConfig> {
  const configPath = getCpmConfigPath();

  try {
    if (await fs.pathExists(configPath)) {
      const raw = await fs.readJson(configPath);
      const config: CpmConfig = {};
      if (typeof raw?.defaultPlatform === "string") {
        config.defaultPlatform = raw.defaultPlatform;
      }
      return config;
    }
  } catch {
    // Ignore parse errors, return empty config
  }

  return {};
}

export async function writeCpmConfig(config: CpmConfig): Promise<void> {
  const configPath = getCpmConfigPath();
  await fs.ensureDir(getCpmConfigDir());
  await withFileLock(configPath, async () => {
    await fs.writeJson(configPath, config, { spaces: 2 });
  });
}

export async function getDefaultPlatform(): Promise<Platform | undefined> {
  const config = await readCpmConfig();

  if (config.defaultPlatform && isValidPlatform(config.defaultPlatform)) {
    return config.defaultPlatform;
  }

  return undefined;
}
