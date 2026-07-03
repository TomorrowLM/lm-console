import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export interface McpToolMeta {
  serverName: string;
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface McpServerMeta {
  name: string;
  command: string;
  args: string[];
  type: 'stdio' | 'http';
  configPath: string;
  tools: McpToolMeta[];
  lastProbed?: string;
  error?: string;
}

export class McpRegistry {
  private servers = new Map<string, McpServerMeta>();
  private configPaths: string[];

  constructor(projectRoot: string) {
    this.configPaths = [
      path.join(projectRoot, '.vscode', 'mcp.json'),
      path.join(projectRoot, '.qoder', 'mcp.json'),
      path.join(projectRoot, '.cursor', 'mcp.json'),
      path.join(projectRoot, 'mcp.json'),
      path.join(process.env.HOME || '', '.claude', 'mcp.json'),
      path.join(process.env.HOME || '', '.config', 'qoder', 'mcp.json'),
    ];
  }

  async scan(): Promise<Map<string, McpServerMeta>> {
    this.servers.clear();
    for (const configPath of this.configPaths) {
      try {
        const raw = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(raw);
        for (const [name, cfg] of Object.entries(config.mcpServers || {})) {
          if (!this.servers.has(name)) {
            const c = cfg as any;
            this.servers.set(name, {
              name,
              command: c.command || '',
              args: c.args || [],
              type: c.type === 'http' ? 'http' : 'stdio',
              configPath,
              tools: [],
            });
          }
        }
      } catch { /* skip */ }
    }
    return this.servers;
  }

  async probeTools(serverName: string): Promise<McpToolMeta[]> {
    const server = this.servers.get(serverName);
    if (!server || server.type !== 'stdio') return [];

    return new Promise((resolve) => {
      const child = spawn(server.command, server.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 6000,
      });
      const request = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
      let output = '';

      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
        const lines = output.trim().split('\n');
        for (const line of lines) {
          try {
            const resp = JSON.parse(line);
            if (resp.id === 1 && resp.result?.tools) {
              server.tools = resp.result.tools.map((t: any) => ({
                serverName,
                name: t.name,
                description: t.description || '',
                inputSchema: t.inputSchema || {},
              }));
              server.lastProbed = new Date().toISOString();
              server.error = undefined;
              child.kill();
              resolve(server.tools);
              return;
            }
          } catch { /* wait for more data */ }
        }
      });
      child.on('error', (err: Error) => { server.error = err.message; resolve([]); });
      child.on('close', () => resolve(server.tools));
      child.stdin.write(request + '\n');
      child.stdin.end();
      setTimeout(() => { child.kill(); resolve(server.tools || []); }, 5000);
    });
  }

  async probeAll(): Promise<void> {
    for (const name of this.servers.keys()) {
      await this.probeTools(name);
    }
  }

  getServer(name: string): McpServerMeta | undefined {
    return this.servers.get(name);
  }

  getServers(): McpServerMeta[] {
    return [...this.servers.values()];
  }

  getAllTools(): McpToolMeta[] {
    return this.getServers().flatMap(s => s.tools);
  }
}
