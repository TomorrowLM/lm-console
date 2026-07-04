export type HitType = 'skill' | 'mcp' | 'agent';
export type IdeTarget = 'qoder' | 'claude' | 'vscode' | 'copilot' | 'openclaw' | 'trae';
export type InjectScope = 'global' | 'project';

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

export interface InjectResult {
  target: IdeTarget;
  type: 'skill' | 'mcp';
  name: string;
  status: 'ok' | 'skipped' | 'error';
  targetPath: string;
  error?: string;
}
