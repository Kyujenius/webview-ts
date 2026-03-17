import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecordedMessage } from '../types';
import './app.css';

type Filter = 'all' | 'success' | 'error' | 'pending';
type InspectorTab = 'payload' | 'response' | 'raw';

function statusColor(s: string) {
  return s === 'success'
    ? '#22c55e'
    : s === 'error'
      ? '#ef4444'
      : s === 'pending'
        ? '#3b82f6'
        : s === 'timeout'
          ? '#f97316'
          : '#64748b';
}

function statusIcon(s: string) {
  return s === 'success'
    ? '\u2713'
    : s === 'error'
      ? '\u2717'
      : s === 'pending'
        ? '\u25CB'
        : s === 'timeout'
          ? '\u23F1'
          : '\u2022';
}

export function App() {
  const [records, setRecords] = useState<Map<string, RecordedMessage>>(new Map());
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState<InspectorTab>('response');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let timer: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(`ws://${window.location.host}?role=dashboard`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        timer = setTimeout(connect, 1000);
      };

      ws.onmessage = (e) => {
        let msg: { type: string; record?: RecordedMessage; appConnected?: boolean };
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }

        if (msg.type === 'status') {
          setConnected(msg.appConnected ?? false);
        } else if (msg.type === 'record' && msg.record) {
          setConnected(true);
          setRecords((prev) => {
            const next = new Map(prev);
            next.set(msg.record!.recordId, msg.record!);
            return next;
          });
        } else if (msg.type === 'clear') {
          setRecords(new Map());
          setSelectedId(null);
        }
      };
    }

    connect();
    return () => {
      clearTimeout(timer);
      ws?.close();
    };
  }, []);

  const clearAll = useCallback(() => {
    setRecords(new Map());
    setSelectedId(null);
  }, []);

  const filtered = (() => {
    let arr = Array.from(records.values());
    if (filter !== 'all') arr = arr.filter((m) => m.status === filter);
    if (search) arr = arr.filter((m) => m.action.toLowerCase().includes(search.toLowerCase()));
    return arr.reverse();
  })();

  const selected = selectedId ? (records.get(selectedId) ?? null) : null;

  // Stats
  const all = Array.from(records.values());
  const total = all.length;
  const errs = all.filter((m) => m.status === 'error').length;
  const successes = all.filter((m) => m.status === 'success').length;
  const rate = total ? Math.round((successes / total) * 100) : 0;
  const durations = all.filter((m) => m.duration != null).map((m) => m.duration!);
  const avg = durations.length
    ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
    : '-';

  const tabContent = (() => {
    if (!selected) return '';
    if (tab === 'payload') return JSON.stringify(selected.payload ?? null, null, 2);
    if (tab === 'response')
      return JSON.stringify(
        selected.error ? { error: selected.error } : (selected.responseData ?? null),
        null,
        2
      );
    return JSON.stringify(selected, null, 2);
  })();

  return (
    <>
      {/* Toolbar */}
      <div id="toolbar">
        <h1>ts-bridge DevTools</h1>
        <div id="stats">
          <span>
            Total: <span className="stat-val">{total}</span>
          </span>
          <span>
            OK:{' '}
            <span className="stat-val" style={{ color: '#22c55e' }}>
              {rate}%
            </span>
          </span>
          <span>
            Err:{' '}
            <span className="stat-val" style={{ color: '#ef4444' }}>
              {errs}
            </span>
          </span>
          <span>
            Avg: <span className="stat-val">{avg}ms</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span id="conn" className={connected ? 'on' : 'off'}>
            {connected ? 'connected' : 'disconnected'}
          </span>
          <button onClick={clearAll}>Clear</button>
        </div>
      </div>

      {/* Filter bar */}
      <div id="filter-bar">
        {(['all', 'success', 'error', 'pending'] as const).map((f) => (
          <button
            key={f}
            className={`filter-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? `All (${records.size})` : f}
          </button>
        ))}
        <input
          id="search"
          type="text"
          placeholder="Filter actions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Body */}
      <div id="body">
        {/* Timeline */}
        <div id="timeline">
          {filtered.length === 0 ? (
            <div className="empty">
              {records.size ? 'No messages match filter' : 'Waiting for bridge messages...'}
            </div>
          ) : (
            filtered.map((m) => {
              const color = statusColor(m.status);
              return (
                <div
                  key={m.recordId}
                  className={`msg-row${selectedId === m.recordId ? ' selected' : ''}`}
                  style={{ borderLeftColor: color }}
                  onClick={() => {
                    setSelectedId(m.recordId);
                    setTab('response');
                  }}
                >
                  <span className="msg-icon" style={{ color }}>
                    {statusIcon(m.status)}
                  </span>
                  <span className="msg-action">{m.action}</span>
                  {m.duration != null && <span className="msg-dur">{m.duration.toFixed(0)}ms</span>}
                  <span className="msg-time">
                    {new Date(m.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Inspector */}
        <div id="inspector">
          {!selected ? (
            <div className="empty">Select a message to inspect</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="badge" style={{ background: statusColor(selected.status) }}>
                  {selected.status}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{selected.action}</span>
                {selected.duration != null && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: '#64748b',
                    }}
                  >
                    {selected.duration.toFixed(2)}ms
                  </span>
                )}
              </div>
              <div className="tab-bar">
                {(['response', 'payload', 'raw'] as const).map((t) => (
                  <button
                    key={t}
                    className={`tab${tab === t ? ' active' : ''}`}
                    onClick={() => setTab(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <pre className="code">{tabContent}</pre>
            </>
          )}
        </div>
      </div>
    </>
  );
}
