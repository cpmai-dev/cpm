import type { Platform } from "../types.js";
import { PlatformAdapter } from "./base.js";
import { ClaudeCodeAdapter } from "./claude-code.js";
import { CursorAdapter } from "./cursor.js";

export { PlatformAdapter, InstallResult } from "./base.js";

const adapters: Partial<Record<Platform, PlatformAdapter>> = {
  "claude-code": new ClaudeCodeAdapter(),
  cursor: new CursorAdapter(),
};

export function getAdapter(platform: Platform): PlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`No adapter available for platform: ${platform}`);
  }
  return adapter;
}

export function getAllAdapters(): PlatformAdapter[] {
  return Object.values(adapters).filter(
    (adapter): adapter is PlatformAdapter => adapter !== undefined,
  );
}
