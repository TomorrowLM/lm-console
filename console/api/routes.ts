import { IncomingMessage, ServerResponse } from 'http';
import type { IdeTarget, InjectScope, InjectResult } from '../core/types.js';
import type { SkillRegistry } from '../skill/registry.js';
import type { SkillInjector } from '../skill/injection.js';
import type { McpRegistry } from '../mcp/registry.js';
import type { McpInjector } from '../mcp/injection.js';
import type { Telemetry } from '../core/telemetry.js';

export function createApiRouter(
  skills: SkillRegistry,
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
      res.writeHead(status, headers);
      res.end(JSON.stringify(data));
    };

    if (req.method === 'OPTIONS') return sendJson({});

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = req.method || 'GET';

    try {
      // GET /api/skills
      if (method === 'GET' && url.pathname === '/api/skills') {
        const category = url.searchParams.get('category') || undefined;
        return sendJson(skills.getByCategory(category));
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

      // POST /api/inject/skill
      if (method === 'POST' && url.pathname === '/api/inject/skill') {
        const body = JSON.parse(await readBody(req));
        const skill = skills.get(body.skillName);
        if (!skill) return sendJson({ error: '技能不存在' }, 404);
        const results = await skillInjector.inject(skill, body.targets || ['qoder'], body.scope || 'project');
        telemetry.record({ type: 'skill', name: body.skillName, category: skill.category, source: 'ui', trigger: 'manual_inject' });
        return sendJson({ results });
      }

      // POST /api/inject/mcp
      if (method === 'POST' && url.pathname === '/api/inject/mcp') {
        const body = JSON.parse(await readBody(req));
        const results = await mcpInjector.inject(body.serverName, body.command, body.args, body.targets || ['qoder'], body.scope || 'project');
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
