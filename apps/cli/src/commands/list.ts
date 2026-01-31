import chalk from 'chalk';
import { getInstalledPackages, getGlobalCpmDir } from '../utils/config.js';

interface ListOptions {
  global?: boolean;
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

export async function listCommand(options: ListOptions): Promise<void> {
  try {
    const projectPath = options.global ? getGlobalCpmDir() : process.cwd();
    const packages = await getInstalledPackages(projectPath);

    if (packages.length === 0) {
      console.log(chalk.yellow('No packages installed'));
      console.log(chalk.dim(`\nRun ${chalk.cyan('cpm install <package>')} to install a package`));
      return;
    }

    console.log(chalk.bold(`Installed packages (${packages.length}):\n`));

    for (const pkg of packages) {
      const typeColor = typeColors[pkg.type] || chalk.white;

      console.log(
        `  ${chalk.green('◉')} ${chalk.bold(pkg.name)} ${chalk.dim(`v${pkg.version}`)}`
      );
      console.log(
        `    ${typeColor(pkg.type)} · ${pkg.platforms.map(p => chalk.dim(p)).join(', ')}`
      );
    }

    console.log();
    console.log(chalk.dim('Run cpm uninstall <package> to remove a package'));
  } catch (error) {
    console.error(chalk.red('Failed to list packages'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
  }
}
