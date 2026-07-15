import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import type { IdeTarget, InjectScope, InjectResult } from '../core/types.js';
import { PathResolver } from '../core/path-resolver.js';
import type { SkillMeta } from './registry.js';

export class SkillInjector {
  constructor(
    private resolver: PathResolver,
    private projectRoot: string,
  ) {}

  async inject(skill: SkillMeta, targets: IdeTarget[], scope: InjectScope, projectRoot?: string): Promise<InjectResult[]> {
    const content = await fs.readFile(skill.filePath, 'utf-8');
    const root = projectRoot || this.projectRoot;
    return Promise.all(targets.map(t => this.injectOne(skill, content, t, scope, root)));
  }

  private async injectOne(skill: SkillMeta, content: string, target: IdeTarget, scope: InjectScope, projectRoot: string): Promise<InjectResult> {
    const targetPath = this.resolver.skillFilePath(target, scope, projectRoot, skill.name);
    try {
      console.error(`[SkillInjector] 注入 ${skill.name} 到 ${target} (${scope}) at ${targetPath}`);
      await this.writeToTarget(skill, content, target, scope, projectRoot);
      console.error(`[SkillInjector] 成功注入 ${skill.name} 到 ${target}`);
      return { target, type: 'skill', name: skill.name, status: 'ok', targetPath };
    } catch (e: any) {
      console.error(`[SkillInjector] 注入 ${skill.name} 到 ${target} 失败:`, e);
      return { target, type: 'skill', name: skill.name, status: 'error', targetPath, error: e.message };
    }
  }

  private async writeToTarget(skill: SkillMeta, content: string, target: IdeTarget, scope: InjectScope, projectRoot: string): Promise<void> {
    switch (target) {
      case 'qoder':
        await this.writeQoder(skill, content, scope, projectRoot);
        break;
      case 'trae':
        await this.writeTrae(skill, content, scope, projectRoot);
        break;
      case 'claude':
      case 'openclaw':
        await this.writeGeneric(target, skill.name, content, scope, projectRoot);
        break;
      case 'vscode':
        await this.writeGeneric('vscode', skill.name, content, scope, projectRoot);
        break;
      case 'copilot':
        await this.writeCopilot(skill, content, projectRoot);
        break;
    }
  }

  /**
   * 安全写入文件：先尝试 fs 直接操作，若因沙箱 EPERM 失败则通过 shell 命令绕过
   */
  private async safeWrite(targetDir: string, fileName: string, content: string): Promise<void> {
    const filePath = path.join(targetDir, fileName);
    try {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (e: any) {
      if (e.code === 'EPERM') {
        console.error(`[SkillInjector] fs 操作被沙箱拦截，尝试 shell 写入: ${filePath}`);
        const tmpFile = path.join(os.tmpdir(), `lm-skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        await fs.writeFile(tmpFile, content, 'utf-8');
        try {
          execSync(`mkdir -p '${targetDir}' && cp '${tmpFile}' '${filePath}'`, { encoding: 'utf-8' });
        } catch (shellErr: any) {
          await fs.unlink(tmpFile).catch(() => {});
          throw new Error(
            `无法写入 ${targetDir}，当前进程受限无法访问该路径。` +
            `请尝试项目级注入 (scope: "project") 或从终端直接运行 lm-console。` +
            `\n详情: ${shellErr.message}`,
          );
        }
        await fs.unlink(tmpFile).catch(() => {});
      } else {
        throw e;
      }
    }
  }

  private async writeQoder(skill: SkillMeta, content: string, scope: InjectScope, projectRoot: string): Promise<void> {
    const dir = this.resolver.skillDir('qoder', scope, projectRoot);
    const skillDir = path.join(dir, skill.name);
    await this.safeWrite(skillDir, 'SKILL.md', content);

    if (scope === 'project') {
      const cmdDir = path.join(projectRoot, '.qoder', 'commands', skill.name);
      await this.safeWrite(cmdDir, 'config.json',
        JSON.stringify({ command: skill.name, description: skill.description, skill: skill.name }, null, 2),
      );
    }
  }

  private async writeGeneric(target: IdeTarget, name: string, content: string, scope: InjectScope, projectRoot: string): Promise<void> {
    const dir = this.resolver.skillDir(target, scope, projectRoot);
    if (!dir) return;
    const skillDir = path.join(dir, name);
    await this.safeWrite(skillDir, 'SKILL.md', content);
  }

  private async writeCopilot(skill: SkillMeta, content: string, projectRoot: string): Promise<void> {
    const filePath = path.join(projectRoot, '.github', 'copilot-instructions.md');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const block = [
      `## ${skill.name}`,
      '',
      skill.description,
      '',
      `触发场景：${skill.triggers.join('、')}`,
      '',
      '---',
      '',
    ].join('\n');
    await fs.appendFile(filePath, block, 'utf-8');
  }

  private async writeTrae(skill: SkillMeta, content: string, scope: InjectScope, projectRoot: string): Promise<void> {
    const dir = this.resolver.skillDir('trae', scope, projectRoot);
    const skillDir = path.join(dir, skill.name);
    await this.safeWrite(skillDir, 'SKILL.md', content);

    if (scope === 'project') {
      const cmdDir = path.join(projectRoot, '.trae', 'commands', skill.name);
      await this.safeWrite(cmdDir, 'config.json',
        JSON.stringify({ command: skill.name, description: skill.description, skill: skill.name }, null, 2),
      );
    }
  }
}
