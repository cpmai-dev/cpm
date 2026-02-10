#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { createRequire } from "module";
import { installCommand } from "./commands/install.js";
import { searchCommand } from "./commands/search.js";
import { listCommand } from "./commands/list.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { configCommand } from "./commands/config.js";
import { initCommand } from "./commands/init.js";
import { configureLogger } from "./utils/logger.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

// ASCII Art Logo - Cyan to Lime gradient
const logo = `
  ${chalk.hex("#22d3ee")("░█████╗░██████╗░███╗░░░███╗")}
  ${chalk.hex("#22d3ee")("██╔══██╗██╔══██╗████╗░████║")}
  ${chalk.hex("#4ade80")("██║░░╚═╝██████╔╝██╔████╔██║")}
  ${chalk.hex("#4ade80")("██║░░██╗██╔═══╝░██║╚██╔╝██║")}
  ${chalk.hex("#a3e635")("╚█████╔╝██║░░░░░██║░╚═╝░██║")}
  ${chalk.hex("#a3e635")("░╚════╝░╚═╝░░░░░╚═╝░░░░░╚═╝")}
`;

program
  .name("cpm")
  .description(
    `${logo}\n  ${chalk.dim("Package manager for AI coding assistants")}\n`,
  )
  .version(version)
  .option("-q, --quiet", "Suppress all output except errors")
  .option("-v, --verbose", "Enable verbose output for debugging")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.optsWithGlobals();
    configureLogger({
      quiet: opts.quiet,
      verbose: opts.verbose,
    });
  });

// Init command
program
  .command("init")
  .description("Set up CPM with your preferred AI agent platform")
  .action(initCommand);

// Install command
program
  .command("install <package>")
  .alias("i")
  .description("Install a package")
  .option(
    "-p, --platform <platform>",
    "Target platform (e.g. claude-code, cursor, all)",
  )
  .action(installCommand);

// Uninstall command (always tries all platforms)
program
  .command("uninstall <package>")
  .alias("rm")
  .description("Uninstall a package from all platforms")
  .action(uninstallCommand);

// Search command
program
  .command("search <query>")
  .alias("s")
  .description("Search for packages")
  .option("-t, --type <type>", "Filter by type (rules, mcp, skill, agent)")
  .option(
    "-p, --platform <platform>",
    "Filter by platform compatibility (e.g. claude-code, cursor)",
  )
  .option("-l, --limit <number>", "Limit results", "10")
  .action(searchCommand);

// List command
program
  .command("list")
  .alias("ls")
  .description("List installed packages")
  .action(listCommand);

// Config command
program
  .command("config <action> <key> [value]")
  .description("Manage CPM configuration (e.g. cpm config set platform cursor)")
  .action(configCommand);

// Parse and execute
program.parse();
