import { promises as fs } from 'fs';
import path from 'path';
import type { IdeTarget, InjectScope, InjectResult } from '../core/types.js';
import { PathResolver } from '../core/path-resolver.js';
import type { SkillMeta } from './registry.js';

export class SkillInjector {
  constructor(
    private resolver: PathResolver,
    private projectRoot: string,
  ) {}

  async inject(skill: SkillMeta, targets: IdeTarget[], scope: InjectScope): Promise<InjectResult[]> {
    const content = await fs.readFile(skill.filePath, 'utf-8');
    return Promise.all(targets.map(t => this.injectOne(skill, content, t, scope)));
  }

  private async injectOne(skill: SkillMeta, content: string, target: IdeTarget, scope: InjectScope): Promise<InjectResult> {
    const targetPath = this.resolver.skillFilePath(target, scope, this.projectRoot, skill.name);
    try {
      await this.writeToTarget(skill, content, target, scope);
      return { target, type: 'skill', name: skill.name, status: 'ok', targetPath };
    } catch (e: any) {
      return { target, type: 'skill', name: skill.name, status: 'error', targetPath, error: e.message };
    }
  }

  private async writeToTarget(skill: SkillMeta, content: string, target: IdeTarget, scope: InjectScope): Promise<void> {
    switch (target) {
      case 'qoder':
        await this.writeQoder(skill, content, scope);
        break;
      case 'claude':
      case 'openclaw':
        await this.writeGeneric(target, skill.name, content, scope);
        break;
      case 'vscode':
        await this.writeGeneric('vscode', skill.name, content, scope);
        break;
      case 'copilot':
        await this.writeCopilot(skill, content);
        break;
    }
  }

  private async writeQoder(skill: SkillMeta, content: string, scope: InjectScope): Promise<void> {
    const dir = this.resolver.skillDir('qoder', scope, this.projectRoot);
    const skillDir = path.join(dir, skill.name);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), content, 'utf-8');

    if (scope === 'project') {
      const cmdDir = path.join(this.projectRoot, '.qoder', 'commands', skill.name);
      await fs.mkdir(cmdDir, { recursive: true });
      await fs.writeFile(
        path.join(cmdDir, 'config.json'),
        JSON.stringify({ command: skill.name, description: skill.description, skill: skill.name }, null, 2),
        'utf-8',
      );
    }
  }

  private async writeGeneric(target: IdeTarget, name: string, content: string, scope: InjectScope): Promise<void> {
    const dir = this.resolver.skillDir(target, scope, this.projectRoot);
    if (!dir) return;
    const skillDir = path.join(dir, name);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), content, 'utf-8');
  }

  private async writeCopilot(skill: SkillMeta, content: string): Promise<void> {
    const filePath = path.join(this.projectRoot, '.github', 'copilot-instructions.md');
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
}
