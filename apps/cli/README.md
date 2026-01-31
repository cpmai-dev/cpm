# @cpm/cli

The command-line interface for CPM (Claude Package Manager).

## Installation

```bash
npm install -g @cpm/cli
```

## Commands

### `cpm install <package>`

Install a package from the registry.

```bash
cpm install commit                    # Installs @official/commit
cpm install @official/nextjs-rules    # Full package name
cpm install @community/my-package     # Community package
```

**Options:**
- `-p, --platform <platform>` - Target platform (default: `claude-code`)

### `cpm uninstall <package>`

Remove an installed package.

```bash
cpm uninstall commit
cpm rm @official/nextjs-rules    # Alias: rm
```

### `cpm search <query>`

Search for packages in the registry.

```bash
cpm search react
cpm search github --type mcp
cpm search typescript --limit 5
```

**Options:**
- `-t, --type <type>` - Filter by type (`rules`, `skill`, `mcp`)
- `-l, --limit <number>` - Limit results (default: 10)

### `cpm list`

List all installed packages.

```bash
cpm list
cpm ls    # Alias: ls
```

### `cpm init`

Create a new `cpm.yaml` manifest file.

```bash
cpm init
cpm init -y    # Skip prompts
```

### Global Options

```bash
cpm -q <command>    # Quiet mode (errors only)
cpm -v <command>    # Verbose mode (debug output)
cpm --version       # Show version
cpm --help          # Show help
```

## Package Types

| Type | Description | Installed To |
|------|-------------|--------------|
| `rules` | Coding guidelines | `~/.claude/rules/<name>.md` |
| `skill` | Slash commands | `~/.claude/skills/<name>/` |
| `mcp` | MCP servers | `~/.claude.json` |

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Run in dev mode
pnpm dev
```

## Architecture

```
src/
├── index.ts              # CLI entry point (commander setup)
├── commands/             # Command implementations
│   ├── install.ts        # Install command
│   ├── uninstall.ts      # Uninstall command
│   ├── search.ts         # Search command
│   ├── list.ts           # List command
│   └── init.ts           # Init command
├── adapters/             # Platform adapters
│   ├── base.ts           # Base adapter interface
│   ├── index.ts          # Adapter factory
│   └── claude-code.ts    # Claude Code adapter
├── utils/                # Utilities
│   ├── logger.ts         # Production logger (consola)
│   ├── config.ts         # Configuration helpers
│   ├── downloader.ts     # Package downloader
│   ├── registry.ts       # Registry client
│   ├── platform.ts       # Platform detection
│   └── embedded-packages.ts  # Fallback manifests
└── types.ts              # Type definitions
```

## Security

The CLI implements several security measures:

### MCP Command Validation

Only these commands are allowed for MCP servers:
- `npx`, `node`, `python`, `python3`, `deno`, `bun`, `uvx`

Blocked argument patterns:
- `--eval`, `-e`, `-c` (code execution)
- `curl`, `wget` (network commands)
- `rm`, `sudo`, `chmod`, `chown` (system commands)
- Shell metacharacters (`|`, `;`, `&`, `` ` ``, `$`)

### Path Traversal Prevention

- Package names are sanitized before use as folder names
- File paths are validated to stay within allowed directories
- Tarball extraction blocks path traversal attempts

### File Sanitization

- File names are validated and sanitized
- Hidden files (starting with `.`) are blocked
- Only `.md` files are allowed for rules/skills

## License

MIT
