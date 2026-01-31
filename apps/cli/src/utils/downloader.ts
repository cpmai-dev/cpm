import got from 'got';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';
import * as tar from 'tar';
import yaml from 'yaml';
import type { RegistryPackage, PackageManifest, PackageType } from '../types.js';
import { getCpmDir, ensureCpmDir } from './config.js';

// Cache directory for downloaded packages
const DOWNLOAD_CACHE_DIR = path.join(os.homedir(), '.cpm', 'cache', 'packages');

// Base URL for packages registry (configurable via env)
const PACKAGES_BASE_URL = process.env.CPM_PACKAGES_URL || 'https://raw.githubusercontent.com/cpmai-dev/packages/main';

// Timeout constants
const TIMEOUTS = {
  MANIFEST_FETCH: 5000,
  TARBALL_DOWNLOAD: 30000,
  API_REQUEST: 10000,
} as const;

/**
 * Validate and sanitize a file name to prevent path traversal
 */
function sanitizeFileName(fileName: string): string {
  // Only allow safe characters: alphanumeric, dots, dashes, underscores
  const sanitized = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');

  // Prevent path traversal and hidden files
  if (!sanitized || sanitized.includes('..') || sanitized.startsWith('.')) {
    throw new Error(`Invalid file name: ${fileName}`);
  }

  return sanitized;
}

/**
 * Validate that a destination path is within the allowed directory
 */
function validatePathWithinDir(destPath: string, allowedDir: string): void {
  const resolvedDest = path.resolve(destPath);
  const resolvedDir = path.resolve(allowedDir);

  if (!resolvedDest.startsWith(resolvedDir + path.sep) && resolvedDest !== resolvedDir) {
    throw new Error(`Path traversal detected: ${destPath}`);
  }
}

/**
 * Validate and sanitize a package path from registry
 */
function validatePackagePath(pkgPath: string): string {
  // Normalize and validate the path
  const normalized = path.normalize(pkgPath).replace(/\\/g, '/');

  // Check for path traversal
  if (normalized.includes('..') || normalized.startsWith('/')) {
    throw new Error(`Invalid package path: ${pkgPath}`);
  }

  return normalized;
}

export interface DownloadResult {
  success: boolean;
  packagePath: string;
  manifest: PackageManifest;
  error?: string;
}

/**
 * Download and extract a package from the registry
 */
export async function downloadPackage(
  pkg: RegistryPackage,
  projectPath: string = process.cwd()
): Promise<DownloadResult> {
  try {
    // Ensure directories exist
    await ensureCpmDir(projectPath);
    await fs.ensureDir(DOWNLOAD_CACHE_DIR);

    // Create package directory
    const packageDir = path.join(getCpmDir(projectPath), 'packages', pkg.name);
    await fs.ensureDir(packageDir);

    let manifest: PackageManifest | null = null;

    // Priority 1: Fetch from path (cpmai-dev registry)
    if (pkg.path) {
      manifest = await fetchPackageFromPath(pkg, packageDir);
    }

    // Priority 2: Fetch from repository (GitHub repos)
    if (!manifest && pkg.repository) {
      manifest = await fetchManifestFromRepo(pkg.repository);
    }

    // Priority 3: Download tarball
    if (!manifest && pkg.tarball) {
      const tarballPath = await downloadTarball(pkg.tarball, pkg.name, pkg.version);
      if (tarballPath) {
        await extractTarball(tarballPath, packageDir);

        const manifestPath = path.join(packageDir, 'cpm.yaml');
        if (await fs.pathExists(manifestPath)) {
          const content = await fs.readFile(manifestPath, 'utf-8');
          manifest = yaml.parse(content);
        }
      }
    }

    // Priority 4: Embedded/fallback manifest
    if (!manifest) {
      manifest = await getEmbeddedManifest(pkg);
    }

    // Priority 5: Create from registry data
    if (!manifest) {
      manifest = createManifestFromRegistry(pkg);
    }

    // Write manifest to package directory
    await fs.writeFile(
      path.join(packageDir, 'cpm.yaml'),
      yaml.stringify(manifest),
      'utf-8'
    );

    return {
      success: true,
      packagePath: packageDir,
      manifest,
    };
  } catch (error) {
    return {
      success: false,
      packagePath: '',
      manifest: {} as PackageManifest,
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

/**
 * Fetch manifest from GitHub repository
 */
async function fetchManifestFromRepo(repoUrl: string): Promise<PackageManifest | null> {
  try {
    // Convert GitHub URL to raw content URL
    // https://github.com/owner/repo -> https://raw.githubusercontent.com/owner/repo/main/cpm.yaml
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;

    const [, owner, repo] = match;
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/cpm.yaml`;

    const response = await got(rawUrl, {
      timeout: { request: 5000 },
    });

    return yaml.parse(response.body);
  } catch {
    return null;
  }
}

/**
 * Download tarball to cache
 */
async function downloadTarball(url: string, name: string, version: string): Promise<string | null> {
  try {
    const safeName = name.replace(/[@\/]/g, '_');
    const tarballPath = path.join(DOWNLOAD_CACHE_DIR, `${safeName}-${version}.tar.gz`);

    // Check if already cached
    if (await fs.pathExists(tarballPath)) {
      return tarballPath;
    }

    // Download
    const response = await got(url, {
      timeout: { request: 30000 },
      followRedirect: true,
      responseType: 'buffer',
    });

    await fs.writeFile(tarballPath, response.body);
    return tarballPath;
  } catch {
    return null;
  }
}

/**
 * Extract tarball to destination with zip slip protection
 */
async function extractTarball(tarballPath: string, destDir: string): Promise<void> {
  await fs.ensureDir(destDir);
  const resolvedDestDir = path.resolve(destDir);

  await tar.extract({
    file: tarballPath,
    cwd: destDir,
    strip: 1, // Remove top-level directory
    filter: (entryPath: string) => {
      // Prevent zip slip: ensure extracted paths stay within destDir
      const resolvedPath = path.resolve(destDir, entryPath);
      const isWithinDest = resolvedPath.startsWith(resolvedDestDir + path.sep) ||
                           resolvedPath === resolvedDestDir;

      if (!isWithinDest) {
        console.error(`Blocked path traversal attempt in tarball: ${entryPath}`);
        return false;
      }
      return true;
    },
  });
}

/**
 * Get content file name based on package type
 */
function getContentFileName(type: PackageType): string {
  const fileNames: Record<string, string> = {
    skill: 'SKILL.md',
    rules: 'RULES.md',
    mcp: 'MCP.md',
    agent: 'AGENT.md',
    hook: 'HOOK.md',
    workflow: 'WORKFLOW.md',
    template: 'TEMPLATE.md',
    bundle: 'BUNDLE.md',
  };
  return fileNames[type] || 'README.md';
}

/**
 * Parse GitHub repo info from packages base URL
 */
function parseGitHubInfo(baseUrl: string): { owner: string; repo: string } | null {
  const match = baseUrl.match(/github(?:usercontent)?\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

/**
 * Fetch package content from path in cpmai-dev registry
 * Downloads all files in the package folder
 */
async function fetchPackageFromPath(
  pkg: RegistryPackage,
  packageDir: string
): Promise<PackageManifest | null> {
  if (!pkg.path) return null;

  try {
    // Validate package path to prevent path traversal
    const safePath = validatePackagePath(pkg.path);

    const githubInfo = parseGitHubInfo(PACKAGES_BASE_URL);
    if (!githubInfo) {
      // Fallback to single file download if not GitHub
      return fetchSingleFileFromPath(pkg);
    }

    // Use GitHub API to list directory contents
    const apiUrl = `https://api.github.com/repos/${githubInfo.owner}/${githubInfo.repo}/contents/${safePath}`;
    const response = await got(apiUrl, {
      timeout: { request: TIMEOUTS.API_REQUEST },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'cpm-cli',
      },
      responseType: 'json',
    });

    const files = response.body as Array<{
      name: string;
      type: string;
      download_url: string | null;
    }>;

    // Download all files in the package folder
    let mainContent = '';
    const contentFile = getContentFileName(pkg.type);

    for (const file of files) {
      if (file.type === 'file' && file.download_url) {
        // Sanitize file name to prevent path traversal
        const safeFileName = sanitizeFileName(file.name);
        const destPath = path.join(packageDir, safeFileName);

        // Validate destination is within package directory
        validatePathWithinDir(destPath, packageDir);

        const fileResponse = await got(file.download_url, {
          timeout: { request: TIMEOUTS.API_REQUEST },
        });

        // Write file to package directory
        await fs.writeFile(destPath, fileResponse.body, 'utf-8');

        // Capture main content file
        if (file.name === contentFile) {
          mainContent = fileResponse.body;
        }
      }
    }

    // Create manifest from registry metadata + fetched content
    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      type: pkg.type,
      author: { name: pkg.author },
      keywords: pkg.keywords,
      universal: {
        rules: mainContent,
        prompt: mainContent,
      },
      skill: pkg.type === 'skill' ? {
        command: `/${pkg.name.split('/').pop()}`,
        description: pkg.description,
      } : undefined,
    };
  } catch (error) {
    // Log error for debugging, then fallback
    console.error('Failed to fetch from path:', error instanceof Error ? error.message : error);
    return fetchSingleFileFromPath(pkg);
  }
}

/**
 * Fallback: fetch only the main content file
 */
async function fetchSingleFileFromPath(pkg: RegistryPackage): Promise<PackageManifest | null> {
  if (!pkg.path) return null;

  try {
    // Validate package path to prevent path traversal
    const safePath = validatePackagePath(pkg.path);
    const contentFile = getContentFileName(pkg.type);
    const contentUrl = `${PACKAGES_BASE_URL}/${safePath}/${contentFile}`;

    const response = await got(contentUrl, {
      timeout: { request: TIMEOUTS.API_REQUEST },
    });

    const content = response.body;

    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      type: pkg.type,
      author: { name: pkg.author },
      keywords: pkg.keywords,
      universal: {
        rules: content,
        prompt: content,
      },
      skill: pkg.type === 'skill' ? {
        command: `/${pkg.name.split('/').pop()}`,
        description: pkg.description,
      } : undefined,
    };
  } catch (error) {
    console.error('Failed to fetch single file:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get embedded manifest for fallback packages
 */
async function getEmbeddedManifest(pkg: RegistryPackage): Promise<PackageManifest | null> {
  // Return embedded content for official packages
  const embeddedPackages: Record<string, PackageManifest> = {
    '@official/nextjs-rules': {
      name: '@official/nextjs-rules',
      version: '1.0.0',
      description: 'Next.js 14+ App Router conventions and best practices for Claude Code',
      type: 'rules',
      author: { name: 'CPM Team', url: 'https://cpm-ai.dev' },
      license: 'MIT',
      keywords: ['nextjs', 'react', 'typescript', 'app-router'],
      universal: {
        globs: ['**/*.tsx', '**/*.ts', 'app/**/*', 'src/**/*'],
        rules: `# Next.js 14+ Best Practices

You are an expert Next.js developer specializing in the App Router architecture.

## Core Principles

1. **App Router First**: Always use the App Router (\`app/\` directory), never the Pages Router
2. **Server Components by Default**: Components are Server Components unless marked with \`'use client'\`
3. **TypeScript Required**: Use TypeScript with strict mode enabled
4. **Colocation**: Keep related files together (components, styles, tests)

## File Conventions

- \`page.tsx\` - Unique UI for a route
- \`layout.tsx\` - Shared UI for a segment and children
- \`loading.tsx\` - Loading UI with Suspense
- \`error.tsx\` - Error boundary with recovery
- \`not-found.tsx\` - 404 UI for a segment

## Data Fetching

- Use \`fetch()\` in Server Components with proper caching
- Implement \`generateStaticParams\` for static generation
- Use \`revalidatePath\` and \`revalidateTag\` for on-demand revalidation
- Prefer Server Actions for mutations

## Component Patterns

\`\`\`typescript
// Server Component (default)
async function ProductList() {
  const products = await getProducts();
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}

// Client Component (interactive)
'use client';
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
\`\`\`

## Best Practices

- Use \`next/image\` for optimized images
- Implement proper metadata with \`generateMetadata\`
- Use route groups \`(group)\` for organization without URL impact
- Implement parallel routes for complex UIs
- Use intercepting routes for modals`,
      },
    },

    '@official/typescript-strict': {
      name: '@official/typescript-strict',
      version: '1.0.0',
      description: 'TypeScript strict mode best practices and conventions',
      type: 'rules',
      author: { name: 'CPM Team', url: 'https://cpm-ai.dev' },
      license: 'MIT',
      keywords: ['typescript', 'strict', 'types'],
      universal: {
        globs: ['**/*.ts', '**/*.tsx'],
        rules: `# TypeScript Strict Mode Best Practices

You are an expert TypeScript developer who prioritizes type safety and clean code.

## Strict Mode Requirements

Always ensure these compiler options are enabled:
- \`strict: true\` (enables all strict checks)
- \`noUncheckedIndexedAccess: true\`
- \`noImplicitReturns: true\`
- \`noFallthroughCasesInSwitch: true\`

## Type Safety Principles

1. **No \`any\`**: Never use \`any\`. Use \`unknown\` with type guards instead.
2. **Explicit Return Types**: Always declare return types for functions.
3. **Readonly by Default**: Use \`readonly\` and \`Readonly<T>\` wherever possible.
4. **Discriminated Unions**: Prefer discriminated unions over optional properties.

## Patterns

\`\`\`typescript
// Good: Discriminated union
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

// Good: Type guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Good: Explicit return type
function getUser(id: string): Promise<User | null> {
  return db.users.find(id);
}

// Good: Readonly
function processItems(items: readonly Item[]): void {
  // Cannot mutate items
}
\`\`\`

## Avoid

- \`as\` type assertions (use type guards)
- Non-null assertion \`!\` (use proper null checks)
- \`Object\`, \`Function\`, \`{}\` types (be specific)
- Implicit \`any\` from untyped imports`,
      },
    },

    '@official/code-review': {
      name: '@official/code-review',
      version: '1.0.0',
      description: 'Automated code review skill for Claude Code',
      type: 'skill',
      author: { name: 'CPM Team', url: 'https://cpm-ai.dev' },
      license: 'MIT',
      keywords: ['code-review', 'quality', 'skill'],
      skill: {
        command: '/review',
        description: 'Review code for bugs, performance, and best practices',
      },
      universal: {
        prompt: `# Code Review Skill

You are an expert code reviewer. When the user invokes /review, analyze the provided code thoroughly.

## Review Checklist

1. **Bugs & Logic Errors**
   - Off-by-one errors
   - Null/undefined handling
   - Race conditions
   - Error handling gaps

2. **Performance**
   - Unnecessary re-renders (React)
   - N+1 queries
   - Memory leaks
   - Inefficient algorithms

3. **Security**
   - Input validation
   - SQL injection risks
   - XSS vulnerabilities
   - Secrets in code

4. **Maintainability**
   - Code complexity
   - Naming conventions
   - DRY violations
   - Missing documentation

5. **Best Practices**
   - Framework conventions
   - Design patterns
   - Error boundaries
   - Testing considerations

## Output Format

\`\`\`
## Code Review Summary

### Critical Issues
- [ ] Issue description with line reference

### Warnings
- [ ] Warning description

### Suggestions
- [ ] Suggestion for improvement

### Positive Notes
- What's done well
\`\`\``,
      },
    },

    '@official/git-commit': {
      name: '@official/git-commit',
      version: '1.0.0',
      description: 'Smart commit message generation skill',
      type: 'skill',
      author: { name: 'CPM Team', url: 'https://cpm-ai.dev' },
      license: 'MIT',
      keywords: ['git', 'commit', 'messages', 'skill'],
      skill: {
        command: '/commit',
        description: 'Generate a commit message for staged changes',
      },
      universal: {
        prompt: `# Git Commit Message Skill

Generate clear, conventional commit messages based on staged changes.

## Commit Format

\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

## Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Formatting, no code change
- **refactor**: Code restructuring
- **perf**: Performance improvement
- **test**: Adding tests
- **chore**: Maintenance tasks

## Guidelines

1. Subject line max 50 characters
2. Use imperative mood ("Add feature" not "Added feature")
3. No period at end of subject
4. Body explains what and why (not how)
5. Reference issues in footer

## Examples

\`\`\`
feat(auth): add OAuth2 login support

Implement Google and GitHub OAuth providers using NextAuth.js.
This allows users to sign in without creating a password.

Closes #123
\`\`\`

\`\`\`
fix(api): handle null response from external service

The external API occasionally returns null instead of an empty array.
Added defensive check to prevent runtime errors.

Fixes #456
\`\`\``,
      },
    },

    '@official/react-patterns': {
      name: '@official/react-patterns',
      version: '1.0.0',
      description: 'React component patterns and best practices',
      type: 'rules',
      author: { name: 'CPM Team', url: 'https://cpm-ai.dev' },
      license: 'MIT',
      keywords: ['react', 'components', 'hooks', 'patterns'],
      universal: {
        globs: ['**/*.tsx', '**/*.jsx'],
        rules: `# React Component Patterns

You are an expert React developer following modern best practices.

## Component Design

1. **Single Responsibility**: Each component does one thing well
2. **Composition over Inheritance**: Use children and render props
3. **Controlled Components**: Form inputs controlled by state
4. **Hooks for Logic**: Extract reusable logic into custom hooks

## Patterns

### Custom Hook Pattern
\`\`\`tsx
function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(id).then(setUser).finally(() => setLoading(false));
  }, [id]);

  return { user, loading };
}
\`\`\`

### Compound Components
\`\`\`tsx
function Tabs({ children }) { /* ... */ }
Tabs.Tab = function Tab({ children }) { /* ... */ };
Tabs.Panel = function Panel({ children }) { /* ... */ };
\`\`\`

### Render Props
\`\`\`tsx
<DataFetcher url="/api/users">
  {({ data, loading }) => loading ? <Spinner /> : <UserList users={data} />}
</DataFetcher>
\`\`\`

## Performance

- Use \`React.memo\` for expensive pure components
- Use \`useMemo\` for expensive calculations
- Use \`useCallback\` for stable function references
- Avoid inline objects/arrays in props`,
      },
    },

    '@official/refactor': {
      name: '@official/refactor',
      version: '1.0.0',
      description: 'Code refactoring assistant skill',
      type: 'skill',
      author: { name: 'CPM Team', url: 'https://cpm-ai.dev' },
      license: 'MIT',
      keywords: ['refactor', 'clean-code', 'skill'],
      skill: {
        command: '/refactor',
        description: 'Suggest and apply code refactoring improvements',
      },
      universal: {
        prompt: `# Code Refactoring Skill

You are an expert at improving code quality through refactoring.

## Refactoring Techniques

1. **Extract Function**: Pull out complex logic into named functions
2. **Extract Variable**: Name complex expressions
3. **Inline Variable**: Remove unnecessary intermediates
4. **Rename**: Use clear, descriptive names
5. **Move Function**: Place code where it belongs
6. **Replace Conditional with Polymorphism**

## Code Smells to Address

- Long functions (>20 lines)
- Deep nesting (>3 levels)
- Duplicate code
- God objects
- Feature envy
- Data clumps
- Primitive obsession

## Process

1. Understand the current behavior
2. Write tests if missing
3. Make small, incremental changes
4. Verify tests pass after each change
5. Commit frequently

## Output Format

When asked to refactor, provide:
1. Analysis of current issues
2. Proposed changes with rationale
3. Refactored code
4. Before/after comparison`,
      },
    },

    '@official/explain': {
      name: '@official/explain',
      version: '1.0.0',
      description: 'Code explanation and documentation skill',
      type: 'skill',
      author: { name: 'CPM Team', url: 'https://cpm-ai.dev' },
      license: 'MIT',
      keywords: ['explain', 'documentation', 'skill'],
      skill: {
        command: '/explain',
        description: 'Explain code in detail with examples',
      },
      universal: {
        prompt: `# Code Explanation Skill

You are an expert at explaining code clearly and thoroughly.

## Explanation Structure

1. **Overview**: What does this code do at a high level?
2. **Key Concepts**: What patterns/techniques are used?
3. **Line-by-Line**: Detailed walkthrough of important parts
4. **Examples**: Show how to use or modify this code
5. **Gotchas**: Common pitfalls or edge cases

## Adapt to Audience

- **Beginner**: More context, simpler terms, more examples
- **Intermediate**: Focus on patterns and best practices
- **Expert**: Focus on edge cases and optimization

## Output Format

\`\`\`markdown
## Overview
[High-level summary]

## How It Works
[Step-by-step explanation]

## Key Concepts
- Concept 1: Explanation
- Concept 2: Explanation

## Usage Example
[Code example]

## Things to Watch Out For
[Edge cases and gotchas]
\`\`\``,
      },
    },

    '@official/api-design': {
      name: '@official/api-design',
      version: '1.0.0',
      description: 'REST and GraphQL API design conventions',
      type: 'rules',
      author: { name: 'CPM Team', url: 'https://cpm-ai.dev' },
      license: 'MIT',
      keywords: ['api', 'rest', 'graphql', 'design'],
      universal: {
        globs: ['**/api/**/*', '**/routes/**/*', '**/graphql/**/*'],
        rules: `# API Design Best Practices

You are an expert API designer following industry best practices.

## REST Conventions

### URL Structure
- Use nouns, not verbs: \`/users\` not \`/getUsers\`
- Use plural nouns: \`/users\` not \`/user\`
- Nest for relationships: \`/users/{id}/posts\`
- Use kebab-case: \`/user-profiles\`

### HTTP Methods
- GET: Read (idempotent)
- POST: Create
- PUT: Full update (idempotent)
- PATCH: Partial update
- DELETE: Remove (idempotent)

### Status Codes
- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Server Error

### Response Format
\`\`\`json
{
  "data": { ... },
  "meta": { "page": 1, "total": 100 },
  "errors": [{ "code": "...", "message": "..." }]
}
\`\`\`

## GraphQL Conventions

- Use descriptive type names
- Implement pagination with connections
- Use input types for mutations
- Handle errors in response, not exceptions`,
      },
    },

    '@official/testing-patterns': {
      name: '@official/testing-patterns',
      version: '1.0.0',
      description: 'Testing best practices for JavaScript/TypeScript projects',
      type: 'rules',
      author: { name: 'CPM Team', url: 'https://cpm-ai.dev' },
      license: 'MIT',
      keywords: ['testing', 'jest', 'vitest', 'patterns'],
      universal: {
        globs: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
        rules: `# Testing Best Practices

You are an expert in writing maintainable, reliable tests.

## Testing Principles

1. **Test Behavior, Not Implementation**
2. **Arrange-Act-Assert Pattern**
3. **One Assertion per Test** (when practical)
4. **Tests Should Be Independent**
5. **Use Descriptive Test Names**

## Test Structure

\`\`\`typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const userData = { name: 'John', email: 'john@example.com' };

      // Act
      const user = await userService.createUser(userData);

      // Assert
      expect(user.name).toBe('John');
      expect(user.email).toBe('john@example.com');
    });

    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const userData = { name: 'John', email: 'invalid' };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects.toThrow(ValidationError);
    });
  });
});
\`\`\`

## Mocking

- Mock external dependencies, not internal modules
- Use dependency injection for testability
- Reset mocks between tests
- Prefer spies over full mocks when possible

## Coverage

- Aim for meaningful coverage, not 100%
- Focus on critical paths and edge cases
- Don't test framework code`,
      },
    },

    '@official/github-mcp': {
      name: '@official/github-mcp',
      version: '1.0.0',
      description: 'GitHub API integration MCP server for Claude Code',
      type: 'mcp',
      author: { name: 'CPM Team', url: 'https://cpm-ai.dev' },
      license: 'MIT',
      keywords: ['github', 'mcp', 'api', 'integration'],
      mcp: {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: {
          GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_TOKEN}',
        },
      },
    },
  };

  return embeddedPackages[pkg.name] || null;
}

/**
 * Create manifest from registry data (fallback)
 */
function createManifestFromRegistry(pkg: RegistryPackage): PackageManifest {
  return {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    type: pkg.type,
    author: { name: pkg.author },
    repository: pkg.repository,
    keywords: pkg.keywords,
    universal: {
      rules: `# ${pkg.name}\n\n${pkg.description}`,
    },
  };
}

/**
 * Calculate SHA256 hash of a file
 */
export async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Clear the download cache
 */
export async function clearCache(): Promise<void> {
  await fs.remove(DOWNLOAD_CACHE_DIR);
}
