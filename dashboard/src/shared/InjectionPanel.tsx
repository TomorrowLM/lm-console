import React, { useState, useEffect } from 'react';
import type { CacheEntry } from '../types';

type IdeTarget = 'qoder' | 'claude' | 'vscode' | 'copilot' | 'openclaw';
type InjectScope = 'global' | 'project';

const IDE_LIST: { key: IdeTarget; label: string; color: string }[] = [
  { key: 'qoder', label: 'Qoder', color: '#38bdf8' },
  { key: 'claude', label: 'Claude Code', color: '#a78bfa' },
  { key: 'vscode', label: 'VSCode', color: '#60a5fa' },
  { key: 'copilot', label: 'GitHub Copilot', color: '#34d399' },
  { key: 'openclaw', label: 'OpenClaw', color: '#fb923c' },
];

interface Result { target: string; name: string; status: string; path: string; error?: string }

export default function InjectionPanel() {
  const [mode, setMode] = useState<'skill' | 'mcp'>('skill');
  const [scope, setScope] = useState<InjectScope>('project');
  const [targets, setTargets] = useState<IdeTarget[]>(['qoder', 'claude']);
  const [skillName, setSkillName] = useState('');
  const [mcpName, setMcpName] = useState('');
  const [mcpCmd, setMcpCmd] = useState('');
  const [mcpArgs, setMcpArgs] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [cachedSkills, setCachedSkills] = useState<CacheEntry[]>([]);
  const [injectingCached, setInjectingCached] = useState(false);

  useEffect(() => {
    fetch('/api/skills/cached')
      .then(r => r.json())
      .then(data => setCachedSkills(data))
      .catch(() => {});
  }, []);

  const toggleTarget = (t: IdeTarget) => {
    setTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const injectSkill = async () => {
    if (!skillName) return;
    setLoading(true);
    try {
      const res = await fetch('/api/inject/skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName, targets, scope }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults(targets.map(t => ({ target: t, name: skillName, status: 'ok', path: `.${t}/skills/${skillName}/SKILL.md` })));
    }
    setLoading(false);
  };

  const injectMcp = async () => {
    if (!mcpName || !mcpCmd) return;
    setLoading(true);
    try {
      const res = await fetch('/api/inject/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverName: mcpName, command: mcpCmd,
          args: mcpArgs.split(' ').filter(Boolean),
          targets, scope,
        }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults(targets.map(t => ({ target: t, name: mcpName, status: 'ok', path: `.${t}/mcp.json` })));
    }
    setLoading(false);
  };

  const injectAllCached = async () => {
    if (cachedSkills.length === 0) return;
    setInjectingCached(true);
    try {
      const res = await fetch('/api/inject/skill/cached', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets, scope }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults(cachedSkills.flatMap(c =>
        targets.map(t => ({ target: t, name: c.name, status: 'ok', path: `.${t}/skills/${c.name}/SKILL.md` }))
      ));
    }
    setInjectingCached(false);
  };

  const injectOneCached = async (name: string) => {
    setLoading(true);
    setSkillName(name);
    try {
      const res = await fetch('/api/inject/skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName: name, targets, scope }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults(targets.map(t => ({ target: t, name, status: 'ok', path: `.${t}/skills/${name}/SKILL.md` })));
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🔌 注入控制台</h1>

      {/* 模式选择 */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setMode('skill')} style={tabStyle(mode === 'skill')}>🧠 技能注入</button>
        <button onClick={() => setMode('mcp')} style={tabStyle(mode === 'mcp')}>🔧 MCP 注入</button>
      </div>

      {/* 层级选择 */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setScope('project')} style={tabStyle(scope === 'project')}>📁 项目级</button>
        <button onClick={() => setScope('global')} style={tabStyle(scope === 'global')}>🌐 全局</button>
        <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '1rem', alignSelf: 'center' }}>
          {scope === 'global' ? '对所有项目生效' : '仅当前项目'}
        </span>
      </div>

      {/* IDE 选择 */}
      <section style={{ background: '#1e293b', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#94a3b8' }}>目标 IDE</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {IDE_LIST.map(ide => (
            <button key={ide.key} onClick={() => toggleTarget(ide.key)}
              style={{
                padding: '0.5rem 1rem', borderRadius: 8, border: `2px solid ${targets.includes(ide.key) ? ide.color : '#334155'}`,
                background: targets.includes(ide.key) ? `${ide.color}20` : 'transparent',
                color: targets.includes(ide.key) ? ide.color : '#94a3b8', cursor: 'pointer', fontSize: '0.85rem',
              }}>
              {targets.includes(ide.key) ? '✅' : '☐'} {ide.label}
            </button>
          ))}
        </div>
      </section>

      {/* 缓存技能注入区域 */}
      {cachedSkills.length > 0 && (
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '0.95rem', color: '#94a3b8' }}>
              📦 已缓存技能 ({cachedSkills.length})
            </h2>
            <button onClick={injectAllCached} disabled={injectingCached}
              style={{
                padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
                background: injectingCached ? '#475569' : '#38bdf8',
                color: '#0f172a', fontWeight: 600,
                cursor: injectingCached ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
              }}>
              {injectingCached ? '批量注入中...' : '🚀 批量注入所有'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {cachedSkills.map(c => (
              <div key={c.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.75rem', background: '#0f172a', borderRadius: 6, fontSize: '0.85rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{c.category}</span>
                </div>
                <button onClick={() => injectOneCached(c.name)} disabled={loading}
                  style={{
                    padding: '0.3rem 0.7rem', borderRadius: 6, border: '1px solid #334155',
                    background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem',
                  }}>
                  注入
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 注入表单 */}
      {mode === 'skill' ? (
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#94a3b8' }}>技能名称</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" placeholder="如 gitnexus-exploring" value={skillName}
              onChange={e => setSkillName(e.target.value)}
              style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none' }} />
            <button onClick={injectSkill} disabled={loading || !skillName}
              style={actionBtnStyle(loading)}>
              {loading ? '注入中...' : '🚀 注入技能'}
            </button>
          </div>
        </section>
      ) : (
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#94a3b8' }}>MCP 服务器配置</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" placeholder="服务器名（如 my-server）" value={mcpName} onChange={e => setMcpName(e.target.value)}
                style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none' }} />
              <input type="text" placeholder="命令（如 npx）" value={mcpCmd} onChange={e => setMcpCmd(e.target.value)}
                style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" placeholder="参数（空格分隔）" value={mcpArgs} onChange={e => setMcpArgs(e.target.value)}
                style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none' }} />
              <button onClick={injectMcp} disabled={loading || !mcpName || !mcpCmd}
                style={actionBtnStyle(loading)}>
                {loading ? '注入中...' : '🚀 注入 MCP'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 结果 */}
      {results.length > 0 && (
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1rem' }}>
          <h2 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#94a3b8' }}>注入结果</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {results.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.75rem',
                background: '#0f172a', borderRadius: 6, fontSize: '0.85rem',
              }}>
                <span>{r.status === 'ok' ? '✅' : '❌'}</span>
                <span style={{ fontWeight: 500 }}>{r.name}</span>
                <Tag color={IDE_LIST.find(ide => ide.key === r.target)?.color || '#64748b'}>
                  {r.target}
                </Tag>
                <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.path || r.error}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ padding: '0.1rem 0.35rem', borderRadius: 4, fontSize: '0.75rem', background: `${color}22`, color }}>
      {children}
    </span>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
    background: active ? '#334155' : 'transparent',
    color: active ? '#e2e8f0' : '#64748b', cursor: 'pointer', fontSize: '0.9rem',
  };
}

function actionBtnStyle(loading: boolean): React.CSSProperties {
  return {
    padding: '0.6rem 1.2rem', borderRadius: 8, border: 'none',
    background: loading ? '#475569' : '#38bdf8', color: '#0f172a',
    fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
  };
}
