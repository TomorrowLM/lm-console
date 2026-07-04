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
import type { Telemetry } from '../core/telemetry.js';

export function createApiRouter(
  skills: SkillRegistry,
  skillCache: SkillCache,
  skillInjector: SkillInjector,
  mcpRegistry: McpRegistry,
  mcpInjector: McpInjector,
  telemetry: Telemetry,
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
        const results = await skillInjector.inject(skill, body.targets || ['qoder'], scope, projectRoot);
        telemetry.record({ type: 'skill', name: body.skillName, category: skill.category, source: 'ui', trigger: 'manual_inject' });
        return sendJson({ results });
      }

      // POST /api/inject/skill/cached — 注入所有已缓存的技能
      if (method === 'POST' && url.pathname === '/api/inject/skill/cached') {
        const body = JSON.parse(await readBody(req));
        const cached = skillCache.getAll();
        const targets: IdeTarget[] = body.targets || ['qoder'];
        const scope: InjectScope = body.scope || 'project';
        if (scope === 'project' && !body.projectRoot) return sendJson({ error: '项目级注入必须指定 projectRoot' }, 400);
        const projectRoot = scope === 'project' ? body.projectRoot : undefined;
        const allResults: InjectResult[] = [];

        for (const entry of cached) {
          const skill = skills.get(entry.name);
          if (!skill) continue;
          const results = await skillInjector.inject(skill, targets, scope, projectRoot);
          allResults.push(...results);
          telemetry.record({ type: 'skill', name: entry.name, category: entry.category, source: 'ui', trigger: 'cache_inject' });
        }

        return sendJson({ results: allResults, count: cached.length });
      }

      // POST /api/inject/mcp
      if (method === 'POST' && url.pathname === '/api/inject/mcp') {
        const body = JSON.parse(await readBody(req));
        const scope: InjectScope = body.scope || 'project';
        if (scope === 'project' && !body.projectRoot) return sendJson({ error: '项目级注入必须指定 projectRoot' }, 400);
        const projectRoot = scope === 'project' ? body.projectRoot : undefined;
        const results = await mcpInjector.inject(body.serverName, body.command, body.args, body.targets || ['qoder'], scope, projectRoot);
        telemetry.record({ type: 'mcp', name: body.serverName, category: 'mcp', source: 'ui', trigger: 'manual_inject' });
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
