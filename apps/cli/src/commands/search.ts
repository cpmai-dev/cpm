/**
 * Search command for CPM
 * Searches the package registry
 */
import chalk from "chalk";
import ora from "ora";
import { resolvePackageType, isPackageType, isSearchSort } from "../types.js";
import {
  registry,
  type SearchOptions as RegistrySearchOptions,
} from "../utils/registry.js";
import { logger } from "../utils/logger.js";

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
  rules: "📜",
  skill: "⚡",
  mcp: "🔌",
  agent: "🤖",
  hook: "🪝",
  workflow: "📋",
  template: "📁",
  bundle: "📦",
};

export async function searchCommand(
  query: string,
  options: SearchOptions,
): Promise<void> {
  const spinner = logger.isQuiet()
    ? null
    : ora(`Searching for "${query}"...`).start();
  const parsedLimit = parseInt(options.limit || "10", 10);
  const limit = Number.isNaN(parsedLimit)
    ? 10
    : Math.max(1, Math.min(parsedLimit, 100));

  try {
    const searchOptions: RegistrySearchOptions = {
      query,
      limit,
    };

    // Type-safe validation before assignment
    if (options.type && isPackageType(options.type)) {
      searchOptions.type = options.type;
    }

    if (options.sort && isSearchSort(options.sort)) {
      searchOptions.sort = options.sort;
    }

    const results = await registry.search(searchOptions);

    if (spinner) spinner.stop();

    if (results.packages.length === 0) {
      logger.warn(`No packages found for "${query}"`);
      logger.log(chalk.dim("\nAvailable package types: rules, skill, mcp"));
      logger.log(chalk.dim("Try: cpm search react --type rules"));
      return;
    }

    logger.log(chalk.dim(`\nFound ${results.total} package(s)\n`));

    for (const pkg of results.packages) {
      const pkgType = resolvePackageType(pkg);
      const typeColor = typeColors[pkgType] || chalk.white;
      const emoji = typeEmoji[pkgType] || "📦";

      const badges: string[] = [];
      if (pkg.verified) {
        badges.push(chalk.green("✓ verified"));
      }

      logger.log(
        `${emoji} ${chalk.bold.white(pkg.name)} ${chalk.dim(`v${pkg.version}`)}` +
          (badges.length > 0 ? ` ${badges.join(" ")}` : ""),
      );

      logger.log(`   ${chalk.dim(pkg.description)}`);

      const meta = [
        typeColor(pkgType),
        chalk.dim(`↓ ${formatNumber(pkg.downloads ?? 0)}`),
        pkg.stars !== undefined ? chalk.dim(`★ ${pkg.stars}`) : null,
        chalk.dim(`@${pkg.author}`),
      ].filter(Boolean) as string[];
      logger.log(`   ${meta.join(chalk.dim(" · "))}`);

      logger.newline();
    }

    logger.log(chalk.dim("─".repeat(50)));
    logger.log(
      chalk.dim(`Install with: ${chalk.cyan("cpm install <package-name>")}`),
    );
  } catch (error) {
    if (spinner) spinner.fail("Search failed");
    else logger.error("Search failed");
    logger.error(error instanceof Error ? error.message : "Unknown error");
  }
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}
