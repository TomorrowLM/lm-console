import { promises as fs } from 'fs';
import os from 'os';
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
  /** 本地 MCP 包路径（如果来自 libs/mcps） */
  localPath?: string;
}

function qoderGlobalMcpPath(): string {
  const home = process.env.HOME || '';
  if (os.platform() === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Qoder', 'SharedClientCache', 'mcp.json');
  }
  if (os.platform() === 'win32') {
    return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Qoder', 'SharedClientCache', 'mcp.json');
  }
  return path.join(home, '.config', 'Qoder', 'SharedClientCache', 'mcp.json');
}

function traeGlobalMcpPath(): string {
  const home = process.env.HOME || '';
  if (os.platform() === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Trae', 'User', 'mcp.json');
  }
  if (os.platform() === 'win32') {
    return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Trae', 'User', 'mcp.json');
  }
  return path.join(home, '.config', 'Trae', 'User', 'mcp.json');
}

export class McpRegistry {
  private servers = new Map<string, McpServerMeta>();
  private configPaths: string[];
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.configPaths = [
      path.join(projectRoot, '.vscode', 'mcp.json'),
      path.join(projectRoot, '.qoder', 'mcp.json'),
      path.join(projectRoot, '.cursor', 'mcp.json'),
      path.join(projectRoot, '.trae', 'mcp.json'),
      path.join(projectRoot, 'mcp.json'),
      path.join(process.env.HOME || '', '.claude', 'mcp.json'),
      qoderGlobalMcpPath(),
      traeGlobalMcpPath(),
    ];
  }

  async scan(): Promise<Map<string, McpServerMeta>> {
    this.servers.clear();

    // 1. 扫描已知的 mcp.json 配置文件
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

    // 2. 扫描 libs/mcps 下的本地 MCP 包
    const mcpsDir = path.join(this.projectRoot, 'libs', 'mcps');
    try {
      const entries = await fs.readdir(mcpsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pkgPath = path.join(mcpsDir, entry.name, 'package.json');
        try {
          const pkgRaw = await fs.readFile(pkgPath, 'utf-8');
          const pkg = JSON.parse(pkgRaw);
          const serverName = pkg.name || entry.name;
          if (this.servers.has(serverName)) continue;
          const distPath = path.join(mcpsDir, entry.name, 'dist', 'index.js');
          const hasDist = await fs.stat(distPath).then(() => true).catch(() => false);
          this.servers.set(serverName, {
            name: serverName,
            command: 'node',
            args: [path.join(mcpsDir, entry.name, 'dist', 'index.js')],
            type: 'stdio',
            configPath: pkgPath,
            tools: [],
            localPath: path.join(mcpsDir, entry.name),
          });
        } catch { /* skip invalid package */ }
      }
    } catch { /* libs/mcps 不存在 */ }

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
