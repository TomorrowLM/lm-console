import React, { useEffect, useState } from 'react';
import type { McpServerMeta } from '../types';

export default function McpToolList() {
  const [servers, setServers] = useState<McpServerMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState<string | null>(null);

  const fetchServers = () => {
    fetch('/api/mcp-servers')
      .then(r => r.json())
      .then(data => { setServers(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchServers(); }, []);

  const probeServer = async (name: string) => {
    setProbing(name);
    await fetch('/api/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverName: name }),
    });
    await fetchServers();
    setProbing(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>🛠️ MCP 工具列表</h1>
        <button onClick={fetchServers} style={btnStyle()}>🔄 刷新</button>
      </div>

      {loading && <p style={{ color: '#64748b' }}>加载中...</p>}

      {servers.length === 0 && !loading && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
          未发现 MCP 服务器
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {servers.map(server => (
          <section key={server.name} style={{
            background: '#1e293b', borderRadius: 12, padding: '1.25rem',
            borderLeft: `4px solid ${server.error ? '#f87171' : server.tools.length > 0 ? '#4ade80' : '#94a3b8'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{server.name}</span>
                <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '0.75rem' }}>
                  {server.command} {server.args.join(' ')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {server.error && <span style={{ color: '#f87171', fontSize: '0.8rem' }}>⚠️ {server.error}</span>}
                <button onClick={() => probeServer(server.name)} disabled={probing === server.name} style={btnStyle()}>
                  {probing === server.name ? '探测中...' : '🔍 探测'}
                </button>
              </div>
            </div>

            {server.tools.length > 0 ? (
              <div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  共 {server.tools.length} 个工具
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {server.tools.map(tool => (
                    <div key={tool.name} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.4rem 0.75rem', background: '#0f172a', borderRadius: 6, fontSize: '0.85rem',
                    }}>
                      <span style={{ color: '#a78bfa', fontWeight: 500 }}>{tool.name}</span>
                      {tool.description && <span style={{ color: '#64748b' }}>- {tool.description}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                {server.error ? '探测失败' : '点击探测获取工具列表'}
              </p>
            )}

            {server.lastProbed && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                上次探测: {new Date(server.lastProbed).toLocaleString()}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function btnStyle(): React.CSSProperties {
  return {
    padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid #475569',
    background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem',
  };
}
