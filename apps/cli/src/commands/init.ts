import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

interface InitOptions {
  yes?: boolean;
}

const TEMPLATE = `# Package manifest for cpm
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
`;

export async function initCommand(options: InitOptions): Promise<void> {
  const manifestPath = path.join(process.cwd(), 'cpm.yaml');

  // Check if already exists
  if (await fs.pathExists(manifestPath)) {
    console.log(chalk.yellow('cpm.yaml already exists in this directory'));
    return;
  }

  try {
    // Write template
    await fs.writeFile(manifestPath, TEMPLATE, 'utf-8');

    console.log(chalk.green('✓ Created cpm.yaml'));
    console.log();
    console.log('Next steps:');
    console.log(chalk.dim('  1. Edit cpm.yaml to configure your package'));
    console.log(chalk.dim('  2. Run cpm publish to publish to the registry'));
    console.log();
    console.log(chalk.dim(`Learn more: ${chalk.cyan('https://cpm-ai.dev/docs/publishing')}`));
  } catch (error) {
    console.error(chalk.red('Failed to create cpm.yaml'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
  }
}
