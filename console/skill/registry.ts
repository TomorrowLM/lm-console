import { promises as fs } from 'fs';
import { glob } from 'glob';
import matter from 'gray-matter';

export interface SkillMeta {
  name: string;
  description: string;
  category: string;
  filePath: string;
  relativePath: string;
  triggers: string[];
  injectionTargets: string[];
}

export class SkillRegistry {
  private skills = new Map<string, SkillMeta>();

  async scan(skillsDir: string): Promise<Map<string, SkillMeta>> {
    this.skills.clear();
    const skillFiles = await glob('**/SKILL.md', { cwd: skillsDir, absolute: true });

    for (const filePath of skillFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = matter(content);
      const relativePath = filePath.replace(skillsDir + '/', '');
      const category = relativePath.split('/')[0];

      if (data.name) {
        this.skills.set(data.name, {
          name: data.name,
          description: data.description || '',
          category,
          filePath,
          relativePath,
          triggers: this.extractTriggers(content),
          injectionTargets: this.detectTargets(content),
        });
      }
    }
    return this.skills;
  }

  get(name: string): SkillMeta | undefined {
    return this.skills.get(name);
  }

  getAll(): SkillMeta[] {
    return [...this.skills.values()];
  }

  getByCategory(category?: string): SkillMeta[] {
    if (!category) return this.getAll();
    return this.getAll().filter(s => s.category === category);
  }

  private extractTriggers(content: string): string[] {
    const found = new Set<string>();
    for (const m of content.matchAll(/["`]([^"`]{2,40}?)["`]\s*(?:→|->|：|时使用|场景|情况|技能|工具|命令)/g)) {
      const t = m[1].trim();
      if (t) found.add(t);
    }
    return [...found].slice(0, 10);
  }

  private detectTargets(content: string): string[] {
    const targets = ['qoder'];
    const map: Record<string, string[]> = {
      claude: ['.claude', 'claude code'],
      copilot: ['copilot', '.github/copilot-instructions'],
      vscode: ['.vscode'],
      openclaw: ['openclaw', 'clawdhub'],
    };
    const lower = content.toLowerCase();
    for (const [name, keywords] of Object.entries(map)) {
      if (keywords.some(k => lower.includes(k))) targets.push(name);
    }
    return [...new Set(targets)];
  }
}
