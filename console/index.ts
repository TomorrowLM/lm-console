import { promises as fs } from 'fs';
import path from 'path';
import { Server } from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { SkillRegistry } from './skill/registry.js';
import { SkillCache } from './skill/cache.js';
import { SkillInjector } from './skill/injection.js';
import { McpRegistry } from './mcp/registry.js';
import { McpInjector } from './mcp/injection.js';
import { McpCache } from './mcp/cache.js';
import { Telemetry } from './core/telemetry.js';
import { DashboardCache } from './core/dashboard-cache.js';
import { PathResolver } from './core/path-resolver.js';
import { WsServer } from './core/ws-server.js';
import { createApiRouter } from './api/routes.js';

const PROJECT_ROOT = process.env.LM_PROJECT_ROOT || process.cwd();
const CACHE_DIR = process.env.LM_CACHE_DIR || path.join(PROJECT_ROOT, 'cache');
const SKILLS_DIR = process.env.LM_SKILLS_DIR || path.join(PROJECT_ROOT, 'libs', 'skills');
const PORT = parseInt(process.env.LM_CONSOLE_PORT || '3001', 10);

async function main() {
  console.error(`[lm-console] Skills dir: ${SKILLS_DIR}`);
  console.error(`[lm-console] Project root: ${PROJECT_ROOT}`);
  console.error(`[lm-console] Cache dir: ${CACHE_DIR}`);

  // 1. Init modules
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const pathResolver = new PathResolver();
  const skillRegistry = new SkillRegistry();
  const skillCache = new SkillCache(CACHE_DIR);
  await skillCache.load();
  const mcpCache = new McpCache(CACHE_DIR);
  await mcpCache.load();
  const dashboardCache = new DashboardCache(CACHE_DIR);
  await dashboardCache.load();
  const mcpRegistry = new McpRegistry(PROJECT_ROOT);
  const skillInjector = new SkillInjector(pathResolver, PROJECT_ROOT);
  const mcpInjector = new McpInjector(pathResolver, PROJECT_ROOT);
  const telemetry = new Telemetry(CACHE_DIR);

  // 2. Scan
  await skillRegistry.scan(SKILLS_DIR);
  await mcpRegistry.scan();
  console.error(`[lm-console] Skills: ${skillRegistry.getAll().length}, MCP servers: ${mcpRegistry.getServers().length}`);

  // 3. MCP Server
  const mcp = new McpServer({ name: 'lm-console', version: '1.0.0' });

  mcp.tool('list_skills', '列出所有已发现的技能', {
    category: z.string().optional(),
  }, async ({ category }) => {
    const list = skillRegistry.getByCategory(category);
    return { content: [{ type: 'text', text: list.map(s =>
      `**${s.name}** (${s.category})\n  ${s.description}\n  触发: ${s.triggers.slice(0, 5).join(', ')}\n  注入: ${s.injectionTargets.join(', ')}`
    ).join('\n\n') || '暂无技能' }] };
  });

  mcp.tool('inject_skill', '将技能注入到目标 IDE', {
    skillName: z.string(),
    targets: z.array(z.enum(['qoder', 'claude', 'vscode', 'copilot', 'openclaw'])),
    scope: z.enum(['global', 'project']).default('project'),
    projectRoot: z.string().optional(),
  }, async ({ skillName, targets, scope, projectRoot }) => {
    if (scope === 'project' && !projectRoot) return { content: [{ type: 'text', text: '❌ 项目级注入必须指定 projectRoot' }], isError: true };
    const skill = skillRegistry.get(skillName);
    if (!skill) return { content: [{ type: 'text', text: `❌ 技能 ${skillName} 不存在` }], isError: true };
    const results = await skillInjector.inject(skill, targets as any, scope as any, projectRoot);
    telemetry.record({ type: 'skill', name: skillName, category: skill.category, source: 'mcp', trigger: 'inject' });
    return { content: [{ type: 'text', text: results.map(r =>
      `[${r.status === 'ok' ? '✓' : '✗'}] ${r.target}/${r.name} → ${r.targetPath}`
    ).join('\n') }] };
  });

  mcp.tool('record_hit', '记录一次技能命中', {
    skillName: z.string(),
    source: z.string(),
    trigger: z.string(),
    duration: z.number().optional(),
    success: z.boolean().optional(),
  }, async (params) => {
    const skill = skillRegistry.get(params.skillName);
    telemetry.record({
      type: 'skill', name: params.skillName, category: skill?.category || 'unknown',
      source: params.source, trigger: params.trigger,
      duration: params.duration, success: params.success,
    });
    return { content: [{ type: 'text', text: '✓ 已记录' }] };
  });

  mcp.tool('list_mcp_servers', '列出已发现的 MCP 服务器', {}, async () => {
    const servers = mcpRegistry.getServers();
    return { content: [{ type: 'text', text: servers.map(s =>
      `**${s.name}**\n  ${s.command} ${s.args.join(' ')}\n  来源: ${path.basename(s.configPath)}\n  工具: ${s.tools.map(t => t.name).join(', ')}${s.error ? `\n  ⚠️ ${s.error}` : ''}`
    ).join('\n\n') || '未发现 MCP 服务器' }] };
  });

  mcp.tool('probe_mcp_tools', '探测 MCP 服务器的工具列表', {
    serverName: z.string(),
  }, async ({ serverName }) => {
    const tools = await mcpRegistry.probeTools(serverName);
    return { content: [{ type: 'text', text: tools.length > 0
      ? `**${serverName}** 工具:\n` + tools.map(t => `- ${t.name}: ${t.description}`).join('\n')
      : `❌ 未探测到工具${mcpRegistry.getServer(serverName)?.error ? ` (${mcpRegistry.getServer(serverName)!.error})` : ''}` }] };
  });

  mcp.tool('inject_mcp', '将 MCP 服务器注册到 IDE 的 mcp.json', {
    serverName: z.string(), command: z.string(), args: z.array(z.string()),
    targets: z.array(z.enum(['qoder', 'claude', 'vscode', 'trae'])),
    scope: z.enum(['global', 'project']).default('project'),
    projectRoot: z.string().optional(),
  }, async (params) => {
    if (params.scope === 'project' && !params.projectRoot) return { content: [{ type: 'text', text: '❌ 项目级注入必须指定 projectRoot' }], isError: true };
    const results = await mcpInjector.inject(params.serverName, params.command, params.args, params.targets as any, params.scope as any, params.projectRoot);
    telemetry.record({ type: 'mcp', name: params.serverName, category: 'mcp', source: 'mcp', trigger: 'inject_mcp' });
    return { content: [{ type: 'text', text: results.map(r =>
      `[${r.status === 'ok' ? '✓' : '✗'}] ${r.target}/${r.name} → ${r.targetPath}`
    ).join('\n') }] };
  });

  mcp.tool('record_mcp_call', '记录一次 MCP 工具调用', {
    serverName: z.string(), toolName: z.string(), source: z.string(),
    duration: z.number().optional(), success: z.boolean().optional(),
  }, async (params) => {
    telemetry.record({
      type: 'mcp', name: params.toolName, category: params.serverName,
      source: params.source, trigger: `mcp_call:${params.toolName}`,
      duration: params.duration, success: params.success,
    });
    return { content: [{ type: 'text', text: '✓ 已记录 MCP 调用' }] };
  });

  mcp.tool('query_stats', '查询命中率统计', {
    type: z.enum(['skill', 'mcp']).optional(),
    name: z.string().optional(),
  }, async ({ type, name }) => {
    const stats = [...telemetry.getStats(type).values()]
      .filter(s => !name || s.name === name)
      .sort((a, b) => b.totalHits - a.totalHits);
    return { content: [{ type: 'text', text: stats.map(s =>
      `**${s.type === 'skill' ? '🧠' : '🔧'} ${s.name}** (${s.category})\n` +
      `  总: ${s.totalHits} | 今日: ${s.todayHits} | 本周: ${s.weekHits}\n` +
      `  成功率: ${(s.successRate * 100).toFixed(1)}% | 平均耗时: ${s.avgDuration.toFixed(0)}ms`
    ).join('\n\n') || '暂无数据' }] };
  });

  // 4. HTTP + WS server
  const httpServer = new Server();
  const apiRouter = createApiRouter(skillRegistry, skillCache, skillInjector, mcpRegistry, mcpInjector, mcpCache, telemetry, dashboardCache);
  httpServer.on('request', apiRouter);
  new WsServer(httpServer, telemetry);

  httpServer.listen(PORT, () => {
    console.error(`[lm-console] HTTP/WS server: http://localhost:${PORT}`);
    console.error(`[lm-console] Dashboard dev: cd dashboard && npm run dev (port 3002)`);
    console.error(`[lm-console] API: http://localhost:${PORT}/api/skills`);
    console.error(`[lm-console] WS: ws://localhost:${PORT}/ws`);
  });

  // 自动每日快照：每 30 分钟检查一次，如果当天没有快照就保存
  const autoSnapshot = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (!dashboardCache.getSnapshot(today)) {
      const stats = [...telemetry.getStats().values()];
      const skillStats = stats.filter(s => s.type === 'skill');
      const mcpStats = stats.filter(s => s.type === 'mcp');
      await dashboardCache.upsertSnapshot({
        date: today,
        totalHits: stats.reduce((a, b) => a + b.totalHits, 0),
        todayHits: stats.reduce((a, b) => a + b.todayHits, 0),
        skillCount: skillStats.length,
        mcpCount: mcpStats.length,
        avgSuccess: stats.length > 0 ? stats.reduce((a, b) => a + b.successRate, 0) / stats.length : 0,
        topSkills: [...skillStats].sort((a, b) => b.totalHits - a.totalHits).slice(0, 5).map(s => ({ name: s.name, hits: s.totalHits })),
        topMcp: [...mcpStats].sort((a, b) => b.totalHits - a.totalHits).slice(0, 5).map(s => ({ name: s.name, hits: s.totalHits })),
        updatedAt: new Date().toISOString(),
      });
      console.error(`[lm-console] Auto-saved daily snapshot: ${today}`);
    }
  };
  setInterval(autoSnapshot, 30 * 60 * 1000);
  // 启动后 5 秒执行第一次
  setTimeout(autoSnapshot, 5000);

  // 5. MCP connection
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  console.error('[lm-console] MCP server ready on stdio');
}

main().catch(e => {
  console.error('[lm-console] Fatal:', e);
  process.exit(1);
});
