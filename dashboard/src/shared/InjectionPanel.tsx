import React, { useState, useEffect } from 'react';
import type { CacheEntry, SkillMeta } from '../types';

type IdeTarget = 'qoder' | 'claude' | 'vscode' | 'copilot' | 'openclaw';
type InjectScope = 'global' | 'project';

interface McpPreset {
  key: string;
  label: string;
  description: string;
  serverName: string;
  command: string;
  args: string;
  needsApiKey?: { label: string; placeholder: string; argKey: string };
}

const MCP_PRESETS: McpPreset[] = [
  {
    key: 'front-mcp',
    label: '🧪 front-mcp',
    description: '自研 LM MCP 服务器（Swagger 解析 / API 生成 / UI 生成）',
    serverName: 'lm-mcp-server',
    command: 'node',
    args: 'libs/mcps/front-mcp/dist/index.js',
  },
  {
    key: 'figma',
    label: '🎨 Framelink MCP for Figma',
    description: 'Figma 设计稿数据获取',
    serverName: 'Framelink MCP for Figma',
    command: 'npx',
    args: '-y figma-developer-mcp --figma-api-key={{FIGMA_API_KEY}} --stdio',
    needsApiKey: { label: 'Figma API Key', placeholder: 'figd_...', argKey: '{{FIGMA_API_KEY}}' },
  },
];

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
  const [mcpName, setMcpName] = useState('');
  const [mcpCmd, setMcpCmd] = useState('');
  const [mcpArgs, setMcpArgs] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [figmaApiKey, setFigmaApiKey] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectRoot, setProjectRoot] = useState('');
  const [allSkills, setAllSkills] = useState<SkillMeta[]>([]);
  const [cachedSkills, setCachedSkills] = useState<CacheEntry[]>([]);
  const [injectingCached, setInjectingCached] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; type: 'ok' | 'err'; msg: string }[]>([]);
  let toastId = 0;

  const showToast = (type: 'ok' | 'err', msg: string) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    fetch('/api/skills')
      .then(r => r.json())
      .then(data => setAllSkills(data))
      .catch(() => {});
    fetch('/api/skills/cached')
      .then(r => r.json())
      .then(data => setCachedSkills(data))
      .catch(() => {});
  }, []);

  const canInject = scope === 'global' || projectRoot.trim() !== '';

  const cacheAllSkills = async () => {
    if (allSkills.length === 0) return;
    try {
      const names = allSkills.map(s => s.name);
      const res = await fetch('/api/skills/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, clear: true }),
      });
      const data = await res.json();
      setCachedSkills(allSkills.map(s => ({
        name: s.name, category: s.category, description: s.description, cachedAt: new Date().toISOString(),
      })));
      showToast('ok', `已缓存 ${data.count || allSkills.length} 个技能`);
    } catch {
      showToast('err', '缓存技能失败');
    }
  };

  const injectAllMcp = async () => {
    if (!canInject || MCP_PRESETS.length === 0) return;
    setLoading(true);
    let ok = 0, fail = 0;
    for (const p of MCP_PRESETS) {
      try {
        const args = p.needsApiKey
          ? p.args.replace(p.needsApiKey.argKey, figmaApiKey || '').split(' ').filter(Boolean)
          : p.args.split(' ').filter(Boolean);
        const res = await fetch('/api/inject/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverName: p.serverName, command: p.command, args, targets, scope, projectRoot }),
        });
        const data = await res.json();
        const allOk = (data.results || []).every((r: Result) => r.status === 'ok');
        if (allOk) ok++; else fail++;
        setResults(prev => [...prev, ...(data.results || [])]);
      } catch {
        fail++;
      }
    }
    setLoading(false);
    if (fail === 0) showToast('ok', `${ok} 个 MCP 全部注入成功`);
    else showToast('err', `${ok} 成功, ${fail} 失败`);
  };

  const pickFolder = async () => {
    try {
      const res = await fetch('/api/pick-folder', { method: 'POST' });
      const data = await res.json();
      if (data.path) setProjectRoot(data.path);
    } catch { /* ignore */ }
  };

  const toggleTarget = (t: IdeTarget) => {
    setTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const selectPreset = (preset: McpPreset) => {
    setSelectedPreset(preset.key);
    setMcpName(preset.serverName);
    setMcpCmd(preset.command);
    if (preset.needsApiKey) {
      setMcpArgs(preset.args.replace(preset.needsApiKey.argKey, figmaApiKey || ''));
    } else {
      setMcpArgs(preset.args);
    }
  };

  const injectMcp = async () => {
    if (!mcpName || !mcpCmd || !canInject) return;
    setLoading(true);
    try {
      const res = await fetch('/api/inject/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverName: mcpName, command: mcpCmd,
          args: mcpArgs.split(' ').filter(Boolean),
          targets, scope, projectRoot,
        }),
      });
      const data = await res.json();
      setResults(data.results || []);
      const allOk = (data.results || []).every((r: Result) => r.status === 'ok');
      showToast(allOk ? 'ok' : 'err', allOk ? `${mcpName} 注入成功` : `${mcpName} 部分失败`);
    } catch {
      showToast('err', `${mcpName} 注入失败`);
    }
    setLoading(false);
  };

  const injectAllCached = async () => {
    if (cachedSkills.length === 0 || !canInject) return;
    setInjectingCached(true);
    try {
      const res = await fetch('/api/inject/skill/cached', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets, scope, projectRoot }),
      });
      const data = await res.json();
      setResults(data.results || []);
      const allOk = (data.results || []).every((r: Result) => r.status === 'ok');
      showToast(allOk ? 'ok' : 'err', allOk ? `${data.count || cachedSkills.length} 个技能全部注入成功` : '部分技能注入失败');
    } catch {
      showToast('err', '批量注入失败');
    }
    setInjectingCached(false);
  };

  const injectOneCached = async (name: string) => {
    if (!canInject) return;
    setLoading(true);
    try {
      const res = await fetch('/api/inject/skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName: name, targets, scope, projectRoot }),
      });
      const data = await res.json();
      setResults(data.results || []);
      const allOk = (data.results || []).every((r: Result) => r.status === 'ok');
      showToast(allOk ? 'ok' : 'err', allOk ? `${name} 注入成功` : `${name} 注入失败`);
    } catch {
      showToast('err', `${name} 注入失败`);
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Toast 通知 */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '0.6rem 1rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 500,
            background: t.type === 'ok' ? '#065f46' : '#7f1d1d',
            color: t.type === 'ok' ? '#6ee7b7' : '#fca5a5',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            animation: 'fadeIn 0.2s ease-out',
            maxWidth: 360,
          }}>
            {t.type === 'ok' ? '✅' : '❌'} {t.msg}
          </div>
        ))}
      </div>

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
          {scope === 'global' ? '对所有项目生效' : '注入到指定项目文件夹'}
        </span>
      </div>

      {/* 项目路径选择（仅项目级） */}
      {scope === 'project' && (
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#94a3b8' }}>📂 目标项目文件夹</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" placeholder="如 /Users/zm/my-project" value={projectRoot}
              onChange={e => setProjectRoot(e.target.value)}
              style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={pickFolder}
              style={{
                padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #334155',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
              📁 选择文件夹
            </button>
          </div>
        </section>
      )}

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
      {mode === 'skill' && cachedSkills.length > 0 && (
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '0.95rem', color: '#94a3b8' }}>
              📦 已缓存技能 ({cachedSkills.length})
            </h2>
            <button onClick={injectAllCached} disabled={injectingCached || !canInject}
              style={{
                padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
                background: injectingCached || !canInject ? '#475569' : '#38bdf8',
                color: '#0f172a', fontWeight: 600,
                cursor: injectingCached || !canInject ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
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
                <button onClick={() => injectOneCached(c.name)} disabled={loading || !canInject}
                  style={{
                    padding: '0.3rem 0.7rem', borderRadius: 6, border: '1px solid #334155',
                    background: 'transparent', color: loading || !canInject ? '#475569' : '#94a3b8', cursor: loading || !canInject ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
                  }}>
                  注入
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 技能列表注入区域 */}
      {mode === 'skill' && allSkills.length > 0 && (
        <section style={{ background: '#1e293b', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '0.95rem', color: '#94a3b8' }}>
              📋 全部技能 ({allSkills.length})
            </h2>
            <button onClick={cacheAllSkills}
              style={{
                padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #38bdf8',
                background: 'transparent', color: '#38bdf8', fontWeight: 600,
                cursor: 'pointer', fontSize: '0.85rem',
              }}>
              📋 缓存全部
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 400, overflowY: 'auto' }}>
            {allSkills.map(s => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.75rem', background: '#0f172a', borderRadius: 6, fontSize: '0.85rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{s.name}</span>
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{s.category}</span>
                  <span style={{ color: '#475569', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description}</span>
                </div>
                <button onClick={() => injectOneCached(s.name)} disabled={loading || !canInject}
                  style={{
                    padding: '0.3rem 0.7rem', borderRadius: 6, border: '1px solid #334155',
                    background: 'transparent', color: loading || !canInject ? '#475569' : '#94a3b8', cursor: loading || !canInject ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
                    flexShrink: 0, marginLeft: '0.5rem',
                  }}>
                  注入
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 注入表单 */}
      {mode === 'skill' ? null : (
        <>
          {/* MCP 预设 */}
          <section style={{ background: '#1e293b', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '0.95rem', color: '#94a3b8', margin: 0 }}>📦 可选 MCP 来源</h2>
              <button onClick={injectAllMcp} disabled={loading || !canInject}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
                  background: loading || !canInject ? '#475569' : '#38bdf8',
                  color: '#0f172a', fontWeight: 600,
                  cursor: loading || !canInject ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
                }}>
                {loading ? '注入中...' : '🚀 全部注入'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {MCP_PRESETS.map(p => (
                <div key={p.key}
                  onClick={() => selectPreset(p)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem', borderRadius: 8,
                    border: `2px solid ${selectedPreset === p.key ? '#38bdf8' : '#334155'}`,
                    background: selectedPreset === p.key ? '#0f2740' : '#0f172a',
                    cursor: 'pointer', fontSize: '0.85rem',
                    transition: 'border-color 0.2s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 500 }}>{p.label}</span>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</span>
                  </div>
                  <span style={{ color: selectedPreset === p.key ? '#38bdf8' : '#475569', marginLeft: '0.5rem', flexShrink: 0 }}>
                    {selectedPreset === p.key ? '✓' : '○'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* MCP 配置表单 */}
          <section style={{ background: '#1e293b', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: '#94a3b8' }}>🔧 MCP 服务器配置</h2>
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
              <button onClick={injectMcp} disabled={loading || !mcpName || !mcpCmd || !canInject}
                style={actionBtnStyle(loading)}>
                {loading ? '注入中...' : '🚀 注入 MCP'}
              </button>
            </div>
            {/* Figma API Key 输入 */}
            {selectedPreset === 'figma' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="Figma API Key（figd_...）" value={figmaApiKey}
                  onChange={e => {
                    setFigmaApiKey(e.target.value);
                    setMcpArgs(MCP_PRESETS.find(p => p.key === 'figma')!.args.replace('{{FIGMA_API_KEY}}', e.target.value));
                  }}
                  style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 8, border: '1px solid #f59e0b', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none' }} />
              </div>
            )}
          </div>
        </section>
        </>
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
