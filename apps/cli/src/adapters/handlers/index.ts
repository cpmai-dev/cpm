/**
 * Package Handlers Module
 *
 * This is the main entry point for the handlers subsystem. It provides:
 * - Exports for all handler types and interfaces
 * - The handler registry for looking up handlers by package type
 * - Individual handler implementations (Rules, Skill, MCP)
 * - Auto-initialization of default handlers
 *
 * When this module is imported, it automatically registers all default
 * handlers with the global registry, making them immediately available
 * for use throughout the application.
 *
 * @example
 * ```typescript
 * import { handlerRegistry } from "./handlers";
 *
 * // Get a handler for a specific package type
 * const handler = handlerRegistry.getHandler("rules");
 *
 * // Use it to install a package
 * const files = await handler.install(manifest, context);
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Export the interface types for external use.
 * These are the contracts that handlers must implement.
 */
export type {
  PackageHandler,
  InstallContext,
  UninstallContext,
} from "./types.js";

// ============================================================================
// Class Exports
// ============================================================================

/**
 * Export the registry class and singleton instance.
 * The handlerRegistry is the main way to access handlers.
 */
export { HandlerRegistry, handlerRegistry } from "./handler-registry.js";

/**
 * Export individual handler classes for direct use or testing.
 */
export { RulesHandler } from "./rules-handler.js";
export { SkillHandler } from "./skill-handler.js";
export { McpHandler } from "./mcp-handler.js";

// ============================================================================
// Imports for Initialization
// ============================================================================

import { handlerRegistry } from "./handler-registry.js";
import { RulesHandler } from "./rules-handler.js";
import { SkillHandler } from "./skill-handler.js";
import { McpHandler } from "./mcp-handler.js";

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize and register all default handlers.
 *
 * This function creates instances of each handler and registers them
 * with the global handler registry. After calling this, you can use
 * handlerRegistry.getHandler() to retrieve handlers by package type.
 *
 * Currently registered handlers:
 * - RulesHandler: Handles "rules" packages (coding guidelines)
 * - SkillHandler: Handles "skill" packages (slash commands)
 * - McpHandler: Handles "mcp" packages (external tool integrations)
 *
 * @example
 * ```typescript
 * // Usually not needed - auto-called on module load
 * // But can be called again to reset handlers if needed
 * initializeHandlers();
 * ```
 */
export function initializeHandlers(): void {
  // Create and register the rules handler
  // Handles installation to ~/.claude/rules/
  handlerRegistry.register(new RulesHandler());

  // Create and register the skill handler
  // Handles installation to ~/.claude/skills/
  handlerRegistry.register(new SkillHandler());

  // Create and register the MCP handler
  // Handles configuration in ~/.claude.json
  handlerRegistry.register(new McpHandler());
}

// ============================================================================
// Auto-Initialization
// ============================================================================

/**
 * Automatically initialize handlers when this module is imported.
 *
 * This ensures that handlers are always available without requiring
 * explicit initialization code. The handlers are registered immediately
 * when any code imports from this module.
 *
 * This pattern is safe because:
 * - Handler registration is idempotent (registering twice just overwrites)
 * - Handlers are stateless and can be created at any time
 * - The registry is a singleton, so all code shares the same handlers
 */
initializeHandlers();
