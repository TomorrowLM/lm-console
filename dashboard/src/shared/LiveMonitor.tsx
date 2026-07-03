import React, { useState, useEffect } from 'react';
import type { HitEvent } from '../types';

interface Props { recent: HitEvent[]; connected: boolean }

export default function LiveMonitor({ recent, connected }: Props) {
  const [paused, setPaused] = useState(false);
  const [displayed, setDisplayed] = useState<HitEvent[]>(recent);

  useEffect(() => { if (!paused) setDisplayed(recent); }, [recent, paused]);

  const skillCount = displayed.filter(e => e.type === 'skill').length;
  const mcpCount = displayed.filter(e => e.type === 'mcp').length;
  const failCount = displayed.filter(e => e.success === false).length;
  const successCount = displayed.length - failCount;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>⚡ 实时监控</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#4ade80' : '#f87171', display: 'inline-block' }} />
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{connected ? '已连接' : '断开'}</span>
          <button onClick={() => setPaused(!paused)} style={btnStyle(paused ? '#fbbf24' : '#94a3b8')}>
            {paused ? '▶ 继续' : '⏸ 暂停'}
          </button>
          <button onClick={() => setDisplayed([])} style={btnStyle('#f87171')}>🗑 清空</button>
        </div>
      </div>

      {/* 统计行 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        <Mini label="事件数" value={displayed.length.toString()} color="#38bdf8" />
        <Mini label="技能" value={skillCount.toString()} color="#38bdf8" />
        <Mini label="MCP" value={mcpCount.toString()} color="#a78bfa" />
        <Mini label="成功" value={successCount.toString()} color="#4ade80" />
        <Mini label="失败" value={failCount.toString()} color="#f87171" />
      </div>

      {/* 事件流 */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '0.75rem', maxHeight: '55vh', overflow: 'auto' }}>
        {displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📡</div>
            <p>等待事件...</p>
          </div>
        ) : (
          displayed.map((ev, i) => {
            const isSkill = ev.type === 'skill';
            const borderColor = ev.success === false ? '#f87171' : isSkill ? '#38bdf8' : '#a78bfa';
            return (
              <div key={`${ev.timestamp}-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.6rem',
                background: i === 0 ? '#33415555' : 'transparent', borderRadius: 6, fontSize: '0.85rem',
                borderLeft: `3px solid ${borderColor}`, marginBottom: '0.15rem',
                animation: i === 0 ? 'slideIn 0.2s ease' : 'none',
              }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: '3.5rem' }}>
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
                <span>{ev.success !== false ? '✅' : '❌'}</span>
                <span style={{ fontWeight: 500, minWidth: '8rem' }}>{ev.name}</span>
                <Tag color={isSkill ? '#38bdf8' : '#a78bfa'}>{ev.type}</Tag>
                <Tag color="#64748b">{ev.source}</Tag>
                <span style={{ color: '#64748b', fontSize: '0.78rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  "{ev.trigger}"
                </span>
                {ev.duration != null && (
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{ev.duration}ms</span>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '0.5rem', textAlign: 'center' }}>
      <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{label}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ padding: '0.1rem 0.35rem', borderRadius: 4, fontSize: '0.72rem', background: `${color}22`, color, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function btnStyle(color: string) {
  return { padding: '0.3rem 0.7rem', borderRadius: 6, border: '1px solid #475569', background: 'transparent', color, cursor: 'pointer', fontSize: '0.8rem' };
}
