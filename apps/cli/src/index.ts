#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { installCommand } from './commands/install.js';
import { searchCommand } from './commands/search.js';
import { listCommand } from './commands/list.js';
import { initCommand } from './commands/init.js';
import { uninstallCommand } from './commands/uninstall.js';
import { configureLogger, logger } from './utils/logger.js';

const program = new Command();

// ASCII Art Logo
const logo = `
  ${chalk.hex('#f97316')('░█████╗░██████╗░███╗░░░███╗')}
  ${chalk.hex('#f97316')('██╔══██╗██╔══██╗████╗░████║')}
  ${chalk.hex('#fb923c')('██║░░╚═╝██████╔╝██╔████╔██║')}
  ${chalk.hex('#fb923c')('██║░░██╗██╔═══╝░██║╚██╔╝██║')}
  ${chalk.hex('#fbbf24')('╚█████╔╝██║░░░░░██║░╚═╝░██║')}
  ${chalk.hex('#fbbf24')('░╚════╝░╚═╝░░░░░╚═╝░░░░░╚═╝')}
`;

program
  .name('cpm')
  .description(`${logo}\n  ${chalk.dim('The package manager for Claude Code')}\n`)
  .version('0.1.0')
  .option('-q, --quiet', 'Suppress all output except errors')
  .option('-v, --verbose', 'Enable verbose output for debugging')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.optsWithGlobals();
    configureLogger({
      quiet: opts.quiet,
      verbose: opts.verbose,
    });
  });

// Install command
program
  .command('install <package>')
  .alias('i')
  .description('Install a package')
  .option('-p, --platform <platform>', 'Target platform (claude-code)', 'all')
  .action(installCommand);

// Uninstall command
program
  .command('uninstall <package>')
  .alias('rm')
  .description('Uninstall a package')
  .option('-p, --platform <platform>', 'Target platform')
  .action(uninstallCommand);

// Search command
program
  .command('search <query>')
  .alias('s')
  .description('Search for packages')
  .option('-t, --type <type>', 'Filter by type (rules, mcp, skill, agent)')
  .option('-l, --limit <number>', 'Limit results', '10')
  .action(searchCommand);

// List command
program
  .command('list')
  .alias('ls')
  .description('List installed packages')
  .action(listCommand);

// Init command
program
  .command('init')
  .description('Create a new cpm package')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(initCommand);

// Info command
program
  .command('info <package>')
  .description('Show package details')
  .action(async () => {
    logger.warn('Coming soon: package info');
  });

// Update command
program
  .command('update')
  .alias('up')
  .description('Update installed packages')
  .action(async () => {
    logger.warn('Coming soon: package updates');
  });

// Publish command
program
  .command('publish')
  .description('Publish a package to the registry')
  .action(async () => {
    logger.warn('Coming soon: package publishing');
  });

// Parse and execute
program.parse();
