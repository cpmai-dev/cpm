<p align="center">
  <img src="assets/logo-horizontal-full.svg" alt="CPM" width="400">
</p>

<p align="center">
  <strong>One command to install skills, rules, and MCP servers.</strong>
</p>

```bash
# Install a package
cpm install @cpmai/commit

# Search for packages
cpm search react

# List installed packages
cpm list
```

## What is CPM?

CPM is a CLI tool that lets you install curated packages for AI coding assistants. Packages include:

- **Rules** - Guidelines and coding standards (installed to `~/.claude/rules/`)
- **Skills** - Slash commands like `/commit`, `/review-pr` (installed to `~/.claude/skills/`)
- **MCP Servers** - Tool integrations like GitHub, Sentry (configured in `~/.claude.json`)

## Installation

```bash
npm install -g @cpmai/cli
```

## Usage

### Install a package

```bash
# Install from official registry
cpm install commit

# Install with full package name
cpm install @cpmai/nextjs-rules

# Install community package
cpm install @community/some-package
```

### Search for packages

```bash
# Search all packages
cpm search react

# Filter by type
cpm search react --type rules
cpm search github --type mcp

# Limit results
cpm search typescript --limit 5
```

### List installed packages

```bash
cpm list
```

### Uninstall a package

```bash
cpm uninstall commit
```

### CLI Options

```bash
# Quiet mode (only errors)
cpm -q install commit

# Verbose mode (debug output)
cpm -v install commit

# Show help
cpm --help
```

## Package Types

| Type    | Description                     | Installation Location      |
| ------- | ------------------------------- | -------------------------- |
| `rules` | Coding guidelines and standards | `~/.claude/rules/<name>/`  |
| `skill` | Slash commands                  | `~/.claude/skills/<name>/` |
| `mcp`   | MCP server integrations         | `~/.claude.json`           |

## Development

### Prerequisites

- Node.js 18+
- pnpm 9+

### Setup

```bash
# Clone the repo
git clone https://github.com/cpmai-dev/cpm.git
cd cpm

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Commands

| Command          | Description             |
| ---------------- | ----------------------- |
| `pnpm dev`       | Start CLI in dev mode   |
| `pnpm build`     | Build all packages      |
| `pnpm test`      | Run tests               |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint`      | Lint all packages       |

## Security

CPM implements multiple security measures:

- **MCP Command Allowlist** - Only trusted commands (`npx`, `node`, `python`, etc.)
- **Argument Blocklist** - Blocks dangerous patterns (`--eval`, `curl`, `sudo`, etc.)
- **Path Traversal Prevention** - Validates all file paths before writing
- **File Name Sanitization** - Sanitizes package and file names
- **HTTPS Only** - All downloads use HTTPS

## Contributing

### Adding Packages

Want to add your own rules, skills, or MCP servers to the registry? Submit a PR to the [packages repository](https://github.com/cpmai-dev/packages):

1. Fork [cpmai-dev/packages](https://github.com/cpmai-dev/packages)
2. Add your package with a `cpm.yaml` manifest
3. Submit a pull request

### Contributing to CPM

Contributions to the CLI are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT
