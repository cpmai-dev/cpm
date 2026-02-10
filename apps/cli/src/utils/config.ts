/**
 * Configuration utilities
 */
import path from "path";
import os from "os";

/**
 * Get the Claude Code home directory (~/.claude)
 */
export function getClaudeHome(): string {
  return path.join(os.homedir(), ".claude");
}
