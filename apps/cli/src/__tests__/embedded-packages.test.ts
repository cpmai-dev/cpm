/**
 * Tests for embedded packages
 * Ensures fallback packages are properly structured and valid
 */
import { describe, it, expect } from 'vitest';
import { EMBEDDED_PACKAGES, getEmbeddedManifest } from '../utils/embedded-packages.js';

describe('EMBEDDED_PACKAGES', () => {
  it('should contain official packages', () => {
    expect(EMBEDDED_PACKAGES).toHaveProperty('@cpm/nextjs-rules');
    expect(EMBEDDED_PACKAGES).toHaveProperty('@cpm/typescript-strict');
    expect(EMBEDDED_PACKAGES).toHaveProperty('@cpm/code-review');
    expect(EMBEDDED_PACKAGES).toHaveProperty('@cpm/git-commit');
    expect(EMBEDDED_PACKAGES).toHaveProperty('@cpm/react-patterns');
  });

  describe('package structure validation', () => {
    Object.entries(EMBEDDED_PACKAGES).forEach(([name, manifest]) => {
      describe(name, () => {
        it('should have required fields', () => {
          expect(manifest.name).toBe(name);
          expect(manifest.version).toBeDefined();
          expect(manifest.description).toBeDefined();
          expect(manifest.type).toBeDefined();
          expect(manifest.author).toBeDefined();
        });

        it('should have valid type', () => {
          const validTypes = ['rules', 'skill', 'mcp', 'agent', 'hook', 'workflow', 'template', 'bundle'];
          expect(validTypes).toContain(manifest.type);
        });

        it('should have version in semver format', () => {
          expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
        });

        it('should have skill config for skill type', () => {
          if (manifest.type === 'skill') {
            expect(manifest.skill).toBeDefined();
            expect(manifest.skill?.command).toMatch(/^\//);
            expect(manifest.skill?.description).toBeDefined();
          }
        });

        it('should have mcp config for mcp type', () => {
          if (manifest.type === 'mcp') {
            expect(manifest.mcp).toBeDefined();
            expect(manifest.mcp?.command).toBeDefined();
          }
        });

        it('should have universal content for non-mcp types', () => {
          // MCP packages don't need universal content - they configure external servers
          if (manifest.type !== 'mcp') {
            expect(manifest.universal).toBeDefined();
            expect(manifest.universal?.rules || manifest.universal?.prompt).toBeDefined();
          }
        });

        it('should have non-empty content for non-mcp types', () => {
          // MCP packages don't need universal content
          if (manifest.type !== 'mcp') {
            const content = manifest.universal?.rules || manifest.universal?.prompt || '';
            expect(content.length).toBeGreaterThan(50);
          }
        });
      });
    });
  });

  describe('MCP packages security', () => {
    const mcpPackages = Object.entries(EMBEDDED_PACKAGES)
      .filter(([_, manifest]) => manifest.type === 'mcp');

    mcpPackages.forEach(([name, manifest]) => {
      describe(name, () => {
        it('should use allowed command', () => {
          const allowedCommands = ['npx', 'node', 'python', 'python3', 'deno', 'bun', 'uvx'];
          expect(allowedCommands).toContain(manifest.mcp?.command);
        });

        it('should not have dangerous args', () => {
          const args = manifest.mcp?.args || [];
          const argsString = args.join(' ');

          expect(argsString).not.toMatch(/--eval/i);
          expect(argsString).not.toMatch(/\brm\b/);
          expect(argsString).not.toMatch(/\bsudo\b/);
          expect(argsString).not.toMatch(/[|;&`$]/);
        });
      });
    });
  });
});

describe('getEmbeddedManifest', () => {
  it('should return manifest for existing package', () => {
    const manifest = getEmbeddedManifest('@cpm/nextjs-rules');
    expect(manifest).not.toBeNull();
    expect(manifest?.name).toBe('@cpm/nextjs-rules');
  });

  it('should return null for non-existent package', () => {
    const manifest = getEmbeddedManifest('@cpm/non-existent');
    expect(manifest).toBeNull();
  });

  it('should return null for unknown author packages', () => {
    const manifest = getEmbeddedManifest('@unknown/some-package');
    expect(manifest).toBeNull();
  });
});
