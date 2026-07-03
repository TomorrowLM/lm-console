import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { Telemetry } from './telemetry.js';
import type { HitEvent, HitStats } from './types.js';

export class WsServer {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();

  constructor(server: Server, telemetry: Telemetry) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      ws.send(JSON.stringify({
        type: 'init',
        stats: this.serialize(telemetry.getStats()),
        recent: telemetry.getRecent(30),
      }));
      ws.on('close', () => this.clients.delete(ws));
    });

    telemetry.on('hit', (ev: HitEvent) => {
      this.broadcast({
        type: 'hit',
        event: ev,
        stats: this.serialize(telemetry.getStats(ev.type)),
      });
    });
  }

  private broadcast(data: any): void {
    const msg = JSON.stringify(data);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  }

  private serialize(map: Map<string, HitStats>): Record<string, HitStats> {
    const obj: Record<string, HitStats> = {};
    map.forEach(v => { obj[`${v.type}:${v.name}`] = v; });
    return obj;
  }
}
