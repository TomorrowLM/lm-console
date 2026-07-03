import React from 'react';
import type { HitStats, HitEvent } from '../types';

interface Props { stats: Record<string, HitStats>; recent: HitEvent[] }

export default function Dashboard({ stats, recent }: Props) {
  const values = Object.values(stats);
  const skillStats = values.filter(s => s.type === 'skill');
  const mcpStats = values.filter(s => s.type === 'mcp');
  const totalHits = values.reduce((a, b) => a + b.totalHits, 0);
  const todayHits = values.reduce((a, b) => a + b.todayHits, 0);
  const avgSuccess = values.length > 0
    ? (values.reduce((a, b) => a + b.successRate, 0) / values.length * 100).toFixed(1) : '0.0';
  const topSkills = [...skillStats].sort((a, b) => b.totalHits - a.totalHits).slice(0, 5);
  const topMcp = [...mcpStats].sort((a, b) => b.totalHits - a.totalHits).slice(0, 5);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>📊 总览面板</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Card label="总命中次数" value={totalHits.toString()} color="#38bdf8" />
        <Card label="今日命中" value={todayHits.toString()} color="#4ade80" />
        <Card label="技能数" value={skillStats.length.toString()} color="#fbbf24" />
        <Card label="MCP 工具数" value={mcpStats.length.toString()} color="#a78bfa" />
        <Card label="平均成功率" value={`${avgSuccess}%`} color="#f472b6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>🧠 技能 Top 5</h2>
          {topSkills.length === 0 ? <Empty /> : topSkills.map((s, i) => <RankRow key={s.name} rank={i + 1} name={s.name} hits={s.totalHits} color="#38bdf8" />)}
        </section>
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>🔧 MCP 工具 Top 5</h2>
          {topMcp.length === 0 ? <Empty /> : topMcp.map((s, i) => <RankRow key={s.name} rank={i + 1} name={s.name} hits={s.totalHits} color="#a78bfa" />)}
        </section>
      </div>

      <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>⏱ 最近事件</h2>
        {recent.length === 0 ? <p style={{ color: '#64748b' }}>暂无事件</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {recent.slice(0, 10).map((ev, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0.75rem',
                background: '#0f172a', borderRadius: 8, fontSize: '0.85rem',
                borderLeft: `3px solid ${ev.type === 'skill' ? '#38bdf8' : ev.success !== false ? '#a78bfa' : '#f87171'}`,
              }}>
                <span>{ev.success !== false ? '✅' : '❌'}</span>
                <span style={{ fontWeight: 500 }}>{ev.name}</span>
                <span style={{ color: '#94a3b8' }}>via {ev.source}</span>
                <span style={{ color: '#64748b', marginLeft: 'auto', fontSize: '0.8rem' }}>
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 12, padding: '1.25rem', borderLeft: `4px solid ${color}` }}>
      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function RankRow({ rank, name, hits, color }: { rank: number; name: string; hits: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid #0f172a' }}>
      <span style={{ color: '#64748b', minWidth: '1.5rem', textAlign: 'right' }}>#{rank}</span>
      <span style={{ flex: 1 }}>{name}</span>
      <span style={{ color, fontWeight: 600 }}>{hits}</span>
    </div>
  );
}

function Empty() {
  return <p style={{ color: '#64748b', fontSize: '0.9rem' }}>暂无数据</p>;
}
