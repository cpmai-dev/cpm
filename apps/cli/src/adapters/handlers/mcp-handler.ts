/**
 * Claude Code MCP Package Handler
 *
 * Handles MCP server configurations in ~/.claude.json.
 * Extends BaseMcpHandler with Claude Code-specific config path.
 */

import path from "path";
import { getClaudeCodeHome } from "../../utils/platform.js";
import { BaseMcpHandler } from "./base-mcp-handler.js";

export class McpHandler extends BaseMcpHandler {
  protected getConfigPath(): string {
    const claudeHome = getClaudeCodeHome();
    return path.join(path.dirname(claudeHome), ".claude.json");
  }
}
