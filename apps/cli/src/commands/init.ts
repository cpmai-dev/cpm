/**
 * Init Command
 *
 * Provides first-run onboarding for CPM. Guides the user through
 * selecting their default AI agent platform via an interactive prompt.
 *
 * @example
 * ```bash
 * cpm init
 * ```
 */

import * as p from "@clack/prompts";
import { VALID_PLATFORMS } from "../constants.js";
import { readCpmConfig, writeCpmConfig } from "../utils/cpm-config.js";
import { isValidPlatform } from "../types.js";
import type { Platform } from "../types.js";

const PLATFORM_INFO: Record<Platform, { label: string; hint: string }> = {
  "claude-code": {
    label: "Claude Code",
    hint: "Anthropic's AI coding assistant",
  },
  cursor: {
    label: "Cursor",
    hint: "AI-powered code editor",
  },
  windsurf: {
    label: "Windsurf",
    hint: "AI-powered IDE by Codeium",
  },
  continue: {
    label: "Continue",
    hint: "Open-source AI code assistant",
  },
};

export async function initCommand(): Promise<void> {
  p.intro("Welcome to CPM — Package Manager for AI Coding Assistants");

  const existingConfig = await readCpmConfig();

  if (
    existingConfig.defaultPlatform &&
    isValidPlatform(existingConfig.defaultPlatform)
  ) {
    p.note(
      `Current default platform: ${existingConfig.defaultPlatform}`,
      "Existing configuration",
    );
  }

  const platform = await p.select({
    message: "Select your default AI agent platform",
    options: VALID_PLATFORMS.map((id) => ({
      value: id,
      label: PLATFORM_INFO[id]?.label ?? id,
      hint: PLATFORM_INFO[id]?.hint,
    })),
  });

  if (p.isCancel(platform)) {
    p.cancel("Setup cancelled.");
    return;
  }

  await writeCpmConfig({ ...existingConfig, defaultPlatform: platform });

  p.outro(
    [
      `Default platform set to: ${platform}`,
      "",
      "Get started:",
      "  cpm search <query>        Search for packages",
      "  cpm install <package>     Install a package",
      "  cpm list                  List installed packages",
      "",
      `Change later: cpm config set platform <platform>`,
    ].join("\n"),
  );
}
