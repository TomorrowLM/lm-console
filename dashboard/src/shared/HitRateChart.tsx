import React from 'react';
import type { HitStats } from '../types';

interface Props { stats: Record<string, HitStats> }

export default function HitRateChart({ stats }: Props) {
  const values = Object.values(stats).sort((a, b) => b.totalHits - a.totalHits);
  const skills = values.filter(s => s.type === 'skill');
  const mcps = values.filter(s => s.type === 'mcp');

  if (values.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📈 命中率图表</h1>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
          暂无数据，使用技能或 MCP 后查看
        </div>
      </div>
    );
  }

  const maxTotal = Math.max(...values.map(v => v.totalHits), 1);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📈 命中率图表</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* 技能排行 */}
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>🧠 技能命中排行</h2>
          {skills.map(s => <Bar key={s.name} name={s.name} value={s.totalHits} max={maxTotal} color="#38bdf8" />)}
          {skills.length === 0 && <p style={{ color: '#64748b' }}>暂无</p>}
        </section>

        {/* MCP 排行 */}
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>🔧 MCP 调用排行</h2>
          {mcps.map(s => <Bar key={s.name} name={s.name} value={s.totalHits} max={maxTotal} color="#a78bfa" />)}
          {mcps.length === 0 && <p style={{ color: '#64748b' }}>暂无</p>}
        </section>
      </div>

      {/* 详情表 */}
      <section style={{ background: '#1e293b', borderRadius: 12, padding: '1.5rem', marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📋 全部统计</h2>
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
            {values.filter(s => s.totalHits > 0).map(s => (
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
      </section>
    </div>
  );
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
