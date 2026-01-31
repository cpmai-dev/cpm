import fs from 'fs-extra';
import path from 'path';
import type { PackageManifest } from '../types.js';
import { PlatformAdapter, InstallResult } from './base.js';
import { getRulesPath, getSkillsPath, getClaudeCodeHome } from '../utils/platform.js';

/**
 * Sanitize package name for use as folder name
 * Converts @scope/name to scope--name (flat structure)
 * Prevents path traversal attacks
 */
function sanitizeFolderName(name: string): string {
  // Remove @ prefix and replace forward slashes with double dash
  let sanitized = name.replace(/^@/, '').replace(/\//g, '--');

  // Remove any path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  // Remove unsafe characters for file systems
  sanitized = sanitized.replace(/[<>:"|?*\\]/g, '');

  // Ensure the result is not empty and doesn't start with a dot
  if (!sanitized || sanitized.startsWith('.')) {
    throw new Error(`Invalid package name: ${name}`);
  }

  // Final validation: ensure no path components escape
  const testPath = path.join('/test', sanitized);
  const resolved = path.resolve(testPath);
  if (!resolved.startsWith('/test/')) {
    throw new Error(`Invalid package name (path traversal detected): ${name}`);
  }

  return sanitized;
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

  private async installRules(manifest: PackageManifest, _projectPath: string, packagePath?: string): Promise<string[]> {
    const filesWritten: string[] = [];

    // Install to global ~/.claude/rules
    const rulesDir = getRulesPath('claude-code');
    await fs.ensureDir(rulesDir);

    // If packagePath exists and has files, copy all .md files
    if (packagePath && await fs.pathExists(packagePath)) {
      const files = await fs.readdir(packagePath);
      const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'cpm.yaml');

      if (mdFiles.length > 0) {
        for (const file of mdFiles) {
          const srcPath = path.join(packagePath, file);
          const destPath = path.join(rulesDir, file);
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
      const contentFiles = files.filter(f => f.endsWith('.md') && f !== 'cpm.yaml');

      if (contentFiles.length > 0) {
        for (const file of contentFiles) {
          const srcPath = path.join(packagePath, file);
          const destPath = path.join(skillDir, file);
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

    // Install to global ~/.claude.json
    const claudeHome = getClaudeCodeHome();
    const mcpConfigPath = path.join(path.dirname(claudeHome), '.claude.json');

    let existingConfig: Record<string, unknown> = {};

    if (await fs.pathExists(mcpConfigPath)) {
      existingConfig = await fs.readJson(mcpConfigPath);
    }

    // Create new config with immutable patterns (no mutation)
    const existingMcpServers = (existingConfig.mcpServers as Record<string, unknown>) || {};

    const updatedConfig = {
      ...existingConfig,
      mcpServers: {
        ...existingMcpServers,
        [manifest.name]: {
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
