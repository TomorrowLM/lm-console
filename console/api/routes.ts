import { IncomingMessage, ServerResponse } from 'http';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import type { IdeTarget, InjectScope, InjectResult } from '../core/types.js';
import type { SkillRegistry } from '../skill/registry.js';
import type { SkillCache, CacheEntry } from '../skill/cache.js';
import type { SkillInjector } from '../skill/injection.js';
import type { McpRegistry } from '../mcp/registry.js';
import type { McpInjector } from '../mcp/injection.js';
import type { McpCache } from '../mcp/cache.js';
import type { Telemetry } from '../core/telemetry.js';
import type { DashboardCache } from '../core/dashboard-cache.js';

export function createApiRouter(
  skills: SkillRegistry,
  skillCache: SkillCache,
  skillInjector: SkillInjector,
  mcpRegistry: McpRegistry,
  mcpInjector: McpInjector,
  mcpCache: McpCache,
  telemetry: Telemetry,
  dashboardCache: DashboardCache,
) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const sendJson = (data: any, status = 200) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
      res.writeHead(status, headers);
      res.end(JSON.stringify(data));
    };

    if (req.method === 'OPTIONS') return sendJson({});

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = req.method || 'GET';

    try {
      // POST /api/pick-folder — 打开原生文件夹选择器
      if (method === 'POST' && url.pathname === '/api/pick-folder') {
        try {
          const result = execSync("osascript -e 'POSIX path of (choose folder)'", { encoding: 'utf-8', timeout: 60000 }).trim();
          return sendJson({ path: result });
        } catch {
          return sendJson({ cancelled: true });
        }
      }

      // GET /api/browse-dir — 浏览目录（用于文件夹选择器）
      if (method === 'GET' && url.pathname === '/api/browse-dir') {
        const dirPath = url.searchParams.get('path') || '/';
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          const dirs = entries
            .filter(e => e.isDirectory() && !e.name.startsWith('.'))
            .map(e => e.name)
            .sort((a, b) => a.localeCompare(b));
          const parent = path.dirname(dirPath);
          return sendJson({ path: dirPath, parent: parent !== dirPath ? parent : null, dirs });
        } catch {
          return sendJson({ error: '无法访问该目录' }, 400);
        }
      }

      // GET /api/skills — 获取已发现的技能
      if (method === 'GET' && url.pathname === '/api/skills') {
        const category = url.searchParams.get('category') || undefined;
        return sendJson(skills.getByCategory(category));
      }

      // GET /api/skills/cached — 获取已缓存的技能
      if (method === 'GET' && url.pathname === '/api/skills/cached') {
        return sendJson(skillCache.getAll());
      }

      // POST /api/skills/cache — 缓存选中的技能
      if (method === 'POST' && url.pathname === '/api/skills/cache') {
        const body = JSON.parse(await readBody(req));
        const names: string[] = body.names || [];
        const entries: CacheEntry[] = [];
        for (const name of names) {
          const skill = skills.get(name);
          if (skill) {
            entries.push({
              name: skill.name,
              category: skill.category,
              description: skill.description,
              cachedAt: new Date().toISOString(),
            });
          }
        }
        if (body.clear === true) {
          await skillCache.clear();
        }
        await skillCache.setMany(entries);
        return sendJson({ ok: true, count: entries.length });
      }

      // DELETE /api/skills/cache — 移除缓存的技能
      if (method === 'DELETE' && url.pathname === '/api/skills/cache') {
        const name = url.searchParams.get('name');
        if (name) {
          await skillCache.remove(name);
        } else {
          await skillCache.clear();
        }
        return sendJson({ ok: true });
      }

      // GET /api/mcp-servers
      if (method === 'GET' && url.pathname === '/api/mcp-servers') {
        return sendJson(mcpRegistry.getServers().map(s => ({
          name: s.name,
          command: s.command,
          args: s.args,
          tools: s.tools,
          error: s.error,
          lastProbed: s.lastProbed,
        })));
      }

      // POST /api/probe
      if (method === 'POST' && url.pathname === '/api/probe') {
        const { serverName } = JSON.parse(await readBody(req));
        await mcpRegistry.probeTools(serverName);
        return sendJson({ ok: true });
      }

      // POST /api/inject/skill — 注入单个技能
      if (method === 'POST' && url.pathname === '/api/inject/skill') {
        const body = JSON.parse(await readBody(req));
        const scope: InjectScope = body.scope || 'project';
        if (scope === 'project' && !body.projectRoot) return sendJson({ error: '项目级注入必须指定 projectRoot' }, 400);
        const skill = skills.get(body.skillName);
        if (!skill) return sendJson({ error: '技能不存在' }, 404);
        const projectRoot = scope === 'project' ? body.projectRoot : undefined;
        const targets: IdeTarget[] = body.targets || ['qoder'];
        const results = await skillInjector.inject(skill, targets, scope, projectRoot);
        telemetry.record({ type: 'skill', name: body.skillName, category: skill.category, source: 'ui', trigger: 'manual_inject' });
        // 自动缓存已注入的技能
        await skillCache.add({
          name: skill.name, category: skill.category, description: skill.description,
          cachedAt: new Date().toISOString(),
        });
        return sendJson({ results });
      }

      // POST /api/inject/skill/all — 注入所有技能
      if (method === 'POST' && url.pathname === '/api/inject/skill/all') {
        const body = JSON.parse(await readBody(req));
        const allSkills = skills.getAll();
        const targets: IdeTarget[] = body.targets || ['qoder'];
        const scope: InjectScope = body.scope || 'project';
        if (scope === 'project' && !body.projectRoot) return sendJson({ error: '项目级注入必须指定 projectRoot' }, 400);
        const projectRoot = scope === 'project' ? body.projectRoot : undefined;
        const allResults: InjectResult[] = [];

        for (const skill of allSkills) {
          const results = await skillInjector.inject(skill, targets, scope, projectRoot);
          allResults.push(...results);
          telemetry.record({ type: 'skill', name: skill.name, category: skill.category, source: 'ui', trigger: 'all_inject' });
        }
        // 自动缓存所有已注入的技能
        const entries: CacheEntry[] = allSkills.map(s => ({
          name: s.name, category: s.category, description: s.description,
          cachedAt: new Date().toISOString(),
        }));
        await skillCache.setMany(entries);

        return sendJson({ results: allResults, count: allSkills.length });
      }

      // POST /api/inject/mcp
      if (method === 'POST' && url.pathname === '/api/inject/mcp') {
        const body = JSON.parse(await readBody(req));
        const scope: InjectScope = body.scope || 'project';
        if (scope === 'project' && !body.projectRoot) return sendJson({ error: '项目级注入必须指定 projectRoot' }, 400);
        const projectRoot = scope === 'project' ? body.projectRoot : undefined;
        const targets: IdeTarget[] = body.targets || ['qoder'];
        const results = await mcpInjector.inject(body.serverName, body.command, body.args, targets, scope, projectRoot);
        telemetry.record({ type: 'mcp', name: body.serverName, category: 'mcp', source: 'ui', trigger: 'manual_inject' });
        // 自动缓存已注入的 MCP
        await mcpCache.add({
          serverName: body.serverName,
          command: body.command,
          args: body.args || [],
          scope,
          targets,
          injectedAt: new Date().toISOString(),
        });
        return sendJson({ results });
      }

      // POST /api/record
      if (method === 'POST' && url.pathname === '/api/record') {
        const body = JSON.parse(await readBody(req));
        telemetry.record({ type: body.type || 'skill', name: body.name, category: body.category || 'unknown', source: body.source || 'manual', trigger: body.trigger || 'api', duration: body.duration, success: body.success });
        return sendJson({ ok: true });
      }

      // GET /api/stats
      if (method === 'GET' && url.pathname === '/api/stats') {
        const type = url.searchParams.get('type') as any || undefined;
        const stats = [...telemetry.getStats(type).values()].sort((a, b) => b.totalHits - a.totalHits);
        return sendJson(stats);
      }

      // GET /api/recent
      if (method === 'GET' && url.pathname === '/api/recent') {
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        return sendJson(telemetry.getRecent(limit));
      }

      // GET /api/mcp/cached — 获取已缓存的 MCP 注入记录
      if (method === 'GET' && url.pathname === '/api/mcp/cached') {
        return sendJson(mcpCache.getAll());
      }

      // DELETE /api/mcp/cache — 移除缓存的 MCP 记录
      if (method === 'DELETE' && url.pathname === '/api/mcp/cache') {
        const name = url.searchParams.get('name');
        if (name) {
          await mcpCache.remove(name);
        } else {
          await mcpCache.clear();
        }
        return sendJson({ ok: true });
      }

      // GET /api/injected — 获取所有已注入的项目（技能 + MCP）
      if (method === 'GET' && url.pathname === '/api/injected') {
        return sendJson({
          skills: skillCache.getAll(),
          mcpServers: mcpCache.getAll(),
        });
      }

      // GET /api/dashboard/cache — 获取 Dashboard 缓存快照
      if (method === 'GET' && url.pathname === '/api/dashboard/cache') {
        const date = url.searchParams.get('date');
        if (date) {
          return sendJson(dashboardCache.getSnapshot(date) || null);
        }
        const days = parseInt(url.searchParams.get('days') || '30', 10);
        return sendJson(dashboardCache.getRecentSnapshots(days));
      }

      // POST /api/dashboard/cache — 保存当前 Dashboard 快照
      if (method === 'POST' && url.pathname === '/api/dashboard/cache') {
        const body = JSON.parse(await readBody(req));
        const stats = [...telemetry.getStats().values()];
        const skillStats = stats.filter(s => s.type === 'skill');
        const mcpStats = stats.filter(s => s.type === 'mcp');
        const totalHits = stats.reduce((a, b) => a + b.totalHits, 0);
        const todayHits = stats.reduce((a, b) => a + b.todayHits, 0);
        const avgSuccess = stats.length > 0
          ? stats.reduce((a, b) => a + b.successRate, 0) / stats.length : 0;
        const topSkills = [...skillStats].sort((a, b) => b.totalHits - a.totalHits).slice(0, 5)
          .map(s => ({ name: s.name, hits: s.totalHits }));
        const topMcp = [...mcpStats].sort((a, b) => b.totalHits - a.totalHits).slice(0, 5)
          .map(s => ({ name: s.name, hits: s.totalHits }));

        const date = body.date || new Date().toISOString().slice(0, 10);
        await dashboardCache.upsertSnapshot({
          date,
          totalHits,
          todayHits,
          skillCount: skillStats.length,
          mcpCount: mcpStats.length,
          avgSuccess,
          topSkills,
          topMcp,
          updatedAt: new Date().toISOString(),
        });
        return sendJson({ ok: true, date });
      }

      // GET /health
      if (method === 'GET' && url.pathname === '/health') {
        return sendJson({
          status: 'ok',
          skills: skills.getAll().length,
          cachedSkills: skillCache.getAll().length,
          mcpServers: mcpRegistry.getServers().length,
          mcpTools: mcpRegistry.getAllTools().length,
          events: telemetry.getRecent().length,
        });
      }

      sendJson({ error: 'not found' }, 404);
    } catch (e: any) {
      sendJson({ error: e.message }, 500);
    }
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}
