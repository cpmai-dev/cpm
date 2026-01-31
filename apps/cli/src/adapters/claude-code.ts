import fs from 'fs-extra';
import path from 'path';
import type { PackageManifest } from '../types.js';
import { PlatformAdapter, InstallResult } from './base.js';
import { getRulesPath, getSkillsPath, getClaudeCodeHome } from '../utils/platform.js';

/**
 * Allowed commands for MCP servers (security allowlist)
 * Only these commands can be configured in .claude.json
 */
const ALLOWED_MCP_COMMANDS = [
  'npx',
  'node',
  'python',
  'python3',
  'deno',
  'bun',
  'uvx',
] as const;

/**
 * Blocked patterns in MCP arguments (security blocklist)
 */
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
  /[|;&`$]/,  // Shell metacharacters
] as const;

/**
 * Validate MCP configuration for security
 */
function validateMcpConfig(mcp: PackageManifest['mcp']): { valid: boolean; error?: string } {
  if (!mcp?.command) {
    return { valid: false, error: 'MCP command is required' };
  }

  // Extract base command (handle paths like /usr/bin/node)
  const baseCommand = path.basename(mcp.command);

  if (!ALLOWED_MCP_COMMANDS.includes(baseCommand as typeof ALLOWED_MCP_COMMANDS[number])) {
    return {
      valid: false,
      error: `MCP command '${baseCommand}' is not allowed. Allowed: ${ALLOWED_MCP_COMMANDS.join(', ')}`
    };
  }

  // Check arguments for dangerous patterns
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

/**
 * Sanitize a single file name (not a path)
 * Prevents path traversal via malicious file names
 */
function sanitizeFileName(fileName: string): { safe: boolean; sanitized: string; error?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { safe: false, sanitized: '', error: 'File name cannot be empty' };
  }

  // Get just the base name (no directory components)
  const baseName = path.basename(fileName);

  // Check for null bytes
  if (baseName.includes('\0')) {
    return { safe: false, sanitized: '', error: 'File name contains null bytes' };
  }

  // Check for hidden files (starting with .)
  if (baseName.startsWith('.') && baseName !== '.md') {
    return { safe: false, sanitized: '', error: 'Hidden files not allowed' };
  }

  // Remove any remaining unsafe characters
  const sanitized = baseName.replace(/[<>:"|?*\\]/g, '_');

  // Verify no path traversal after sanitization
  if (sanitized.includes('..') || sanitized.includes('/') || sanitized.includes('\\')) {
    return { safe: false, sanitized: '', error: 'Path traversal detected in file name' };
  }

  // Must end with .md for our use case
  if (!sanitized.endsWith('.md')) {
    return { safe: false, sanitized: '', error: 'Only .md files allowed' };
  }

  return { safe: true, sanitized };
}

/**
 * Sanitize package name for use as folder name
 * Converts @scope/name to scope--name (flat structure)
 * Prevents path traversal attacks
 */
function sanitizeFolderName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Package name cannot be empty');
  }

  // Decode any URL encoding first
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // If decoding fails, use original
  }

  // Check for null bytes
  if (decoded.includes('\0')) {
    throw new Error('Invalid package name: contains null bytes');
  }

  // Remove @ prefix and replace forward slashes with double dash
  let sanitized = decoded.replace(/^@/, '').replace(/\//g, '--');

  // Remove any path traversal attempts (including encoded)
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/%2e%2e/gi, '');
  sanitized = sanitized.replace(/%2f/gi, '');
  sanitized = sanitized.replace(/%5c/gi, '');

  // Remove unsafe characters for file systems
  sanitized = sanitized.replace(/[<>:"|?*\\]/g, '');

  // Ensure the result is not empty and doesn't start with a dot
  if (!sanitized || sanitized.startsWith('.')) {
    throw new Error(`Invalid package name: ${name}`);
  }

  // Normalize and verify no escape
  const normalized = path.normalize(sanitized);
  if (normalized !== sanitized || normalized.includes('..')) {
    throw new Error(`Invalid package name (path traversal detected): ${name}`);
  }

  // Final validation: ensure no path components escape
  const testPath = path.join('/test', sanitized);
  const resolved = path.resolve(testPath);
  if (!resolved.startsWith('/test/')) {
    throw new Error(`Invalid package name (path traversal detected): ${name}`);
  }

  return sanitized;
}

/**
 * Verify destination path is within allowed directory
 */
function isPathWithinDirectory(filePath: string, directory: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(directory);
  return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir;
}

export class ClaudeCodeAdapter extends PlatformAdapter {
  platform = 'claude-code' as const;
  displayName = 'Claude Code';

  async isAvailable(projectPath: string): Promise<boolean> {
    // Claude Code is always "available" - we can create the config
    return true;
  }

  async install(manifest: PackageManifest, projectPath: string, packagePath?: string): Promise<InstallResult> {
    const filesWritten: string[] = [];

    try {
      // Handle based on primary type - each package goes to ONE location
      switch (manifest.type) {
        case 'rules': {
          const rulesResult = await this.installRules(manifest, projectPath, packagePath);
          filesWritten.push(...rulesResult);
          break;
        }
        case 'skill': {
          const skillResult = await this.installSkill(manifest, projectPath, packagePath);
          filesWritten.push(...skillResult);
          break;
        }
        case 'mcp': {
          const mcpResult = await this.installMcp(manifest, projectPath);
          filesWritten.push(...mcpResult);
          break;
        }
        default:
          // Fallback: determine by what's defined in manifest
          if (manifest.skill) {
            const skillResult = await this.installSkill(manifest, projectPath, packagePath);
            filesWritten.push(...skillResult);
          } else if (manifest.mcp) {
            const mcpResult = await this.installMcp(manifest, projectPath);
            filesWritten.push(...mcpResult);
          } else if (manifest.universal?.rules) {
            const rulesResult = await this.installRules(manifest, projectPath, packagePath);
            filesWritten.push(...rulesResult);
          }
      }

      return {
        success: true,
        platform: 'claude-code',
        filesWritten,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'claude-code',
        filesWritten,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async uninstall(packageName: string, _projectPath: string): Promise<InstallResult> {
    const filesWritten: string[] = [];
    const folderName = sanitizeFolderName(packageName);

    try {
      // Remove rules file (from global ~/.claude/rules)
      const rulesDir = getRulesPath('claude-code');
      const rulesPath = path.join(rulesDir, `${folderName}.md`);
      if (await fs.pathExists(rulesPath)) {
        await fs.remove(rulesPath);
        filesWritten.push(rulesPath);
      }

      // Remove skill directory (from global ~/.claude/skills)
      const skillsDir = getSkillsPath();
      const skillPath = path.join(skillsDir, folderName);
      if (await fs.pathExists(skillPath)) {
        await fs.remove(skillPath);
        filesWritten.push(skillPath);
      }

      // Remove MCP server from ~/.claude.json
      await this.removeMcpServer(folderName, filesWritten);

      return {
        success: true,
        platform: 'claude-code',
        filesWritten,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'claude-code',
        filesWritten,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove an MCP server configuration from ~/.claude.json
   */
  private async removeMcpServer(serverName: string, filesWritten: string[]): Promise<void> {
    const claudeHome = getClaudeCodeHome();
    const mcpConfigPath = path.join(path.dirname(claudeHome), '.claude.json');

    if (!await fs.pathExists(mcpConfigPath)) {
      return;
    }

    try {
      const config = await fs.readJson(mcpConfigPath);
      const mcpServers = config.mcpServers as Record<string, unknown> | undefined;

      if (!mcpServers || !mcpServers[serverName]) {
        return;
      }

      // Create new config without the server (immutable)
      const { [serverName]: _removed, ...remainingServers } = mcpServers;

      const updatedConfig = {
        ...config,
        mcpServers: remainingServers,
      };

      await fs.writeJson(mcpConfigPath, updatedConfig, { spaces: 2 });
      filesWritten.push(mcpConfigPath);
    } catch (error) {
      // Log but don't fail uninstall if MCP removal fails
      console.warn(`Warning: Could not update MCP config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async installRules(manifest: PackageManifest, _projectPath: string, packagePath?: string): Promise<string[]> {
    const filesWritten: string[] = [];

    // Install to global ~/.claude/rules
    const rulesDir = getRulesPath('claude-code');
    await fs.ensureDir(rulesDir);

    // If packagePath exists and has files, copy all .md files
    if (packagePath && await fs.pathExists(packagePath)) {
      const files = await fs.readdir(packagePath);
      const mdFiles = files.filter(f => f.endsWith('.md') && f.toLowerCase() !== 'cpm.yaml');

      if (mdFiles.length > 0) {
        for (const file of mdFiles) {
          // Validate and sanitize file name for security
          const validation = sanitizeFileName(file);
          if (!validation.safe) {
            console.warn(`Skipping unsafe file: ${file} (${validation.error})`);
            continue;
          }

          const srcPath = path.join(packagePath, file);
          const destPath = path.join(rulesDir, validation.sanitized);

          // Verify destination is within allowed directory
          if (!isPathWithinDirectory(destPath, rulesDir)) {
            console.warn(`Blocked path traversal attempt: ${file}`);
            continue;
          }

          await fs.copy(srcPath, destPath);
          filesWritten.push(destPath);
        }
        return filesWritten;
      }
    }

    // Fallback: create rules from manifest content
    const rulesContent = manifest.universal?.rules || manifest.universal?.prompt;
    if (!rulesContent) return filesWritten;

    const fileName = sanitizeFolderName(manifest.name);
    const rulesPath = path.join(rulesDir, `${fileName}.md`);
    const content = `# ${manifest.name}\n\n${manifest.description}\n\n${rulesContent.trim()}\n`;

    await fs.ensureDir(path.dirname(rulesPath));
    await fs.writeFile(rulesPath, content, 'utf-8');
    filesWritten.push(rulesPath);

    return filesWritten;
  }

  private async installSkill(manifest: PackageManifest, _projectPath: string, packagePath?: string): Promise<string[]> {
    const filesWritten: string[] = [];

    if (!manifest.skill) return filesWritten;

    // Install to global ~/.claude/skills with sanitized folder name
    const skillsDir = getSkillsPath();
    const folderName = sanitizeFolderName(manifest.name);
    const skillDir = path.join(skillsDir, folderName);
    await fs.ensureDir(skillDir);

    // If packagePath exists and has files, copy entire folder
    if (packagePath && await fs.pathExists(packagePath)) {
      const files = await fs.readdir(packagePath);
      const contentFiles = files.filter(f => f.endsWith('.md') && f.toLowerCase() !== 'cpm.yaml');

      if (contentFiles.length > 0) {
        for (const file of contentFiles) {
          // Validate and sanitize file name for security
          const validation = sanitizeFileName(file);
          if (!validation.safe) {
            console.warn(`Skipping unsafe file: ${file} (${validation.error})`);
            continue;
          }

          const srcPath = path.join(packagePath, file);
          const destPath = path.join(skillDir, validation.sanitized);

          // Verify destination is within allowed directory
          if (!isPathWithinDirectory(destPath, skillDir)) {
            console.warn(`Blocked path traversal attempt: ${file}`);
            continue;
          }

          await fs.copy(srcPath, destPath);
          filesWritten.push(destPath);
        }
        return filesWritten;
      }
    }

    // Fallback: create SKILL.md from manifest content
    const skillContent = this.formatSkillMd(manifest);
    const skillPath = path.join(skillDir, 'SKILL.md');
    await fs.writeFile(skillPath, skillContent, 'utf-8');
    filesWritten.push(skillPath);

    return filesWritten;
  }

  private async installMcp(manifest: PackageManifest, _projectPath: string): Promise<string[]> {
    const filesWritten: string[] = [];

    if (!manifest.mcp) return filesWritten;

    // Validate MCP configuration for security
    const mcpValidation = validateMcpConfig(manifest.mcp);
    if (!mcpValidation.valid) {
      throw new Error(`MCP security validation failed: ${mcpValidation.error}`);
    }

    // Install to global ~/.claude.json
    const claudeHome = getClaudeCodeHome();
    const mcpConfigPath = path.join(path.dirname(claudeHome), '.claude.json');

    let existingConfig: Record<string, unknown> = {};

    if (await fs.pathExists(mcpConfigPath)) {
      try {
        existingConfig = await fs.readJson(mcpConfigPath);
      } catch (error) {
        console.warn(`Warning: Could not parse ${mcpConfigPath}, creating new config`);
        existingConfig = {};
      }
    }

    // Sanitize the package name for use as key
    const sanitizedName = sanitizeFolderName(manifest.name);

    // Create new config with immutable patterns (no mutation)
    const existingMcpServers = (existingConfig.mcpServers as Record<string, unknown>) || {};

    const updatedConfig = {
      ...existingConfig,
      mcpServers: {
        ...existingMcpServers,
        [sanitizedName]: {
          command: manifest.mcp.command,
          args: manifest.mcp.args,
          env: manifest.mcp.env,
        },
      },
    };

    await fs.writeJson(mcpConfigPath, updatedConfig, { spaces: 2 });
    filesWritten.push(mcpConfigPath);

    return filesWritten;
  }

  private formatSkillMd(manifest: PackageManifest): string {
    if (!manifest.skill) {
      throw new Error('Cannot format skill markdown: manifest.skill is undefined');
    }

    const skill = manifest.skill;
    const content = manifest.universal?.prompt || manifest.universal?.rules || '';

    return `---
name: ${manifest.name}
command: ${skill.command || `/${manifest.name}`}
description: ${skill.description || manifest.description}
version: ${manifest.version}
---

# ${manifest.name}

${manifest.description}

## Instructions

${content.trim()}
`;
  }
}
