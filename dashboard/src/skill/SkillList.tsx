import React, { useEffect, useState, useCallback } from 'react';
import type { SkillMeta, CacheEntry } from '../types';

const FALLBACK_SKILLS: SkillMeta[] = [
  { name: 'gitnexus-guide', category: 'gitnexus', description: 'GitNexus 工具速查表', triggers: ['说明书', '怎么用'], injectionTargets: ['qoder', 'claude'] },
  { name: 'gitnexus-exploring', category: 'gitnexus', description: '架构探索 - 追踪执行流', triggers: ['怎么工作的', '架构'], injectionTargets: ['qoder', 'claude'] },
  { name: 'gitnexus-impact-analysis', category: 'gitnexus', description: '影响范围分析', triggers: ['影响什么', '爆炸半径'], injectionTargets: ['qoder', 'claude'] },
  { name: 'gitnexus-debugging', category: 'gitnexus', description: 'Bug 追踪定位', triggers: ['为什么失败', '调试'], injectionTargets: ['qoder', 'claude'] },
  { name: 'gitnexus-refactoring', category: 'gitnexus', description: '安全重构', triggers: ['重命名', '重构'], injectionTargets: ['qoder', 'claude'] },
  { name: 'gitnexus-cli', category: 'gitnexus', description: 'CLI 操作', triggers: ['analyze', 'status'], injectionTargets: ['qoder', 'claude'] },
  { name: 'gitnexus-pr-review', category: 'gitnexus', description: 'PR 审查', triggers: ['审查PR', '合并风险'], injectionTargets: ['qoder', 'claude'] },
  { name: 'brainstorming', category: 'superpowers', description: '需求探索 - 澄清目标和约束', triggers: ['想法', '方案对比'], injectionTargets: ['qoder', 'claude', 'copilot'] },
  { name: 'writing-plans', category: 'superpowers', description: '输出实现计划', triggers: ['计划', '任务拆解'], injectionTargets: ['qoder', 'claude'] },
  { name: 'test-driven-development', category: 'superpowers', description: '测试驱动开发', triggers: ['TDD', '测试先行'], injectionTargets: ['qoder', 'claude'] },
  { name: 'systematic-debugging', category: 'superpowers', description: '系统化调试', triggers: ['bug', '调试'], injectionTargets: ['qoder', 'claude'] },
  { name: 'mcp-exe', category: 'mcp', description: '执行 MCP 工具的标准方法', triggers: ['调用MCP', '用MCP工具'], injectionTargets: ['qoder', 'claude'] },
  { name: 'an-ui', category: 'an-ui', description: 'PC端组件库 - 高级表单表格', triggers: ['an-ui', 'FormPro'], injectionTargets: ['qoder', 'claude', 'copilot'] },
  { name: 'self-improvement', category: 'self-improvement', description: '持续改进 - 记录错误和经验', triggers: ['记录学习', '自我改进'], injectionTargets: ['qoder', 'claude'] },
  { name: 'writing-skills', category: 'writing-skills', description: '创建和修订技能', triggers: ['写技能', '修改技能'], injectionTargets: ['qoder', 'claude'] },
  { name: 'page-development-workflow', category: 'page-dev', description: '页面开发标准化工作流', triggers: ['开发页面', '实现设计稿'], injectionTargets: ['qoder', 'claude', 'copilot'] },
];

export default function SkillList() {
  const [skills, setSkills] = useState<SkillMeta[]>(FALLBACK_SKILLS);
  const [cached, setCached] = useState<CacheEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [skillsRes, cacheRes] = await Promise.all([
        fetch('/api/skills'),
        fetch('/api/skills/cached'),
      ]);
      const skillsData: SkillMeta[] = await skillsRes.json();
      const cacheData: CacheEntry[] = await cacheRes.json();
      if (skillsData.length > 0) setSkills(skillsData);
      setCached(cacheData);
      setSelected(new Set(cacheData.map(c => c.name)));
    } catch {
      // 使用 fallback
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const saveCache = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/skills/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: [...selected] }),
      });
      await res.json();
      const cacheRes = await fetch('/api/skills/cached');
      setCached(await cacheRes.json());
    } catch { /* ignore */ }
    setSaving(false);
  };

  const clearCache = async () => {
    try {
      await fetch('/api/skills/cache', { method: 'DELETE' });
      setSelected(new Set());
      setCached([]);
    } catch { /* ignore */ }
  };

  const filtered = skills.filter(s =>
    s.name.toLowerCase().includes(filter.toLowerCase()) ||
    s.category.toLowerCase().includes(filter.toLowerCase()) ||
    s.description.toLowerCase().includes(filter.toLowerCase())
  );
  const categories = [...new Set(filtered.map(s => s.category))];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>📋 技能列表</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            {cached.length} 个已缓存
          </span>
          <button onClick={saveCache} disabled={saving}
            style={{
              padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
              background: saving ? '#475569' : '#38bdf8', color: '#0f172a',
              fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
            }}>
            {saving ? '保存中...' : '💾 缓存选中'}
          </button>
          {cached.length > 0 && (
            <button onClick={clearCache}
              style={{
                padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #ef4444',
                background: 'transparent', color: '#ef4444',
                cursor: 'pointer', fontSize: '0.85rem',
              }}>
              🗑 清除缓存
            </button>
          )}
        </div>
      </div>

      <input type="text" placeholder="搜索技能..." value={filter} onChange={e => setFilter(e.target.value)}
        style={{
          width: '100%', padding: '0.65rem 1rem', borderRadius: 8, border: '1px solid #334155',
          background: '#1e293b', color: '#e2e8f0', fontSize: '0.95rem', marginBottom: '1.5rem', outline: 'none',
        }} />
      {loading && <p style={{ color: '#64748b' }}>加载中...</p>}
      {categories.map(cat => (
        <section key={cat} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#38bdf8', marginBottom: '0.75rem' }}>
            {cat.toUpperCase()} ({filtered.filter(s => s.category === cat).length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filtered.filter(s => s.category === cat).map(skill => {
              const isCached = cached.some(c => c.name === skill.name);
              const isSelected = selected.has(skill.name);
              return (
                <div key={skill.name} onClick={() => toggleSelect(skill.name)}
                  style={{
                    background: isCached ? '#1a2e3f' : '#1e293b',
                    borderRadius: 10, padding: '0.9rem 1rem',
                    borderLeft: isCached ? '3px solid #38bdf8' : '3px solid #334155',
                    cursor: 'pointer', transition: 'all 0.15s',
                    opacity: isSelected ? 1 : 0.75,
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 4,
                        border: `2px solid ${isSelected ? '#38bdf8' : '#475569'}`,
                        background: isSelected ? '#38bdf8' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', color: '#0f172a',
                      }}>
                        {isSelected ? '✓' : ''}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{skill.name}</span>
                      {isCached && <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>● 已缓存</span>}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      注入: {skill.injectionTargets.join(', ')}
                    </span>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem' }}>{skill.description}</p>
                  {skill.triggers.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {skill.triggers.slice(0, 6).map((t, i) => (
                        <span key={i} style={{ padding: '0.15rem 0.45rem', background: '#0f172a', borderRadius: 4, fontSize: '0.72rem', color: '#94a3b8' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
