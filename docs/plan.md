# CPM CLI Implementation Plan

## Overview

Complete the CPM CLI tool to work with the new `cpmai-dev/packages` GitHub repository structure and implement the missing commands (`info`, `update`, `publish`).

## New Registry Structure

```
cpmai-dev/packages/
├── registry.json                         # Main index of all packages
└── packages/
    ├── skills/{author}--{name}/
    │   ├── meta.json                     # Package metadata
    │   └── skill.md                      # Skill content
    ├── rules/{author}--{name}/
    │   ├── meta.json
    │   └── rules.md
    ├── mcp/{author}--{name}/
    │   ├── meta.json
    │   └── config.json
    ├── hooks/
    ├── agents/
    └── workflows/
```

**Naming Convention**: `@author/name` → `packages/{type}s/{author}--{name}/`

---

## Implementation Tasks

### 1. Update Type Definitions
**File**: `apps/cli/src/types.ts`

Add new types:
- `RegistryPackageEntry` - Package entry in registry.json with `path` field
- `RegistryDataV2` - New registry format with version 2
- `PackageMeta` - Schema for meta.json files
- `ContentFileMap` - Mapping of package types to content filenames

### 2. Update Registry System
**File**: `apps/cli/src/utils/registry.ts`

Changes:
- Update `DEFAULT_REGISTRY_URL` to `https://raw.githubusercontent.com/cpmai-dev/packages/main/registry.json`
- Add `GITHUB_RAW_BASE` constant for fetching package files
- Add `getPackageMeta(path)` method to fetch meta.json
- Add `getPackageContent(path, type)` method to fetch content files
- Add helper functions: `parsePackageName()`, `packageToPath()`, `getContentFileName()`
- Update `getPackage()` to return entry with path

### 3. Update Downloader
**File**: `apps/cli/src/utils/downloader.ts`

Changes:
- Refactor `downloadPackage()` to:
  1. Fetch meta.json from package folder
  2. Fetch content file based on type (skill.md, rules.md, config.json)
  3. Convert to PackageManifest format
  4. Save locally to `.cpm/packages/{name}/`
- Add `convertMetaToManifest()` helper
- Remove or simplify embedded fallback packages (no longer needed with reliable registry)

### 4. Implement `info` Command
**File**: `apps/cli/src/commands/info.ts` (new)

Features:
- Display detailed package information (name, version, type, author, description)
- Show download count, stars, verification status
- Show skill command if applicable
- Display keywords and timestamps
- Support `--json` flag for machine-readable output

### 5. Implement `update` Command
**File**: `apps/cli/src/commands/update.ts` (new)

Features:
- Check installed packages against registry for newer versions
- Display available updates with version diff
- Update specific package or all packages (`--all`)
- Support `--dry-run` to preview without making changes
- Use semver comparison for version checking

### 6. Implement `publish` Command
**File**: `apps/cli/src/commands/publish.ts` (new)

**Note**: Publishing is handled through the web UI at `cpm-ai.dev/publish`. The CLI command validates the local package and directs users to the web UI.

Features:
- Validate cpm.yaml manifest with Zod schema
- Display package summary
- Check for required fields based on package type
- Open browser to `cpm-ai.dev/publish` for actual publishing
- Support `--validate-only` to just check without opening browser

### 7. Update Main Entry Point
**File**: `apps/cli/src/index.ts`

Changes:
- Import and wire up info, update, publish commands
- Add command options:
  - `info <package> [--json]`
  - `update [package] [-a|--all] [-n|--dry-run]`
  - `publish [--validate-only]`

---

## File Content Mapping

| Package Type | Content File | Format |
|--------------|--------------|--------|
| skill | skill.md | Markdown |
| rules | rules.md | Markdown |
| mcp | config.json | JSON |
| agent | agent.md | Markdown |
| hook | hook.md | Markdown |
| workflow | workflow.md | Markdown |

---

## Expected registry.json Format

```json
{
  "version": 2,
  "generated": "2026-01-31T00:00:00Z",
  "packages": [
    {
      "name": "@official/code-review",
      "version": "1.0.0",
      "type": "skill",
      "path": "skills/official--code-review",
      "description": "Automated code review skill",
      "author": "official",
      "downloads": 2100,
      "stars": 156,
      "verified": true,
      "official": true,
      "keywords": ["code-review", "quality"]
    }
  ]
}
```

---

## Expected meta.json Format

```json
{
  "name": "@official/code-review",
  "version": "1.0.0",
  "description": "Automated code review skill for Claude Code",
  "type": "skill",
  "author": {
    "name": "CPM Team",
    "url": "https://cpm-ai.dev"
  },
  "license": "MIT",
  "keywords": ["code-review", "quality"],
  "skill": {
    "command": "/review",
    "description": "Review code for bugs and best practices"
  },
  "publishedAt": "2026-01-15T00:00:00Z"
}
```

---

## Implementation Order

1. **types.ts** - Add new type definitions
2. **registry.ts** - Update for new structure
3. **downloader.ts** - Refactor download logic
4. **commands/info.ts** - New command
5. **commands/update.ts** - New command
6. **commands/publish.ts** - New command
7. **index.ts** - Wire up new commands

---

## Verification Plan

1. **Build**: Run `pnpm build` in apps/cli
2. **Test registry**: `cpm search code-review` should find packages from new registry
3. **Test install**: `cpm install @official/code-review` should download from folder structure
4. **Test info**: `cpm info @official/code-review` should display package details
5. **Test update**: `cpm update --dry-run` should check installed packages against registry
6. **Test publish**: `cpm publish --validate-only` should validate cpm.yaml and show summary

---

## Notes

- **Publishing**: All publishing goes through `cpm-ai.dev/publish` web UI
  - Backend handles: forking, branch creation, PR, and auto-merge
  - CLI just validates and redirects to web UI
- **No backward compatibility**: Old cpm-ai/registry format not supported
