/**
 * TsBridgeDevtools — TanStack Query DevTools-style floating panel
 * for inspecting bridge communication in real-time.
 *
 * Usage:
 *   import { TsBridgeDevtools } from '@ts-bridge/devtools';
 *   const { bridge } = useBridge();
 *   <TsBridgeDevtools bridge={bridge} />
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DevToolsMiddleware } from '../middleware/DevToolsMiddleware';
import type { RecordedMessage, PerformanceMetrics } from '../types/index';
import { MessageDirection, MessageStatus } from '../types/index';

// ---------- Types ----------

export interface TsBridgeDevtoolsProps {
  /** BridgeManager instance (must have .use() method) */
  bridge: { use(middleware: any): void };
  /** Initial open state */
  initialOpen?: boolean;
  /** Panel position */
  position?: 'bottom-left' | 'bottom-right';
  /** Panel height when open (px) */
  panelHeight?: number;
  /** Toggle button label */
  buttonLabel?: string;
}

// ---------- Main Component ----------

export function TsBridgeDevtools({
  bridge,
  initialOpen = false,
  position = 'bottom-left',
  panelHeight = 420,
  buttonLabel = 'ts-bridge',
}: TsBridgeDevtoolsProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [messages, setMessages] = useState<RecordedMessage[]>([]);
  const [selectedMsg, setSelectedMsg] = useState<RecordedMessage | null>(null);
  const [filter, setFilter] = useState<'all' | 'request' | 'response' | 'error'>('all');
  const [search, setSearch] = useState('');
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const middlewareRef = useRef<DevToolsMiddleware | null>(null);

  // Attach middleware — StrictMode safe
  useEffect(() => {
    const mw = new DevToolsMiddleware({
      onMessage: () => {
        const store = mw.getStore();
        setMessages(store.getMessages());
        setMetrics(store.getMetrics());
      },
    });
    middlewareRef.current = mw;
    bridge.use(mw);

    return () => {
      mw.setEnabled(false);
    };
  }, [bridge]);

  const handleClear = useCallback(() => {
    middlewareRef.current?.clear();
    setMessages([]);
    setSelectedMsg(null);
    setMetrics(null);
  }, []);

  const handleExport = useCallback(() => {
    const store = middlewareRef.current?.getStore();
    if (!store) return;
    const json = store.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ts-bridge-devtools-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const filtered = useMemo(() => {
    let result = messages;
    if (filter === 'request') {
      result = result.filter((m) => m.direction === MessageDirection.REQUEST);
    } else if (filter === 'response') {
      result = result.filter(
        (m) => m.direction === MessageDirection.RESPONSE && m.status !== MessageStatus.ERROR
      );
    } else if (filter === 'error') {
      result = result.filter((m) => m.status === MessageStatus.ERROR);
    }
    if (search) {
      const term = search.toLowerCase();
      result = result.filter((m) =>
        'action' in m.message ? m.message.action.toLowerCase().includes(term) : false
      );
    }
    return result.slice().reverse(); // newest first
  }, [messages, filter, search]);

  const isRight = position === 'bottom-right';

  // ---------- Floating Button (closed) ----------

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          ...S.toggleBtn,
          [isRight ? 'right' : 'left']: 16,
        }}
        title="Open ts-bridge DevTools"
      >
        <span style={S.logo}>{'{ }'}</span> <span>{buttonLabel}</span>
        {messages.length > 0 && <span style={S.badge}>{messages.length}</span>}
      </button>
    );
  }

  // ---------- Panel (open) ----------

  return (
    <div style={{ ...S.panel, height: panelHeight, [isRight ? 'right' : 'left']: 0 }}>
      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={S.toolbarLeft}>
          <span style={S.toolbarTitle}>ts-bridge DevTools</span>
          {metrics && (
            <div style={S.statsRow}>
              <Stat label="Total" value={metrics.totalMessages} />
              <Stat
                label="OK"
                value={Math.round(metrics.successRate * 100) + '%'}
                color="#22c55e"
              />
              <Stat label="Err" value={metrics.errorCount} color="#ef4444" />
              <Stat label="Avg" value={metrics.averageResponseTime.toFixed(1) + 'ms'} />
            </div>
          )}
        </div>
        <div style={S.toolbarRight}>
          <button style={S.iconBtn} onClick={handleClear} title="Clear">
            Clear
          </button>
          <button style={S.iconBtn} onClick={handleExport} title="Export JSON">
            Export
          </button>
          <button style={S.closeBtn} onClick={() => setIsOpen(false)} title="Close">
            X
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={S.filterBar}>
        {(['all', 'request', 'response', 'error'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...S.filterBtn,
              ...(filter === f ? S.filterBtnActive : {}),
            }}
          >
            {f === 'all' ? `All (${messages.length})` : f}
          </button>
        ))}
        <input
          type="text"
          placeholder="Filter actions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={S.searchInput}
        />
      </div>

      {/* Body: timeline + inspector */}
      <div style={S.body}>
        {/* Timeline (left) */}
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
                onClick={() => setSelectedMsg(msg)}
              />
            ))
          )}
        </div>

        {/* Inspector (right) */}
        <div style={S.inspector}>
          {selectedMsg ? (
            <Inspector msg={selectedMsg} />
          ) : (
            <div style={S.empty}>Select a message to inspect</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Sub-components ----------

function MessageRow({
  msg,
  selected,
  onClick,
}: {
  msg: RecordedMessage;
  selected: boolean;
  onClick: () => void;
}) {
  const action =
    'action' in msg.message ? msg.message.action : `response #${msg.message.id.slice(-6)}`;
  const color = statusColor(msg.status);
  const icon = directionIcon(msg.direction);
  const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour12: false });

  return (
    <div
      onClick={onClick}
      style={{
        ...S.row,
        borderLeftColor: color,
        backgroundColor: selected ? '#1e293b' : 'transparent',
      }}
    >
      <span style={{ ...S.rowIcon, color }}>{icon}</span>
      <span style={S.rowAction}>{action}</span>
      {msg.duration != null && <span style={S.rowDuration}>{msg.duration.toFixed(0)}ms</span>}
      <span style={S.rowTime}>{time}</span>
    </div>
  );
}

function Inspector({ msg }: { msg: RecordedMessage }) {
  const [tab, setTab] = useState<'payload' | 'raw'>('payload');
  const isReq = msg.direction === MessageDirection.REQUEST;
  const action = 'action' in msg.message ? msg.message.action : undefined;

  return (
    <div style={S.inspectorInner}>
      {/* Header */}
      <div style={S.inspectorHeader}>
        <span style={{ ...S.inspectorBadge, backgroundColor: statusColor(msg.status) }}>
          {msg.status}
        </span>
        {action && <span style={S.inspectorAction}>{action}</span>}
        {msg.duration != null && (
          <span style={S.inspectorDuration}>{msg.duration.toFixed(2)}ms</span>
        )}
      </div>

      {/* Tabs */}
      <div style={S.inspectorTabs}>
        <button
          style={{ ...S.inspectorTab, ...(tab === 'payload' ? S.inspectorTabActive : {}) }}
          onClick={() => setTab('payload')}
        >
          {isReq ? 'Payload' : 'Data'}
        </button>
        <button
          style={{ ...S.inspectorTab, ...(tab === 'raw' ? S.inspectorTabActive : {}) }}
          onClick={() => setTab('raw')}
        >
          Raw
        </button>
      </div>

      {/* Content */}
      <pre style={S.codeBlock}>
        {tab === 'payload'
          ? JSON.stringify(
              isReq
                ? 'payload' in msg.message
                  ? msg.message.payload
                  : null
                : 'data' in msg.message
                  ? msg.message.data
                  : 'error' in msg.message
                    ? msg.message.error
                    : null,
              null,
              2
            )
          : JSON.stringify(msg, null, 2)}
      </pre>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <span style={S.stat}>
      <span style={S.statLabel}>{label}</span>
      <span style={{ ...S.statValue, color: color ?? '#e2e8f0' }}>{value}</span>
    </span>
  );
}

// ---------- Helpers ----------

function statusColor(status: MessageStatus): string {
  switch (status) {
    case MessageStatus.SUCCESS:
      return '#22c55e';
    case MessageStatus.ERROR:
      return '#ef4444';
    case MessageStatus.TIMEOUT:
      return '#f97316';
    case MessageStatus.PENDING:
      return '#3b82f6';
    default:
      return '#64748b';
  }
}

function directionIcon(direction: MessageDirection): string {
  switch (direction) {
    case MessageDirection.REQUEST:
      return '\u2192';
    case MessageDirection.RESPONSE:
      return '\u2190';
    case MessageDirection.EVENT:
      return '\u2605';
    default:
      return '\u2022';
  }
}

// ---------- Styles (dark theme, inline) ----------

const S: Record<string, React.CSSProperties> = {
  // Toggle button
  toggleBtn: {
    position: 'fixed',
    bottom: 16,
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'transform 0.15s',
  },
  logo: {
    fontFamily: 'monospace',
    fontWeight: 700,
    color: '#3b82f6',
  },
  badge: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: 10,
    marginLeft: 2,
  },

  // Panel
  panel: {
    position: 'fixed',
    bottom: 0,
    width: '100%',
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 13,
    borderTop: '2px solid #3b82f6',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
  },

  // Toolbar
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
    flexShrink: 0,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  toolbarTitle: {
    fontWeight: 600,
    fontSize: 13,
    color: '#3b82f6',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  statsRow: {
    display: 'flex',
    gap: 12,
  },
  stat: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  iconBtn: {
    padding: '4px 10px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
  },
  closeBtn: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    marginLeft: 4,
  },

  // Filter bar
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 12px',
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #1e293b',
    flexShrink: 0,
  },
  filterBtn: {
    padding: '3px 10px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
    textTransform: 'capitalize',
  },
  filterBtnActive: {
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    borderColor: '#334155',
  },
  searchInput: {
    marginLeft: 'auto',
    padding: '3px 8px',
    width: 180,
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: 4,
    fontSize: 12,
    outline: 'none',
  },

  // Body
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },

  // Timeline (left pane)
  timeline: {
    flex: 1,
    overflowY: 'auto',
    borderRight: '1px solid #1e293b',
  },

  // Inspector (right pane)
  inspector: {
    width: '40%',
    overflowY: 'auto',
  },

  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#475569',
    fontSize: 13,
  },

  // Message row
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderLeft: '3px solid transparent',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
    borderBottom: '1px solid #1e293b',
  },
  rowIcon: {
    fontSize: 14,
    fontWeight: 700,
    width: 16,
    textAlign: 'center',
    flexShrink: 0,
  },
  rowAction: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowDuration: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  rowTime: {
    fontSize: 11,
    color: '#475569',
    flexShrink: 0,
  },

  // Inspector inner
  inspectorInner: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  inspectorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid #1e293b',
    flexShrink: 0,
  },
  inspectorBadge: {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
    textTransform: 'uppercase',
  },
  inspectorAction: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 500,
  },
  inspectorDuration: {
    marginLeft: 'auto',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#64748b',
  },
  inspectorTabs: {
    display: 'flex',
    borderBottom: '1px solid #1e293b',
    flexShrink: 0,
  },
  inspectorTab: {
    padding: '6px 16px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    borderWidth: 0,
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    fontSize: 12,
    cursor: 'pointer',
  },
  inspectorTabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  codeBlock: {
    flex: 1,
    margin: 0,
    padding: 12,
    backgroundColor: '#020617',
    color: '#a5f3fc',
    fontSize: 12,
    fontFamily: 'monospace',
    overflow: 'auto',
    lineHeight: 1.5,
  },
};
