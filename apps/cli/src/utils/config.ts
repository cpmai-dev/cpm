/**
 * Configuration utilities
 * Minimal config - no caching, no lockfile
 */
import path from "path";
import os from "os";
import fs from "fs-extra";

/**
 * Get the Claude Code home directory (~/.claude)
 */
export function getClaudeHome(): string {
  return path.join(os.homedir(), ".claude");
}

/**
 * Ensure Claude directories exist
 */
export async function ensureClaudeDirs(): Promise<void> {
  const claudeHome = getClaudeHome();
  await fs.ensureDir(path.join(claudeHome, "rules"));
  await fs.ensureDir(path.join(claudeHome, "skills"));
}

/**
 * Ensure Cursor directories exist in the project
 */
export async function ensureCursorDirs(projectPath: string): Promise<void> {
  await fs.ensureDir(path.join(projectPath, ".cursor", "rules"));
}
