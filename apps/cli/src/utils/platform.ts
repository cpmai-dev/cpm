import path from "path";
import type { Platform } from "../types.js";
import { getClaudeHome } from "./config.js";

// Re-export getClaudeHome as getClaudeCodeHome for backwards compatibility
export { getClaudeHome as getClaudeCodeHome } from "./config.js";

// Get the rules directory for a platform (always global ~/.claude/rules)
export function getRulesPath(platform: Platform): string {
  if (platform !== "claude-code") {
    throw new Error(`Rules path is not supported for platform: ${platform}`);
  }

  return path.join(getClaudeHome(), "rules");
}

// Get the skills directory (Claude Code only, always global ~/.claude/skills)
export function getSkillsPath(): string {
  return path.join(getClaudeHome(), "skills");
}
