import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { DevToolsTransport } from '../transport/DevToolsTransport';
import type { RecordedMessage, MessageStatus } from '../types/index';
import { WaterfallView } from './WaterfallView';

export interface DashboardProps {
  transport: DevToolsTransport;
}

export function Dashboard({ transport }: DashboardProps) {
  const [messages, setMessages] = useState<RecordedMessage[]>([]);
  const [selectedMsg, setSelectedMsg] = useState<RecordedMessage | null>(null);
  const [filter, setFilter] = useState<'all' | MessageStatus>('all');
  const [pluginFilter, setPluginFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'payload' | 'response' | 'waterfall' | 'raw'>('payload');

  useEffect(() => {
    transport.onMessage((data) => {
      if (data.type === 'record') {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.recordId === data.record.recordId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data.record;
            return next;
          }
          return [...prev, data.record];
        });
      } else if (data.type === 'clear') {
        setMessages([]);
        setSelectedMsg(null);
      }
    });
  }, [transport]);

  // Update selected message when it gets updated
  useEffect(() => {
    if (selectedMsg) {
      const updated = messages.find((m) => m.recordId === selectedMsg.recordId);
      if (updated && updated !== selectedMsg) setSelectedMsg(updated);
    }
  }, [messages, selectedMsg]);

  const pluginNames = useMemo(() => {
    const names = new Set<string>();
    for (const m of messages) {
      const dot = m.action.indexOf('.');
      if (dot > 0) names.add(m.action.slice(0, dot));
    }
    return Array.from(names).sort();
  }, [messages]);

  const filtered = useMemo(() => {
    let result = messages;
    if (filter !== 'all') result = result.filter((m) => m.status === filter);
    if (pluginFilter) result = result.filter((m) => m.action.startsWith(pluginFilter + '.'));
    if (search) {
      const term = search.toLowerCase();
      result = result.filter((m) => m.action.toLowerCase().includes(term));
    }
    return result.slice().reverse();
  }, [messages, filter, pluginFilter, search]);

  const metrics = useMemo(() => {
    const completed = messages.filter((m) => m.duration != null);
    const total = messages.length;
    const errors = messages.filter((m) => m.status === 'error').length;
    const successRate = total > 0 ? ((total - errors) / total) * 100 : 0;
    const avgMs =
      completed.length > 0
        ? completed.reduce((s, m) => s + (m.duration ?? 0), 0) / completed.length
        : 0;
    return { total, errors, successRate, avgMs };
  }, [messages]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setSelectedMsg(null);
  }, []);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(messages, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ts-bridge-devtools-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  const hasTrace = selectedMsg?.middlewareTrace && selectedMsg.middlewareTrace.length > 0;

  return (
    <div style={S.root}>
      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={S.toolbarLeft}>
          <div style={S.logo}>
            ts-bridge <span style={S.logoSub}>DevTools</span>
          </div>
          <div style={S.connection}>
            <span style={S.connectionDot} />
            {transport.connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <div style={S.stats}>
          <Stat label="Total" value={metrics.total} />
          <Stat label="Success" value={`${Math.round(metrics.successRate)}%`} color="#22c55e" />
          <Stat label="Errors" value={metrics.errors} color="#ef4444" />
          <Stat label="Avg" value={`${metrics.avgMs.toFixed(0)}ms`} color="#f59e0b" />
        </div>
        <div style={S.toolbarActions}>
          <button style={S.actionBtn} onClick={handleClear}>
            Clear
          </button>
          <button style={S.actionBtn} onClick={handleExport}>
            Export
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={S.filterBar}>
        <div style={S.filterGroup}>
          {(['all', 'success', 'error', 'pending'] as const).map((f) => (
            <button
              key={f}
              style={{ ...S.filterBtn, ...(filter === f ? S.filterBtnActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        {pluginNames.length > 0 && (
          <>
            <div style={S.divider} />
            {pluginNames.map((name) => (
              <button
                key={name}
                style={{
                  ...S.pluginBtn,
                  ...(pluginFilter === name ? S.pluginBtnActive : {}),
                }}
                onClick={() => setPluginFilter(pluginFilter === name ? null : name)}
              >
                {name}
              </button>
            ))}
          </>
        )}
        <input
          style={S.searchInput}
          placeholder="Filter actions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Body */}
      <div style={S.body}>
        {/* Timeline */}
        <div style={S.timeline}>
          {filtered.length === 0 ? (
            <div style={S.empty}>
              {messages.length === 0
                ? 'Waiting for bridge messages...'
                : 'No messages match filter'}
            </div>
          ) : (
            filtered.map((msg) => (
              <MessageRow
                key={msg.recordId}
                msg={msg}
                selected={selectedMsg?.recordId === msg.recordId}
                onClick={() => {
                  setSelectedMsg(msg);
                  if (msg.middlewareTrace?.length) setTab('waterfall');
                  else setTab('payload');
                }}
              />
            ))
          )}
        </div>

        {/* Inspector */}
        <div style={S.inspector}>
          {selectedMsg ? (
            <>
              <div style={S.inspectorTabs}>
                {(['payload', 'response', 'waterfall', 'raw'] as const).map((t) =>
                  t === 'waterfall' && !hasTrace ? null : (
                    <button
                      key={t}
                      style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }}
                      onClick={() => setTab(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  )
                )}
              </div>
              <div style={S.inspectorBody}>
                {tab === 'waterfall' && hasTrace ? (
                  <WaterfallView
                    traces={selectedMsg.middlewareTrace!}
                    handlerMs={selectedMsg.handlerMs}
                    handlerSkipped={selectedMsg.handlerSkipped}
                    totalMs={selectedMsg.duration}
                  />
                ) : (
                  <>
                    <div style={S.inspectorHeader}>
                      <span
                        style={{
                          ...S.statusBadge,
                          backgroundColor:
                            selectedMsg.status === 'success'
                              ? '#14532d'
                              : selectedMsg.status === 'error'
                                ? '#450a0a'
                                : '#1e3a5f',
                          color:
                            selectedMsg.status === 'success'
                              ? '#4ade80'
                              : selectedMsg.status === 'error'
                                ? '#f87171'
                                : '#60a5fa',
                        }}
                      >
                        {selectedMsg.status.toUpperCase()}
                      </span>
                      <span style={S.inspectorAction}>{selectedMsg.action}</span>
                      {selectedMsg.duration != null && (
                        <span style={S.inspectorDuration}>{selectedMsg.duration.toFixed(0)}ms</span>
                      )}
                    </div>
                    <pre style={S.codeBlock}>
                      {tab === 'payload'
                        ? JSON.stringify(selectedMsg.payload ?? null, null, 2)
                        : tab === 'response'
                          ? JSON.stringify(
                              selectedMsg.error
                                ? { error: selectedMsg.error }
                                : (selectedMsg.responseData ?? null),
                              null,
                              2
                            )
                          : JSON.stringify(selectedMsg, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            </>
          ) : (
            <div style={S.empty}>Select a message to inspect</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageRow({
  msg,
  selected,
  onClick,
}: {
  msg: RecordedMessage;
  selected: boolean;
  onClick: () => void;
}) {
  const color =
    msg.status === 'success'
      ? '#22c55e'
      : msg.status === 'error'
        ? '#ef4444'
        : msg.status === 'pending'
          ? '#f59e0b'
          : '#64748b';
  const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false });
  const globalCount = msg.middlewareTrace?.filter((t) => t.layer === 'global').length ?? 0;
  const pluginCount = msg.middlewareTrace?.filter((t) => t.layer === 'plugin').length ?? 0;

  return (
    <div
      onClick={onClick}
      style={{
        ...S.msgItem,
        ...(selected ? S.msgItemSelected : {}),
      }}
    >
      <div style={{ ...S.msgIcon, backgroundColor: color }} />
      <div style={S.msgInfo}>
        <div style={S.msgAction}>{msg.action}</div>
        <div style={S.msgMeta}>
          {globalCount > 0 && <span style={S.badgeGlobal}>G&times;{globalCount}</span>}
          {pluginCount > 0 && <span style={S.badgePlugin}>P&times;{pluginCount}</span>}
          {msg.handlerSkipped && <span style={S.badgeSkip}>short-circuit</span>}
        </div>
      </div>
      <div style={S.msgDuration}>{msg.duration != null ? `${msg.duration.toFixed(0)}ms` : '—'}</div>
      <div style={S.msgTime}>{time}</div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={S.stat}>
      <div style={S.statValue} {...(color ? { style: { ...S.statValue, color } } : {})}>
        {value}
      </div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

// ---------- Styles ----------

const S: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    flexShrink: 0,
  },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { fontSize: 15, fontWeight: 700, color: '#3b82f6', letterSpacing: -0.5 },
  logoSub: { color: '#64748b', fontWeight: 400 },
  connection: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#22c55e' },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#22c55e',
  },
  stats: { display: 'flex', gap: 16 },
  stat: { textAlign: 'center' },
  statValue: { fontSize: 16, fontWeight: 700, color: '#f8fafc' },
  statLabel: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  toolbarActions: { display: 'flex', gap: 8 },
  actionBtn: {
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    flexShrink: 0,
  },
  filterGroup: { display: 'flex', gap: 2 },
  filterBtn: {
    padding: '4px 10px',
    borderRadius: 4,
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: 11,
    cursor: 'pointer',
    textTransform: 'capitalize',
  },
  filterBtnActive: { background: '#3b82f6', color: '#fff' },
  divider: { width: 1, height: 16, background: '#334155' },
  pluginBtn: {
    padding: '4px 8px',
    borderRadius: 4,
    border: '1px solid #334155',
    background: 'transparent',
    color: '#64748b',
    fontSize: 11,
    cursor: 'pointer',
  },
  pluginBtnActive: { borderColor: '#3b82f6', color: '#3b82f6' },
  searchInput: {
    marginLeft: 'auto',
    padding: '4px 10px',
    borderRadius: 4,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: 12,
    width: 200,
    outline: 'none',
  },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  timeline: {
    width: 360,
    borderRight: '1px solid #334155',
    overflowY: 'auto',
    flexShrink: 0,
  },
  msgItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderBottom: '1px solid #1e293b',
    cursor: 'pointer',
  },
  msgItemSelected: { backgroundColor: '#1e293b', borderLeft: '3px solid #3b82f6' },
  msgIcon: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  msgInfo: { flex: 1, minWidth: 0 },
  msgAction: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  msgMeta: { display: 'flex', gap: 6, marginTop: 2 },
  badgeGlobal: {
    fontSize: 10,
    padding: '1px 5px',
    borderRadius: 3,
    background: '#1e3a5f',
    color: '#60a5fa',
  },
  badgePlugin: {
    fontSize: 10,
    padding: '1px 5px',
    borderRadius: 3,
    background: '#1a3a2a',
    color: '#4ade80',
  },
  badgeSkip: {
    fontSize: 10,
    padding: '1px 5px',
    borderRadius: 3,
    background: '#3a1a1a',
    color: '#f87171',
  },
  msgDuration: { fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' },
  msgTime: { fontSize: 11, color: '#475569', whiteSpace: 'nowrap' },
  inspector: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  inspectorTabs: { display: 'flex', borderBottom: '1px solid #334155', flexShrink: 0 },
  tab: {
    padding: '8px 16px',
    fontSize: 12,
    color: '#64748b',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
  },
  tabActive: { color: '#3b82f6', borderBottomColor: '#3b82f6' },
  inspectorBody: { flex: 1, overflowY: 'auto', padding: 16 },
  inspectorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  inspectorAction: { fontSize: 14, fontWeight: 600 },
  inspectorDuration: { fontSize: 12, color: '#64748b' },
  codeBlock: {
    background: '#1e293b',
    borderRadius: 6,
    padding: 12,
    fontSize: 12,
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    lineHeight: 1.6,
    overflow: 'auto',
    color: '#a5f3fc',
    margin: 0,
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#475569',
    fontSize: 13,
  },
};
