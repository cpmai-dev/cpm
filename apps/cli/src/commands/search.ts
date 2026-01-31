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

/**
 * List all available packages
 */
export async function browseCommand(options: SearchOptions): Promise<void> {
  const spinner = ora('Fetching packages...').start();
  const limit = parseInt(options.limit || '20', 10);

  try {
    const searchOptions: RegistrySearchOptions = {
      limit,
      sort: (options.sort as 'downloads' | 'stars' | 'recent' | 'name') || 'downloads',
    };

    if (options.type) {
      searchOptions.type = options.type as PackageType;
    }

    const results = await registry.search(searchOptions);

    spinner.stop();

    console.log(chalk.bold(`\n📦 CPM Package Registry\n`));
    console.log(chalk.dim(`${results.total} packages available\n`));

    // Group by type
    const byType: Record<string, typeof results.packages> = {};
    for (const pkg of results.packages) {
      if (!byType[pkg.type]) {
        byType[pkg.type] = [];
      }
      byType[pkg.type].push(pkg);
    }

    // Display by type
    for (const [type, packages] of Object.entries(byType)) {
      const typeColor = typeColors[type] || chalk.white;
      const emoji = typeEmoji[type] || '📦';

      console.log(typeColor(`${emoji} ${type.toUpperCase()}`));
      console.log(chalk.dim('─'.repeat(40)));

      for (const pkg of packages) {
        const badge = pkg.official ? chalk.hex('#f97316')(' ★') : pkg.verified ? chalk.green(' ✓') : '';
        console.log(
          `  ${chalk.white(pkg.name)}${badge} ${chalk.dim(`- ${truncate(pkg.description, 40)}`)}`
        );
      }

      console.log();
    }

    // Stats
    console.log(chalk.dim('─'.repeat(50)));
    console.log(chalk.dim(`Install: cpm install <package>  |  Search: cpm search <query>`));
  } catch (error) {
    spinner.fail('Failed to fetch packages');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
  }
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}
