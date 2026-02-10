/**
 * Config Command
 *
 * Manages CPM configuration. Currently supports:
 * - `cpm config set platform <value>` — set default platform
 * - `cpm config get platform` — show current default platform
 *
 * @example
 * ```bash
 * cpm config set platform cursor
 * cpm config get platform
 * ```
 */

import { isValidPlatform } from "../types.js";
import { VALID_PLATFORMS } from "../constants.js";
import {
  readCpmConfig,
  writeCpmConfig,
  isValidConfigKey,
} from "../utils/cpm-config.js";
import { logger } from "../utils/logger.js";

export async function configCommand(
  action: string,
  key: string,
  value?: string,
): Promise<void> {
  if (!isValidConfigKey(key)) {
    logger.error(`Unknown config key: ${key}`);
    logger.log(`  Valid keys: platform`);
    return;
  }

  switch (action) {
    case "set":
      await handleSet(key, value);
      break;
    case "get":
      await handleGet(key);
      break;
    default:
      logger.error(`Unknown action: ${action}. Use "set" or "get".`);
  }
}

async function handleSet(key: string, value?: string): Promise<void> {
  if (key === "platform") {
    if (!value) {
      logger.error("Missing value. Usage: cpm config set platform <platform>");
      logger.log(`  Available platforms: ${VALID_PLATFORMS.join(", ")}`);
      return;
    }

    if (!isValidPlatform(value)) {
      logger.error(`Invalid platform: ${value}`);
      logger.log(`  Available platforms: ${VALID_PLATFORMS.join(", ")}`);
      return;
    }

    const config = await readCpmConfig();
    await writeCpmConfig({ ...config, defaultPlatform: value });
    logger.success(`Default platform set to: ${value}`);
  }
}

async function handleGet(key: string): Promise<void> {
  if (key === "platform") {
    const config = await readCpmConfig();

    if (config.defaultPlatform && isValidPlatform(config.defaultPlatform)) {
      logger.log(config.defaultPlatform);
    } else if (config.defaultPlatform) {
      logger.warn(
        `Configured platform "${config.defaultPlatform}" is no longer valid`,
      );
      logger.log(`  Available platforms: ${VALID_PLATFORMS.join(", ")}`);
    } else {
      logger.warn("No default platform configured");
      logger.log(`  Set one with: cpm config set platform <platform>`);
      logger.log(`  Available platforms: ${VALID_PLATFORMS.join(", ")}`);
    }
  }
}
