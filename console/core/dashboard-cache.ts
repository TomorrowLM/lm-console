import { promises as fs } from 'fs';
import path from 'path';

export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  totalHits: number;
  todayHits: number;
  skillCount: number;
  mcpCount: number;
  avgSuccess: number;
  topSkills: { name: string; hits: number }[];
  topMcp: { name: string; hits: number }[];
  updatedAt: string;
}

export class DashboardCache {
  private cachePath: string;
  private snapshots: Map<string, DailySnapshot> = new Map();

  constructor(cacheDir: string) {
    this.cachePath = path.join(cacheDir, 'dashboard-cache.json');
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.cachePath, 'utf-8');
      const list: DailySnapshot[] = JSON.parse(raw);
      this.snapshots = new Map(list.map(s => [s.date, s]));
    } catch {
      this.snapshots = new Map();
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.cachePath), { recursive: true });
    // 只保留最近 90 天的快照
    const list = [...this.snapshots.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 90);
    await fs.writeFile(this.cachePath, JSON.stringify(list, null, 2), 'utf-8');
  }

  /** 获取指定日期的快照 */
  getSnapshot(date: string): DailySnapshot | undefined {
    return this.snapshots.get(date);
  }

  /** 获取所有快照（按日期倒序） */
  getAllSnapshots(): DailySnapshot[] {
    return [...this.snapshots.values()].sort((a, b) => b.date.localeCompare(a.date));
  }

  /** 获取最近 N 天的快照 */
  getRecentSnapshots(days: number): DailySnapshot[] {
    const result: DailySnapshot[] = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const snap = this.snapshots.get(dateStr);
      if (snap) result.push(snap);
    }
    return result;
  }

  /** 存储或更新今日快照 */
  async upsertSnapshot(snapshot: DailySnapshot): Promise<void> {
    snapshot.updatedAt = new Date().toISOString();
    this.snapshots.set(snapshot.date, snapshot);
    await this.save();
  }
}
