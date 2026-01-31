import chalk from 'chalk';
import ora from 'ora';
import type { PackageType } from '../types.js';
import { registry, type SearchOptions as RegistrySearchOptions } from '../utils/registry.js';

interface SearchOptions {
  type?: string;
  limit?: string;
  sort?: string;
}

const typeColors: Record<string, (str: string) => string> = {
  rules: chalk.yellow,
  skill: chalk.blue,
  mcp: chalk.magenta,
  agent: chalk.green,
  hook: chalk.cyan,
  workflow: chalk.red,
  template: chalk.white,
  bundle: chalk.gray,
};

const typeEmoji: Record<string, string> = {
  rules: '📜',
  skill: '⚡',
  mcp: '🔌',
  agent: '🤖',
  hook: '🪝',
  workflow: '📋',
  template: '📁',
  bundle: '📦',
};

export async function searchCommand(
  query: string,
  options: SearchOptions
): Promise<void> {
  const spinner = ora(`Searching for "${query}"...`).start();
  const limit = parseInt(options.limit || '10', 10);

  try {
    // Build search options
    const searchOptions: RegistrySearchOptions = {
      query,
      limit,
    };

    if (options.type) {
      searchOptions.type = options.type as PackageType;
    }

    if (options.sort) {
      searchOptions.sort = options.sort as 'downloads' | 'stars' | 'recent' | 'name';
    }

    // Search using the registry client
    const results = await registry.search(searchOptions);

    spinner.stop();

    if (results.packages.length === 0) {
      console.log(chalk.yellow(`\nNo packages found for "${query}"`));
      console.log(chalk.dim('\nAvailable package types: rules, skill, mcp'));
      console.log(chalk.dim('Try: cpm search react --type rules'));
      return;
    }

    console.log(chalk.dim(`\nFound ${results.total} package(s)\n`));

    // Display results
    for (const pkg of results.packages) {
      const typeColor = typeColors[pkg.type] || chalk.white;
      const emoji = typeEmoji[pkg.type] || '📦';

      // Build badges
      const badges: string[] = [];
      if (pkg.official) {
        badges.push(chalk.hex('#f97316')('★ official'));
      } else if (pkg.verified) {
        badges.push(chalk.green('✓ verified'));
      }

      // Package name and version
      console.log(
        `${emoji} ${chalk.bold.white(pkg.name)} ${chalk.dim(`v${pkg.version}`)}` +
        (badges.length > 0 ? ` ${badges.join(' ')}` : '')
      );

      // Description
      console.log(`   ${chalk.dim(pkg.description)}`);

      // Metadata line (handle optional stars)
      const meta = [
        typeColor(pkg.type),
        chalk.dim(`↓ ${formatNumber(pkg.downloads)}`),
        pkg.stars !== undefined ? chalk.dim(`★ ${pkg.stars}`) : null,
        chalk.dim(`@${pkg.author}`),
      ].filter(Boolean) as string[];
      console.log(`   ${meta.join(chalk.dim(' · '))}`);

      console.log();
    }

    // Install hint
    console.log(
      chalk.dim('─'.repeat(50))
    );
    console.log(
      chalk.dim(`Install with: ${chalk.cyan('cpm install <package-name>')}`)
    );
  } catch (error) {
    spinner.fail('Search failed');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
  }
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}
