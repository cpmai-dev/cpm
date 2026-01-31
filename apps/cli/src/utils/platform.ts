import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { Platform } from '../types.js';

interface PlatformDetection {
  platform: Platform;
  detected: boolean;
  configPath?: string;
  version?: string;
}

// Detection rules for each platform
const detectionRules: Record<Platform, { paths: string[]; global: string[] }> = {
  'claude-code': {
    paths: ['.claude', '.claude.json'],
    global: [
      path.join(os.homedir(), '.claude.json'),
      path.join(os.homedir(), '.claude'),
    ],
  },
};

// Detect installed platforms in a project
export async function detectPlatforms(projectPath: string = process.cwd()): Promise<PlatformDetection[]> {
  const results: PlatformDetection[] = [];

  for (const [platform, rules] of Object.entries(detectionRules)) {
    let detected = false;
    let configPath: string | undefined;

    // Check project-local paths
    for (const p of rules.paths) {
      const fullPath = path.join(projectPath, p);
      if (await fs.pathExists(fullPath)) {
        detected = true;
        configPath = fullPath;
        break;
      }
    }

    // Check global paths
    if (!detected) {
      for (const p of rules.global) {
        if (await fs.pathExists(p)) {
          detected = true;
          configPath = p;
          break;
        }
      }
    }

    results.push({
      platform: platform as Platform,
      detected,
      configPath,
    });
  }

  return results;
}

// Get list of detected platforms
export async function getDetectedPlatforms(projectPath: string = process.cwd()): Promise<Platform[]> {
  const detections = await detectPlatforms(projectPath);
  return detections.filter(d => d.detected).map(d => d.platform);
}

// Get the Claude Code home directory (~/.claude)
export function getClaudeCodeHome(): string {
  return path.join(os.homedir(), '.claude');
}

// Get the rules directory for a platform (always global ~/.claude/rules)
export function getRulesPath(platform: Platform): string {
  if (platform !== 'claude-code') {
    throw new Error(`Rules path is not supported for platform: ${platform}`);
  }

  return path.join(getClaudeCodeHome(), 'rules');
}

// Get the skills directory (Claude Code only, always global ~/.claude/skills)
export function getSkillsPath(): string {
  return path.join(getClaudeCodeHome(), 'skills');
}
