import { promises as fs } from 'fs';
import path from 'path';

export interface CacheEntry {
  name: string;
  category: string;
  description: string;
  cachedAt: string;
}

export class SkillCache {
  private cachePath: string;
  private entries: Map<string, CacheEntry> = new Map();

  constructor(cacheDir: string) {
    this.cachePath = path.join(cacheDir, 'skill-cache.json');
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.cachePath, 'utf-8');
      const list: CacheEntry[] = JSON.parse(raw);
      this.entries = new Map(list.map(e => [e.name, e]));
    } catch {
      this.entries = new Map();
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
    await fs.writeFile(this.cachePath, JSON.stringify([...this.entries.values()], null, 2), 'utf-8');
  }

  getAll(): CacheEntry[] {
    return [...this.entries.values()];
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  async add(entry: CacheEntry): Promise<void> {
    this.entries.set(entry.name, entry);
    await this.save();
  }

  async setMany(entries: CacheEntry[]): Promise<void> {
    for (const e of entries) {
      this.entries.set(e.name, e);
    }
    await this.save();
  }

  async remove(name: string): Promise<void> {
    this.entries.delete(name);
    await this.save();
  }

  async clear(): Promise<void> {
    this.entries.clear();
    await this.save();
  }
}
