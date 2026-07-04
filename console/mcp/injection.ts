import { promises as fs } from 'fs';
import path from 'path';
import type { IdeTarget, InjectScope, InjectResult } from '../core/types.js';
import { PathResolver } from '../core/path-resolver.js';

export class McpInjector {
  constructor(
    private resolver: PathResolver,
    private projectRoot: string,
  ) {}

  async inject(
    serverName: string, command: string, args: string[],
    targets: IdeTarget[], scope: InjectScope, projectRoot?: string,
  ): Promise<InjectResult[]> {
    const root = projectRoot || this.projectRoot;
    return Promise.all(targets.map(t => this.injectOne(serverName, command, args, t, scope, root)));
  }

  private async injectOne(
    serverName: string, command: string, args: string[],
    target: IdeTarget, scope: InjectScope, projectRoot: string,
  ): Promise<InjectResult> {
    const targetPath = this.resolver.mcpConfigPath(target, scope, projectRoot);
    if (!targetPath) {
      console.error(`[McpInjector] 注入 ${serverName} 到 ${target} 跳过: 不支持 MCP 注入`);
      return { target, type: 'mcp', name: serverName, status: 'skipped', targetPath: '', error: 'IDE 不支持 MCP 注入' };
    }
    try {
      console.error(`[McpInjector] 注入 ${serverName} 到 ${target} (${scope}) at ${targetPath}`);
      let config: any = { mcpServers: {} };
      try {
        const existing = await fs.readFile(targetPath, 'utf-8');
        config = JSON.parse(existing);
      } catch { /* new file */ }
      config.mcpServers = config.mcpServers || {};
      config.mcpServers[serverName] = { command, args, type: 'stdio' };
      const dirPath = path.dirname(targetPath);
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(targetPath, JSON.stringify(config, null, 2), 'utf-8');
      console.error(`[McpInjector] 成功注入 ${serverName} 到 ${target}`);
      return { target, type: 'mcp', name: serverName, status: 'ok', targetPath };
    } catch (e: any) {
      console.error(`[McpInjector] 注入 ${serverName} 到 ${target} 失败:`, e);
      return { target, type: 'mcp', name: serverName, status: 'error', targetPath, error: e.message };
    }
  }
}
