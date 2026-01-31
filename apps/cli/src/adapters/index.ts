import type { Platform } from '../types.js';
import { PlatformAdapter } from './base.js';
import { ClaudeCodeAdapter } from './claude-code.js';

export { PlatformAdapter, InstallResult } from './base.js';

const adapters: Record<Platform, PlatformAdapter> = {
  'claude-code': new ClaudeCodeAdapter()
};

export function getAdapter(platform: Platform): PlatformAdapter {
  return adapters[platform];
}

export function getAllAdapters(): PlatformAdapter[] {
  return Object.values(adapters);
}

export function getSupportedPlatforms(): Platform[] {
  return Object.keys(adapters) as Platform[];
}
