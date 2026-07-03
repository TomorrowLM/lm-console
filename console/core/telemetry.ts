import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import type { HitEvent, HitStats, HitType } from './types.js';

export class Telemetry extends EventEmitter {
  private events: HitEvent[] = [];
  private logFile: string;
  private maxEvents = 5000;

  constructor(logDir: string) {
    super();
    this.logFile = path.join(logDir, 'telemetry.jsonl');
    this.load();
    setInterval(() => this.persist(), 5000);
    setInterval(() => this.trim(), 60000);
  }

  record(event: Omit<HitEvent, 'timestamp'>): void {
    const ev: HitEvent = { ...event, timestamp: new Date().toISOString() };
    this.events.push(ev);
    this.emit('hit', ev);
  }

  getStats(type?: HitType): Map<string, HitStats> {
    const map = new Map<string, HitStats>();
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    for (const ev of this.events) {
      if (type && ev.type !== type) continue;
      const key = ev.type === 'skill' ? `skill:${ev.name}` : `mcp:${ev.category}.${ev.name}`;
      if (!map.has(key)) {
        map.set(key, {
          name: ev.name, type: ev.type, category: ev.category,
          totalHits: 0, todayHits: 0, weekHits: 0,
          successRate: 1, avgDuration: 0, lastHit: null, sources: {},
        });
      }
      const s = map.get(key)!;
      s.totalHits++;
      if (new Date(ev.timestamp).toDateString() === today) s.todayHits++;
      if (new Date(ev.timestamp) > weekAgo) s.weekHits++;
      s.sources[ev.source] = (s.sources[ev.source] || 0) + 1;
      s.lastHit = ev.timestamp;
    }

    for (const s of map.values()) {
      const related = this.events.filter(e => e.type === s.type && e.name === s.name && e.category === s.category);
      const ok = related.filter(e => e.success !== false).length;
      s.successRate = related.length > 0 ? ok / related.length : 1;
      const dur = related.filter(e => e.duration != null);
      s.avgDuration = dur.length > 0
        ? dur.reduce((a, b) => a + (b.duration || 0), 0) / dur.length
        : 0;
    }
    return map;
  }

  getRecent(limit = 50): HitEvent[] {
    return this.events.slice(-limit).reverse();
  }

  private trim(): void {
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  private async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.logFile, 'utf-8');
      for (const line of content.trim().split('\n').slice(-2000)) {
        try { this.events.push(JSON.parse(line)); } catch { /* ignore */ }
      }
    } catch { /* no data */ }
  }

  private async persist(): Promise<void> {
    if (this.events.length === 0) return;
    try {
      const dirPath = path.dirname(this.logFile);
      await fs.mkdir(dirPath, { recursive: true });
      const batch = this.events.slice(-50);
      await fs.appendFile(this.logFile, batch.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
    } catch { /* silent */ }
  }
}
