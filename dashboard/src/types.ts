// 与服务端 types.ts 保持一致
export type HitType = 'skill' | 'mcp' | 'agent';

export interface HitEvent {
  type: HitType;
  name: string;
  category: string;
  timestamp: string;
  source: string;
  trigger: string;
  duration?: number;
  success?: boolean;
  metadata?: Record<string, any>;
}

export interface HitStats {
  name: string;
  type: HitType;
  category: string;
  totalHits: number;
  todayHits: number;
  weekHits: number;
  successRate: number;
  avgDuration: number;
  lastHit: string | null;
  sources: Record<string, number>;
}

export interface SkillMeta {
  name: string;
  description: string;
  category: string;
  triggers: string[];
  injectionTargets: string[];
}

export interface CacheEntry {
  name: string;
  category: string;
  description: string;
  cachedAt: string;
}

export interface McpCacheEntry {
  serverName: string;
  command: string;
  args: string[];
  scope: string;
  targets: string[];
  injectedAt: string;
}

export interface McpServerMeta {
  name: string;
  command: string;
  args: string[];
  tools: McpToolMeta[];
  error?: string;
  lastProbed?: string;
}

export interface McpToolMeta {
  serverName: string;
  name: string;
  description: string;
}

export interface DailySnapshot {
  date: string;
  totalHits: number;
  todayHits: number;
  skillCount: number;
  mcpCount: number;
  avgSuccess: number;
  topSkills: { name: string; hits: number }[];
  topMcp: { name: string; hits: number }[];
  updatedAt: string;
}
