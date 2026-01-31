/**
 * Embedded package manifests for offline/fallback support
 * These are bundled official packages that work without network access
 */
import type { PackageManifest } from '../types.js';

/**
 * Collection of embedded official package manifests
 * Used when network fetch fails or for offline installation
 */
export const EMBEDDED_PACKAGES: Record<string, PackageManifest> = {
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

## Code Smells to Address

- Long functions (>20 lines)
- Deep nesting (>3 levels)
- Duplicate code
- God objects
- Feature envy

## Process

1. Understand the current behavior
2. Write tests if missing
3. Make small, incremental changes
4. Verify tests pass after each change
5. Commit frequently`,
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
- **Expert**: Focus on edge cases and optimization`,
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
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Server Error`,
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
    });
  });
});
\`\`\`

## Mocking

- Mock external dependencies, not internal modules
- Use dependency injection for testability
- Reset mocks between tests`,
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

/**
 * Get embedded manifest for a package
 */
export function getEmbeddedManifest(packageName: string): PackageManifest | null {
  return EMBEDDED_PACKAGES[packageName] ?? null;
}
