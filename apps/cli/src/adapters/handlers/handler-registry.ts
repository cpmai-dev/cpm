/**
 * Handler Registry
 *
 * This module provides a registry for managing package handlers.
 * It follows the Open/Closed Principle - the system is open for extension
 * (new handlers can be added) but closed for modification (existing code
 * doesn't need to change when adding new package types).
 *
 * Think of it like a phone book: you can look up the right handler
 * for any package type, and you can add new handlers without changing
 * how the lookup works.
 */

import type { PackageType } from "../../types.js";
import type { PackageHandler } from "./types.js";

/**
 * Registry for package handlers.
 *
 * This class maintains a mapping between package types (like "rules", "skill", "mcp")
 * and their corresponding handler implementations. When we need to install or
 * uninstall a package, we look up the appropriate handler here.
 *
 * @example
 * ```typescript
 * // Register a new handler
 * handlerRegistry.register(new RulesHandler());
 *
 * // Later, get the handler to install a rules package
 * const handler = handlerRegistry.getHandler("rules");
 * await handler.install(manifest, context);
 * ```
 */
export class HandlerRegistry {
  /**
   * Internal storage for handlers.
   * Maps package type strings to their handler instances.
   * Using Map for O(1) lookup performance.
   */
  private readonly handlers = new Map<PackageType, PackageHandler>();

  /**
   * Register a handler for a specific package type.
   *
   * When you create a new handler (like RulesHandler), you call this method
   * to add it to the registry so it can be found later.
   *
   * @param handler - The handler instance to register. The handler's
   *                  packageType property determines which type it handles.
   *
   * @example
   * ```typescript
   * const rulesHandler = new RulesHandler();
   * registry.register(rulesHandler);
   * // Now "rules" type packages will use RulesHandler
   * ```
   */
  register(handler: PackageHandler): void {
    // Store the handler using its package type as the key
    // If a handler for this type already exists, it will be replaced
    this.handlers.set(handler.packageType, handler);
  }

  /**
   * Get the handler for a specific package type.
   *
   * Use this when you need to install or uninstall a package.
   * It returns the appropriate handler based on the package type.
   *
   * @param type - The package type to find a handler for (e.g., "rules", "skill", "mcp")
   * @returns The handler that can process this package type
   * @throws Error if no handler is registered for the given type
   *
   * @example
   * ```typescript
   * const handler = registry.getHandler("skill");
   * const files = await handler.install(manifest, context);
   * ```
   */
  getHandler(type: PackageType): PackageHandler {
    // Try to find a handler for this package type
    const handler = this.handlers.get(type);

    // If no handler is found, throw a descriptive error
    // This helps developers know they need to register a handler
    if (!handler) {
      throw new Error(`No handler registered for package type: ${type}`);
    }

    // Return the found handler
    return handler;
  }

  /**
   * Check if a handler exists for a specific package type.
   *
   * Useful when you want to check availability before attempting
   * to get a handler, avoiding the need for try-catch blocks.
   *
   * @param type - The package type to check
   * @returns true if a handler is registered, false otherwise
   *
   * @example
   * ```typescript
   * if (registry.hasHandler("mcp")) {
   *   const handler = registry.getHandler("mcp");
   *   // ... use handler
   * } else {
   *   console.log("MCP packages not supported");
   * }
   * ```
   */
  hasHandler(type: PackageType): boolean {
    // Check if the map contains an entry for this type
    return this.handlers.has(type);
  }

  /**
   * Get a list of all registered package types.
   *
   * Useful for debugging, displaying supported types to users,
   * or iterating over all available handlers.
   *
   * @returns Array of package type strings that have registered handlers
   *
   * @example
   * ```typescript
   * const types = registry.getRegisteredTypes();
   * console.log("Supported types:", types.join(", "));
   * // Output: "Supported types: rules, skill, mcp"
   * ```
   */
  getRegisteredTypes(): PackageType[] {
    // Convert the Map's keys iterator to an array
    return Array.from(this.handlers.keys());
  }
}

/**
 * Global handler registry instance.
 *
 * This is the single shared registry used throughout the application.
 * All handlers are registered here, and all code that needs to find
 * a handler looks it up from this instance.
 *
 * Using a singleton pattern ensures consistency across the codebase.
 */
export const handlerRegistry = new HandlerRegistry();
