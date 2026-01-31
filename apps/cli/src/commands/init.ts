/**
 * Init Command
 *
 * This module provides the init command for CPM. It creates a new cpm.yaml
 * manifest file in the current directory.
 *
 * Design principles:
 * - **Single Responsibility**: Template is separated from display logic
 * - **Type Safety**: Options are typed even if currently minimal
 *
 * @example
 * ```bash
 * cpm init
 * ```
 */

import fs from "fs-extra";
import path from "path";
import { logger } from "../utils/logger.js";

// Import UI layer
import { SEMANTIC_COLORS } from "./ui/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for the init command.
 */
export interface InitOptions {
  /** Skip confirmation prompts (future feature) */
  yes?: boolean;
}

// ============================================================================
// Template
// ============================================================================

/**
 * Template for a new cpm.yaml manifest file.
 *
 * Provides a complete starting point for package authors with:
 * - Basic metadata fields
 * - Author information
 * - Universal content configuration
 * - Commented examples for advanced features
 */
const MANIFEST_TEMPLATE = `# Package manifest for cpm
# https://cpm-ai.dev/docs/packages

name: my-package
version: 0.1.0
description: A brief description of your package
type: rules  # rules | skill | mcp | agent | hook | workflow | template | bundle

author:
  name: Your Name
  email: you@example.com
  url: https://github.com/yourusername

repository: https://github.com/yourusername/my-package
license: MIT

keywords:
  - keyword1
  - keyword2

# Universal content (works on all platforms)
universal:
  # File patterns this applies to
  globs:
    - "**/*.ts"
    - "**/*.tsx"

  # Rules/instructions (markdown)
  rules: |
    You are an expert developer.

    ## Guidelines

    - Follow best practices
    - Write clean, maintainable code
    - Include proper error handling

# Platform-specific configurations (optional)
# platforms:
#   cursor:
#     settings:
#       alwaysApply: true
#   claude-code:
#     skill:
#       command: /my-command
#       description: What this skill does

# MCP server configuration (if type: mcp)
# mcp:
#   command: npx
#   args: ["your-mcp-server"]
#   env:
#     API_KEY: "\${API_KEY}"
` as const;

// ============================================================================
// Constants
// ============================================================================

/** The manifest filename */
const MANIFEST_FILENAME = "cpm.yaml" as const;

/** Documentation URL */
const DOCS_URL = "https://cpm-ai.dev/docs/publishing" as const;

// ============================================================================
// Display Functions
// ============================================================================

/**
 * Display success message with next steps.
 */
function displaySuccess(): void {
  logger.success(`Created ${MANIFEST_FILENAME}`);
  logger.newline();

  logger.log("Next steps:");
  logger.log(
    SEMANTIC_COLORS.dim(
      `  1. Edit ${MANIFEST_FILENAME} to configure your package`,
    ),
  );
  logger.log(
    SEMANTIC_COLORS.dim("  2. Run cpm publish to publish to the registry"),
  );
  logger.newline();

  logger.log(
    SEMANTIC_COLORS.dim(`Learn more: ${SEMANTIC_COLORS.highlight(DOCS_URL)}`),
  );
}

// ============================================================================
// Main Command Handler
// ============================================================================

/**
 * Main init command entry point.
 *
 * This function:
 * 1. Checks if manifest already exists
 * 2. Creates the manifest file with template
 * 3. Displays next steps
 *
 * @param _options - Init options (for future use)
 *
 * @example
 * ```typescript
 * await initCommand({});
 * ```
 */
export async function initCommand(_options: InitOptions): Promise<void> {
  // -------------------------------------------------------------------------
  // Step 1: Determine manifest path
  // -------------------------------------------------------------------------
  const manifestPath = path.join(process.cwd(), MANIFEST_FILENAME);

  // -------------------------------------------------------------------------
  // Step 2: Check if manifest already exists
  // -------------------------------------------------------------------------
  if (await fs.pathExists(manifestPath)) {
    logger.warn(`${MANIFEST_FILENAME} already exists in this directory`);
    return;
  }

  try {
    // -----------------------------------------------------------------------
    // Step 3: Write template file
    // -----------------------------------------------------------------------
    await fs.writeFile(manifestPath, MANIFEST_TEMPLATE, "utf-8");

    // -----------------------------------------------------------------------
    // Step 4: Display success and next steps
    // -----------------------------------------------------------------------
    displaySuccess();
  } catch (error) {
    logger.error(`Failed to create ${MANIFEST_FILENAME}`);
    logger.error(error instanceof Error ? error.message : "Unknown error");
  }
}
