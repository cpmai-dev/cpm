import path from "path";
import os from "os";
import type { Platform } from "../types.js";
import { getClaudeHome } from "./config.js";

// Re-export getClaudeHome as getClaudeCodeHome for backwards compatibility
export { getClaudeHome as getClaudeCodeHome } from "./config.js";

// Get the Cursor home directory (~/.cursor)
export function getCursorHome(): string {
  return path.join(os.homedir(), ".cursor");
}

// Get the Cursor MCP config path (~/.cursor/mcp.json)
export function getCursorMcpConfigPath(): string {
  return path.join(getCursorHome(), "mcp.json");
}

// Get the rules directory for a platform
export function getRulesPath(platform: Platform, projectPath?: string): string {
  if (platform === "claude-code") {
    return path.join(getClaudeHome(), "rules");
  }

  if (platform === "cursor") {
    if (!projectPath) {
      return path.join(process.cwd(), ".cursor", "rules");
    }
    return path.join(projectPath, ".cursor", "rules");
  }

  throw new Error(`Rules path is not supported for platform: ${platform}`);
}

// Get the skills directory (Claude Code only, always global ~/.claude/skills)
export function getSkillsPath(): string {
  return path.join(getClaudeHome(), "skills");
}
