# @cpmai/cli

The command-line interface for CPM.

## Installation

```bash
npm install -g @cpmai/cli
```

## Commands

### `cpm install <package>`

Install a package from the registry.

```bash
cpm install commit                    # Installs @cpmai/commit
cpm install @cpmai/nextjs-rules       # Full package name
cpm install @affaan-m/claude-rules    # Package from another author
```

**Options:**

- `-p, --platform <platform>` - Target platform (default: `claude-code`)

### `cpm uninstall <package>`

Remove an installed package.

```bash
cpm uninstall commit
cpm rm @cpmai/nextjs-rules    # Alias: rm
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

### Global Options

```bash
cpm -q <command>    # Quiet mode (errors only)
cpm -v <command>    # Verbose mode (debug output)
cpm --version       # Show version
cpm --help          # Show help
```

## Package Types

| Type    | Description       | Installed To               |
| ------- | ----------------- | -------------------------- |
| `rules` | Coding guidelines | `~/.claude/rules/<name>/`  |
| `skill` | Slash commands    | `~/.claude/skills/<name>/` |
| `mcp`   | MCP servers       | `~/.claude.json`           |

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
