import os from 'os';
import path from 'path';
import crypto from 'crypto';
import type { IdeTarget, InjectScope } from './types.js';

/** 将服务器名称转为目录安全 ID */
function sanitizeServerId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const hash = crypto.createHash('md5').update(name).digest('hex').slice(0, 8);
  return `${base}-${hash}`;
}

export class PathResolver {
  private home = os.homedir();
  private isWin = os.platform() === 'win32';

  skillDir(target: IdeTarget, scope: InjectScope, projectRoot: string): string {
    if (scope === 'project') {
      const map: Record<IdeTarget, string> = {
        qoder: path.join(projectRoot, '.qoder', 'skills'),
        claude: path.join(projectRoot, '.claude', 'skills'),
        vscode: path.join(projectRoot, '.vscode', 'globalStorage', 'lm-console', 'skills'),
        copilot: path.join(projectRoot, '.github'),
        openclaw: path.join(projectRoot, '.openclaw', 'skills'),
        trae: path.join(projectRoot, '.trae', 'skills'),
      };
      return map[target];
    }
    return this.globalSkillDir(target);
  }

  skillFilePath(target: IdeTarget, scope: InjectScope, projectRoot: string, skillName: string): string {
    const base = this.skillDir(target, scope, projectRoot);
    if (target === 'copilot' && scope === 'project') {
      return path.join(base, 'copilot-instructions.md');
    }
    return path.join(base, skillName, 'SKILL.md');
  }

  mcpConfigPath(target: IdeTarget, scope: InjectScope, projectRoot: string): string {
    if (scope === 'project') {
      const map: Record<IdeTarget, string> = {
        qoder: path.join(projectRoot, '.qoder', 'mcp.json'),
        claude: path.join(projectRoot, '.claude', 'mcp.json'),
        vscode: path.join(projectRoot, '.vscode', 'mcp.json'),
        copilot: '',
        openclaw: '',
        trae: path.join(projectRoot, '.trae', 'mcp.json'),
      };
      return map[target];
    }
    return this.globalMcpConfigPath(target);
  }

  /** 返回 Trae IDE 的 MCP 目录基础路径（用于目录结构注入） */
  traeMcpBaseDir(scope: InjectScope, projectRoot: string): string {
    if (scope === 'project') {
      return path.join(projectRoot, '.trae', 'mcps');
    }
    return path.join(this.home, '.trae', 'mcps');
  }

  /**
   * 返回 Trae IDE MCP 服务器的完整目录路径
   * Trae 格式: <base>/<server-id>/solo_agent/<server-name>/
   */
  traeMcpServerDir(scope: InjectScope, projectRoot: string, serverName: string): string {
    const base = this.traeMcpBaseDir(scope, projectRoot);
    const serverId = sanitizeServerId(serverName);
    return path.join(base, serverId, 'solo_agent', serverName);
  }

  private globalSkillDir(target: IdeTarget): string {
    switch (target) {
      case 'qoder':
        return path.join(this.home, '.qoder', 'skills');
      case 'claude':
        return path.join(this.home, '.claude', 'skills');
      case 'openclaw':
        return path.join(this.home, '.openclaw', 'skills');
      case 'vscode':
        return this.isWin
          ? path.join(this.home, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'lm-console', 'skills')
          : path.join(this.home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'lm-console', 'skills');
      case 'trae':
        // Trae IDE 的全局技能存放在 ~/.trae/skills/
        return path.join(this.home, '.trae', 'skills');
      default:
        return '';
    }
  }

  private globalMcpConfigPath(target: IdeTarget): string {
    switch (target) {
      case 'claude':
        return path.join(this.home, '.claude', 'mcp.json');
      case 'qoder':
        // Qoder 在 macOS 上的实际 MCP 配置路径
        if (os.platform() === 'darwin') {
          return path.join(this.home, 'Library', 'Application Support', 'Qoder', 'SharedClientCache', 'mcp.json');
        }
        // Windows / Linux fallback
        if (os.platform() === 'win32') {
          return path.join(process.env.APPDATA || path.join(this.home, 'AppData', 'Roaming'), 'Qoder', 'SharedClientCache', 'mcp.json');
        }
        return path.join(this.home, '.config', 'Qoder', 'SharedClientCache', 'mcp.json');
      case 'trae':
        // Trae IDE 的全局 MCP 配置实际路径
        if (os.platform() === 'darwin') {
          return path.join(this.home, 'Library', 'Application Support', 'Trae', 'User', 'mcp.json');
        }
        if (os.platform() === 'win32') {
          return path.join(process.env.APPDATA || path.join(this.home, 'AppData', 'Roaming'), 'Trae', 'User', 'mcp.json');
        }
        return path.join(this.home, '.config', 'Trae', 'User', 'mcp.json');
      default:
        return '';
    }
  }
}
