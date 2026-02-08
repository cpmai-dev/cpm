/**
 * Cursor MCP Package Handler
 *
 * Handles MCP server configurations in ~/.cursor/mcp.json.
 * Extends BaseMcpHandler with Cursor-specific config path.
 */

import { getCursorMcpConfigPath } from "../../utils/platform.js";
import { BaseMcpHandler } from "./base-mcp-handler.js";

export class CursorMcpHandler extends BaseMcpHandler {
  protected getConfigPath(): string {
    return getCursorMcpConfigPath();
  }
}
