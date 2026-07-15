import React, { useState, useEffect } from 'react';
import type { HitStats, HitEvent, DailySnapshot } from '../types';

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
  
  const chartValues = Object.values(stats).sort((a, b) => b.totalHits - a.totalHits);
  const maxTotal = chartValues.length > 0 ? Math.max(...chartValues.map(v => v.totalHits), 1) : 1;

  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewSnapshot, setViewSnapshot] = useState<DailySnapshot | null>(null);

  const fetchSnapshots = async () => {
    try {
      const res = await fetch('/api/dashboard/cache?days=30');
      const data: DailySnapshot[] = await res.json();
      setSnapshots(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchSnapshots(); }, []);

  const saveSnapshot = async () => {
    setSaving(true);
    try {
      await fetch('/api/dashboard/cache', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      await fetchSnapshots();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const viewDateSnapshot = (date: string) => {
    setSelectedDate(date);
    const snap = snapshots.find(s => s.date === date);
    setViewSnapshot(snap || null);
  };

  const displaySnapshot = viewSnapshot;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>📊 总览面板</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {snapshots.length > 0 && (
            <select
              value={selectedDate}
              onChange={e => viewDateSnapshot(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid #334155',
                background: '#1e293b', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none',
              }}>
              <option value="">实时数据</option>
              {snapshots.map(s => (
                <option key={s.date} value={s.date}>{s.date}</option>
              ))}
            </select>
          )}
          <button onClick={saveSnapshot} disabled={saving}
            style={{
              padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
              background: saving ? '#475569' : '#38bdf8', color: '#0f172a',
              fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
            }}>
            {saving ? '保存中...' : '💾 保存今日快照'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Card label="总命中次数" value={(displaySnapshot?.totalHits ?? totalHits).toString()} color="#38bdf8" />
        <Card label="今日命中" value={(displaySnapshot?.todayHits ?? todayHits).toString()} color="#4ade80" />
        <Card label="技能数" value={(displaySnapshot?.skillCount ?? skillStats.length).toString()} color="#fbbf24" />
        <Card label="MCP 工具数" value={(displaySnapshot?.mcpCount ?? mcpStats.length).toString()} color="#a78bfa" />
        <Card label="平均成功率" value={`${displaySnapshot?.avgSuccess != null ? (displaySnapshot.avgSuccess * 100).toFixed(1) : avgSuccess}%`} color="#f472b6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>🧠 技能 Top 5</h2>
          {displaySnapshot ? (
            displaySnapshot.topSkills.length === 0 ? <Empty /> :
            displaySnapshot.topSkills.map((s, i) => <RankRow key={s.name} rank={i + 1} name={s.name} hits={s.hits} color="#38bdf8" />)
          ) : (
            topSkills.length === 0 ? <Empty /> : topSkills.map((s, i) => <RankRow key={s.name} rank={i + 1} name={s.name} hits={s.totalHits} color="#38bdf8" />)
          )}
        </section>
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>🔧 MCP 工具 Top 5</h2>
          {displaySnapshot ? (
            displaySnapshot.topMcp.length === 0 ? <Empty /> :
            displaySnapshot.topMcp.map((s, i) => <RankRow key={s.name} rank={i + 1} name={s.name} hits={s.hits} color="#a78bfa" />)
          ) : (
            topMcp.length === 0 ? <Empty /> : topMcp.map((s, i) => <RankRow key={s.name} rank={i + 1} name={s.name} hits={s.totalHits} color="#a78bfa" />)
          )}
        </section>
      </div>

      {!displaySnapshot && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📈 技能命中排行</h2>
              {skillStats.map(s => <Bar key={s.name} name={s.name} value={s.totalHits} max={maxTotal} color="#38bdf8" />)}
              {skillStats.length === 0 && <p style={{ color: '#64748b' }}>暂无</p>}
            </section>
            <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📈 MCP 调用排行</h2>
              {mcpStats.map(s => <Bar key={s.name} name={s.name} value={s.totalHits} max={maxTotal} color="#a78bfa" />)}
              {mcpStats.length === 0 && <p style={{ color: '#64748b' }}>暂无</p>}
            </section>
          </div>
        </>
      )}

      {/* 历史快照列表 */}
      {snapshots.length > 0 && !displaySnapshot && (
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📅 历史快照</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {snapshots.slice(0, 14).map(s => (
              <button key={s.date} onClick={() => viewDateSnapshot(s.date)}
                style={{
                  padding: '0.4rem 0.75rem', borderRadius: 6,
                  border: `1px solid ${selectedDate === s.date ? '#38bdf8' : '#334155'}`,
                  background: selectedDate === s.date ? '#0f2740' : '#0f172a',
                  color: selectedDate === s.date ? '#38bdf8' : '#94a3b8',
                  cursor: 'pointer', fontSize: '0.8rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                }}>
                <span style={{ fontWeight: 600 }}>{s.date.slice(5)}</span>
                <span style={{ fontSize: '0.7rem' }}>{s.totalHits} 次</span>
              </button>
            ))}
          </div>
        </section>
      )}

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

      {!displaySnapshot && (
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📋 全部统计</h2>
          {chartValues.filter(s => s.totalHits > 0).length === 0 ? (
            <p style={{ color: '#64748b' }}>暂无数据，使用技能或 MCP 后查看</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>名称</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>类型</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>总次数</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>今日</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>成功率</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>平均耗时</th>
                </tr>
              </thead>
              <tbody>
                {chartValues.filter(s => s.totalHits > 0).map(s => (
                  <tr key={s.name} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ color: s.type === 'skill' ? '#38bdf8' : '#a78bfa', marginRight: 6 }}>
                        {s.type === 'skill' ? '🧠' : '🔧'}
                      </span>
                      {s.name}
                    </td>
                    <td style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>{s.type}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{s.totalHits}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{s.todayHits}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: s.successRate > 0.9 ? '#4ade80' : s.successRate > 0.7 ? '#fbbf24' : '#f87171' }}>
                      {(s.successRate * 100).toFixed(0)}%
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{s.avgDuration.toFixed(0)}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
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

function Bar({ name, value, max, color }: { name: string; value: number; max: number; color: string }) {
  const pct = Math.max((value / max) * 100, value > 0 ? 8 : 0);
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.15rem' }}>
        <span>{name}</span>
        <span style={{ color: '#94a3b8' }}>{value}</span>
      </div>
      <div style={{ background: '#0f172a', borderRadius: 4, height: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}
