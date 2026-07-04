import os from 'os';
import path from 'path';
import type { IdeTarget, InjectScope } from './types.js';

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
      };
      return map[target];
    }
    return this.globalMcpConfigPath(target);
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
      default:
        return '';
    }
  }

  private globalMcpConfigPath(target: IdeTarget): string {
    switch (target) {
      case 'claude':
        return path.join(this.home, '.claude', 'mcp.json');
      case 'qoder':
        return path.join(this.home, '.qoder', 'mcp.json');
      default:
        return '';
    }
  }
}
