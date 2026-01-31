# CPM - Claude Package Manager

**The package manager for Claude Code**

> One command to supercharge Claude Code with skills, rules, and MCP servers.

```bash
cpm install @official/nextjs-rules
```

🌐 **Website**: [cpm-ai.dev](https://cpm-ai.dev)

## Repository Structure

```
cpm/
├── apps/
│   ├── web/                 # Next.js web app (cpm-ai.dev)
│   └── cli/                 # CLI tool (cpm)
│
├── packages/
│   ├── types/               # Shared TypeScript types
│   └── registry-client/     # Registry client (used by both apps)
│
├── turbo.json               # Turborepo config
├── pnpm-workspace.yaml      # pnpm workspaces
└── package.json             # Root package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+

### Installation

```bash
# Clone the repo
git clone https://github.com/cpm-ai/cpm.git
cd cpm

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run only the web app
pnpm dev --filter @cpm/web

# Run only the CLI in dev mode
pnpm dev --filter @cpm/cli

# Run CLI commands during development
pnpm cli dev search react
pnpm cli dev install nextjs-rules
```

### Building

```bash
# Build everything (with Turborepo caching)
pnpm build

# Build specific package
pnpm build --filter @cpm/cli
```

## Packages

### `@cpm/web` (apps/web)

The cpm-ai.dev website - package registry, documentation, and dashboard.

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database**: GitHub-based registry

### `@cpm/cli` (apps/cli)

The command-line tool for installing packages.

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Bundler**: tsup

### `@cpm/types` (packages/types)

Shared TypeScript type definitions.

- `PackageManifest` - cpm.yaml schema
- `RegistryPackage` - Package in registry
- `Platform` - Supported platforms

### `@cpm/registry-client` (packages/registry-client)

Shared registry client for fetching packages.

- Works in both Node.js (CLI) and browser (Web)
- Caching and fallback support
- GitHub API integration

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages |
| `pnpm clean` | Clean all build outputs |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    @cpm/types                           │
│         PackageManifest, RegistryPackage, etc.          │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
┌─────────────────────┐      ┌─────────────────────┐
│ @cpm/registry-client│      │ @cpm/registry-client│
│   (used by CLI)     │      │   (used by Web)     │
└─────────┬───────────┘      └──────────┬──────────┘
          ▼                             ▼
┌─────────────────────┐      ┌─────────────────────┐
│      @cpm/cli       │      │      @cpm/web       │
│   cpm install ...   │      │    cpm-ai.dev       │
└─────────────────────┘      └─────────────────────┘
```

## License

MIT
