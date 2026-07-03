import React, { useState, useEffect } from 'react';
import type { HitEvent, HitStats } from './types';
import Dashboard from './shared/Dashboard';
import SkillList from './skill/SkillList';
import McpToolList from './mcp/McpToolList';
import HitRateChart from './shared/HitRateChart';
import InjectionPanel from './shared/InjectionPanel';
import LiveMonitor from './shared/LiveMonitor';

type Tab = 'dashboard' | 'skills' | 'mcp' | 'chart' | 'inject' | 'monitor';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: '总览', icon: '📊' },
  { key: 'skills', label: '技能', icon: '📋' },
  { key: 'mcp', label: 'MCP', icon: '🛠️' },
  { key: 'chart', label: '图表', icon: '📈' },
  { key: 'inject', label: '注入', icon: '🔌' },
  { key: 'monitor', label: '实时', icon: '⚡' },
];

export default function App() {
  const [stats, setStats] = useState<Record<string, HitStats>>({});
  const [recent, setRecent] = useState<HitEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:3001/ws`;
    let ws: WebSocket;
    let timer: number;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        timer = window.setTimeout(connect, 3000);
      };
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.type === 'init') {
            setStats(data.stats || {});
            setRecent(data.recent || []);
          } else if (data.type === 'hit') {
            setRecent(prev => [data.event, ...prev].slice(0, 100));
            if (data.stats) setStats(prev => ({ ...prev, ...data.stats }));
          }
        } catch { /* ignore */ }
      };
    };

    connect();
    return () => { ws?.close(); clearTimeout(timer); };
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{
        width: 200, background: '#1e293b', padding: '1rem',
        display: 'flex', flexDirection: 'column', gap: '0.25rem',
      }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 1rem 0.5rem', color: '#38bdf8' }}>
          🧠 lm-console
        </div>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.65rem 1rem', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: activeTab === tab.key ? '#334155' : 'transparent',
              color: '#e2e8f0', fontSize: '0.9rem', textAlign: 'left',
              transition: 'all 0.15s',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
        <div style={{ marginTop: 'auto', padding: '0.75rem 0.5rem', fontSize: '0.8rem',
          color: connected ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#4ade80' : '#f87171', display: 'inline-block' }} />
          {connected ? '已连接' : '断开'}
        </div>
      </nav>

      <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
        {activeTab === 'dashboard' && <Dashboard stats={stats} recent={recent} />}
        {activeTab === 'skills' && <SkillList />}
        {activeTab === 'mcp' && <McpToolList />}
        {activeTab === 'chart' && <HitRateChart stats={stats} />}
        {activeTab === 'inject' && <InjectionPanel />}
        {activeTab === 'monitor' && <LiveMonitor recent={recent} connected={connected} />}
      </main>
    </div>
  );
}
