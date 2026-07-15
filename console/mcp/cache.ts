import { promises as fs } from 'fs';
import path from 'path';

export interface McpCacheEntry {
  serverName: string;
  command: string;
  args: string[];
  scope: string;
  targets: string[];
  injectedAt: string;
}

export class McpCache {
  private cachePath: string;
  private entries: Map<string, McpCacheEntry> = new Map();

  constructor(cacheDir: string) {
    this.cachePath = path.join(cacheDir, 'mcp-cache.json');
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.cachePath, 'utf-8');
      const list: McpCacheEntry[] = JSON.parse(raw);
      this.entries = new Map(list.map(e => [e.serverName, e]));
    } catch {
      this.entries = new Map();
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
    await fs.writeFile(this.cachePath, JSON.stringify([...this.entries.values()], null, 2), 'utf-8');
  }

  getAll(): McpCacheEntry[] {
    return [...this.entries.values()];
  }

  has(serverName: string): boolean {
    return this.entries.has(serverName);
  }

  async add(entry: McpCacheEntry): Promise<void> {
    this.entries.set(entry.serverName, entry);
    await this.save();
  }

  async remove(serverName: string): Promise<void> {
    this.entries.delete(serverName);
    await this.save();
  }

  async clear(): Promise<void> {
    this.entries.clear();
    await this.save();
  }
}
