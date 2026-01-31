/**
 * Tests for Claude Code adapter security functions
 * Covers MCP command validation, file name sanitization, and path traversal prevention
 */
import { describe, it, expect } from 'vitest';
import path from 'path';

// ============================================================================
// Security Functions (extracted for testing)
// These should be exported from the adapter module in a production refactor
// ============================================================================

const ALLOWED_MCP_COMMANDS = [
  'npx',
  'node',
  'python',
  'python3',
  'deno',
  'bun',
  'uvx',
] as const;

const BLOCKED_MCP_ARG_PATTERNS = [
  /--eval/i,
  /-e\s/,
  /-c\s/,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\brm\s/i,
  /\bsudo\b/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /[|;&`$]/,
] as const;

interface McpConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

function validateMcpConfig(mcp: McpConfig | undefined): { valid: boolean; error?: string } {
  if (!mcp?.command) {
    return { valid: false, error: 'MCP command is required' };
  }

  const baseCommand = path.basename(mcp.command);

  if (!ALLOWED_MCP_COMMANDS.includes(baseCommand as typeof ALLOWED_MCP_COMMANDS[number])) {
    return {
      valid: false,
      error: `MCP command '${baseCommand}' is not allowed. Allowed: ${ALLOWED_MCP_COMMANDS.join(', ')}`
    };
  }

  if (mcp.args) {
    const argsString = mcp.args.join(' ');
    for (const pattern of BLOCKED_MCP_ARG_PATTERNS) {
      if (pattern.test(argsString)) {
        return {
          valid: false,
          error: `MCP arguments contain blocked pattern: ${pattern.source}`
        };
      }
    }
  }

  return { valid: true };
}

function sanitizeFileName(fileName: string): { safe: boolean; sanitized: string; error?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { safe: false, sanitized: '', error: 'File name cannot be empty' };
  }

  const baseName = path.basename(fileName);

  if (baseName.includes('\0')) {
    return { safe: false, sanitized: '', error: 'File name contains null bytes' };
  }

  if (baseName.startsWith('.') && baseName !== '.md') {
    return { safe: false, sanitized: '', error: 'Hidden files not allowed' };
  }

  const sanitized = baseName.replace(/[<>:"|?*\\]/g, '_');

  if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
    return { safe: false, sanitized: '', error: 'Path traversal detected in file name' };
  }

  if (!sanitized.endsWith('.md')) {
    return { safe: false, sanitized: '', error: 'Only .md files allowed' };
  }

  return { safe: true, sanitized };
}

function sanitizeFolderName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Package name cannot be empty');
  }

  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // Use original
  }

  if (decoded.includes('\0')) {
    throw new Error('Invalid package name: contains null bytes');
  }

  // Extract just the package name (after the /)
  // @cpm/nextjs-rules → nextjs-rules
  let sanitized = decoded.includes('/')
    ? decoded.split('/').pop() || decoded
    : decoded.replace(/^@/, '');

  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/%2e%2e/gi, '');
  sanitized = sanitized.replace(/%2f/gi, '');
  sanitized = sanitized.replace(/%5c/gi, '');
  sanitized = sanitized.replace(/[<>:"|?*\\]/g, '');

  if (!sanitized || sanitized.startsWith('.')) {
    throw new Error(`Invalid package name: ${name}`);
  }

  const normalized = path.normalize(sanitized);
  if (normalized !== sanitized || normalized.includes('..')) {
    throw new Error(`Invalid package name (path traversal detected): ${name}`);
  }

  return sanitized;
}

function isPathWithinDirectory(filePath: string, directory: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(directory);
  return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir;
}

// ============================================================================
// Tests
// ============================================================================

describe('validateMcpConfig', () => {
  describe('allowed commands', () => {
    it('should accept npx command', () => {
      expect(validateMcpConfig({ command: 'npx', args: ['-y', '@modelcontextprotocol/server'] }))
        .toEqual({ valid: true });
    });

    it('should accept node command', () => {
      expect(validateMcpConfig({ command: 'node', args: ['server.js'] }))
        .toEqual({ valid: true });
    });

    it('should accept python commands', () => {
      expect(validateMcpConfig({ command: 'python', args: ['server.py'] }))
        .toEqual({ valid: true });
      expect(validateMcpConfig({ command: 'python3', args: ['server.py'] }))
        .toEqual({ valid: true });
    });

    it('should accept deno command', () => {
      expect(validateMcpConfig({ command: 'deno', args: ['run', 'server.ts'] }))
        .toEqual({ valid: true });
    });

    it('should accept bun command', () => {
      expect(validateMcpConfig({ command: 'bun', args: ['run', 'server.ts'] }))
        .toEqual({ valid: true });
    });

    it('should accept uvx command', () => {
      expect(validateMcpConfig({ command: 'uvx', args: ['mcp-server'] }))
        .toEqual({ valid: true });
    });

    it('should accept full path to allowed command', () => {
      expect(validateMcpConfig({ command: '/usr/bin/node', args: ['server.js'] }))
        .toEqual({ valid: true });
    });
  });

  describe('blocked commands', () => {
    it('should reject bash', () => {
      const result = validateMcpConfig({ command: 'bash', args: ['-c', 'echo hello'] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject sh', () => {
      const result = validateMcpConfig({ command: 'sh', args: ['-c', 'whoami'] });
      expect(result.valid).toBe(false);
    });

    it('should reject curl', () => {
      const result = validateMcpConfig({ command: 'curl', args: ['https://evil.com'] });
      expect(result.valid).toBe(false);
    });

    it('should reject rm', () => {
      const result = validateMcpConfig({ command: 'rm', args: ['-rf', '/'] });
      expect(result.valid).toBe(false);
    });

    it('should reject arbitrary binaries', () => {
      const result = validateMcpConfig({ command: '/tmp/malicious-binary' });
      expect(result.valid).toBe(false);
    });
  });

  describe('blocked arguments', () => {
    it('should reject --eval in args', () => {
      const result = validateMcpConfig({ command: 'node', args: ['--eval', 'process.exit(1)'] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('blocked pattern');
    });

    it('should reject -e flag', () => {
      const result = validateMcpConfig({ command: 'python', args: ['-e ', 'import os'] });
      expect(result.valid).toBe(false);
    });

    it('should reject curl in args', () => {
      const result = validateMcpConfig({ command: 'npx', args: ['-y', 'curl https://evil.com'] });
      expect(result.valid).toBe(false);
    });

    it('should reject wget in args', () => {
      const result = validateMcpConfig({ command: 'node', args: ['wget evil.com'] });
      expect(result.valid).toBe(false);
    });

    it('should reject rm in args', () => {
      const result = validateMcpConfig({ command: 'npx', args: ['rm -rf /'] });
      expect(result.valid).toBe(false);
    });

    it('should reject sudo in args', () => {
      const result = validateMcpConfig({ command: 'npx', args: ['sudo apt install'] });
      expect(result.valid).toBe(false);
    });

    it('should reject shell metacharacters', () => {
      expect(validateMcpConfig({ command: 'node', args: ['test | cat /etc/passwd'] }).valid).toBe(false);
      expect(validateMcpConfig({ command: 'node', args: ['test; rm -rf'] }).valid).toBe(false);
      expect(validateMcpConfig({ command: 'node', args: ['test && evil'] }).valid).toBe(false);
      expect(validateMcpConfig({ command: 'node', args: ['`whoami`'] }).valid).toBe(false);
      expect(validateMcpConfig({ command: 'node', args: ['$(whoami)'] }).valid).toBe(false);
    });
  });

  describe('missing/invalid config', () => {
    it('should reject missing command', () => {
      expect(validateMcpConfig(undefined)).toEqual({
        valid: false,
        error: 'MCP command is required'
      });
    });

    it('should reject empty command', () => {
      expect(validateMcpConfig({ command: '' })).toEqual({
        valid: false,
        error: 'MCP command is required'
      });
    });
  });
});

describe('sanitizeFileName', () => {
  describe('valid file names', () => {
    it('should accept valid markdown files', () => {
      expect(sanitizeFileName('README.md')).toEqual({ safe: true, sanitized: 'README.md' });
      expect(sanitizeFileName('SKILL.md')).toEqual({ safe: true, sanitized: 'SKILL.md' });
      expect(sanitizeFileName('my-rules.md')).toEqual({ safe: true, sanitized: 'my-rules.md' });
    });

    it('should sanitize special characters', () => {
      const result = sanitizeFileName('my<file>.md');
      expect(result.safe).toBe(true);
      expect(result.sanitized).toBe('my_file_.md');
    });
  });

  describe('blocked file names', () => {
    it('should reject empty file names', () => {
      expect(sanitizeFileName('')).toEqual({
        safe: false,
        sanitized: '',
        error: 'File name cannot be empty'
      });
    });

    it('should reject hidden files', () => {
      expect(sanitizeFileName('.hidden.md')).toEqual({
        safe: false,
        sanitized: '',
        error: 'Hidden files not allowed'
      });
    });

    it('should reject non-markdown files', () => {
      expect(sanitizeFileName('script.js')).toEqual({
        safe: false,
        sanitized: '',
        error: 'Only .md files allowed'
      });
      expect(sanitizeFileName('data.json')).toEqual({
        safe: false,
        sanitized: '',
        error: 'Only .md files allowed'
      });
    });

    it('should reject files with null bytes', () => {
      expect(sanitizeFileName('file\0.md')).toEqual({
        safe: false,
        sanitized: '',
        error: 'File name contains null bytes'
      });
    });
  });

  describe('path traversal prevention', () => {
    it('should extract only base name from paths', () => {
      const result = sanitizeFileName('../../../etc/passwd.md');
      // path.basename extracts just 'passwd.md'
      expect(result.safe).toBe(true);
      expect(result.sanitized).toBe('passwd.md');
    });

    it('should extract base name from nested paths', () => {
      const result = sanitizeFileName('/some/nested/path/file.md');
      expect(result.safe).toBe(true);
      expect(result.sanitized).toBe('file.md');
    });
  });
});

describe('sanitizeFolderName', () => {
  describe('valid folder names', () => {
    it('should extract package name from scoped packages', () => {
      expect(sanitizeFolderName('@cpm/nextjs-rules')).toBe('nextjs-rules');
      expect(sanitizeFolderName('@affaan-m/my-skill')).toBe('my-skill');
    });

    it('should handle non-scoped packages', () => {
      expect(sanitizeFolderName('my-package')).toBe('my-package');
    });
  });

  describe('path traversal prevention', () => {
    it('should remove .. sequences', () => {
      expect(sanitizeFolderName('..package')).toBe('package');
      expect(sanitizeFolderName('pkg..name')).toBe('pkgname');
    });

    it('should remove URL-encoded traversal', () => {
      expect(sanitizeFolderName('%2e%2epackage')).toBe('package');
    });

    it('should throw on invalid names after sanitization', () => {
      expect(() => sanitizeFolderName('..')).toThrow();
      expect(() => sanitizeFolderName('')).toThrow();
      expect(() => sanitizeFolderName('.')).toThrow();
    });

    it('should throw on null bytes', () => {
      expect(() => sanitizeFolderName('pkg\0name')).toThrow('null bytes');
    });
  });

  describe('special character handling', () => {
    it('should remove unsafe filesystem characters', () => {
      expect(sanitizeFolderName('pkg<name>')).toBe('pkgname');
      expect(sanitizeFolderName('pkg|name')).toBe('pkgname');
      expect(sanitizeFolderName('pkg"name"')).toBe('pkgname');
    });
  });
});

describe('isPathWithinDirectory', () => {
  it('should return true for paths within directory', () => {
    expect(isPathWithinDirectory('/home/user/dir/file.txt', '/home/user/dir')).toBe(true);
    expect(isPathWithinDirectory('/home/user/dir/sub/file.txt', '/home/user/dir')).toBe(true);
  });

  it('should return true for exact directory match', () => {
    expect(isPathWithinDirectory('/home/user/dir', '/home/user/dir')).toBe(true);
  });

  it('should return false for paths outside directory', () => {
    expect(isPathWithinDirectory('/home/user/other/file.txt', '/home/user/dir')).toBe(false);
    expect(isPathWithinDirectory('/home/user/dir/../other/file.txt', '/home/user/dir')).toBe(false);
  });

  it('should return false for path traversal attempts', () => {
    expect(isPathWithinDirectory('/home/user/dir/../../../etc/passwd', '/home/user/dir')).toBe(false);
  });

  it('should handle similar directory name prefixes correctly', () => {
    // /home/user/directory should not be considered within /home/user/dir
    expect(isPathWithinDirectory('/home/user/directory/file.txt', '/home/user/dir')).toBe(false);
  });
});
