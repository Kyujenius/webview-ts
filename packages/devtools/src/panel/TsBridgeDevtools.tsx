/**
 * TsBridgeDevtools — Small floating button that opens a standalone
 * dashboard in a new browser window.
 *
 * Usage:
 *   import { TsBridgeDevtools } from '@webview-ts/devtools';
 *   <TsBridgeDevtools bridge={bridge} />
 *
 * The button is only rendered when process.env.NODE_ENV !== 'production'.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DevToolsMiddleware } from '../middleware/DevToolsMiddleware';
import { BroadcastChannelTransport } from '../transport/BroadcastChannelTransport';
import type { DevToolsTransport } from '../transport/DevToolsTransport';

declare const process: { env: { NODE_ENV?: string } };

export interface TsBridgeDevtoolsProps {
  /** BridgeManager instance */
  bridge: { use(middleware: unknown): void; prepend?(middleware: unknown): void };
  /** Button position */
  position?: 'bottom-left' | 'bottom-right';
  /** Toggle button label */
  buttonLabel?: string;
  /** Custom transport (defaults to BroadcastChannelTransport) */
  transport?: DevToolsTransport;
}

export function TsBridgeDevtools({
  bridge,
  position = 'bottom-left',
  buttonLabel = 'ts-bridge',
  transport: customTransport,
}: TsBridgeDevtoolsProps) {
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const transportRef = useRef<DevToolsTransport | null>(null);
  const windowRef = useRef<Window | null>(null);

  // Dev-only guard
  if (process.env.NODE_ENV === 'production') return null;

  // Attach middleware with transport
  useEffect(() => {
    const transport = customTransport ?? new BroadcastChannelTransport();
    transportRef.current = transport;

    const mw = new DevToolsMiddleware({
      transport,
      onMessage: () => {
        setMessageCount(mw.getStore().getMessages().length);
      },
    });

    if (bridge.prepend) {
      bridge.prepend(mw);
    } else {
      bridge.use(mw);
    }

    return () => {
      mw.setEnabled(false);
      transport.disconnect();
    };
  }, [bridge, customTransport]);

  // Poll for window close
  useEffect(() => {
    if (!dashboardOpen) return;
    const interval = setInterval(() => {
      if (windowRef.current?.closed) {
        setDashboardOpen(false);
        windowRef.current = null;
      }
    }, 500);
    return () => clearInterval(interval);
  }, [dashboardOpen]);

  const openDashboard = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.focus();
      return;
    }

    const html = buildDashboardHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, 'ts-bridge-devtools', 'width=1200,height=700');
    URL.revokeObjectURL(url);

    if (win) {
      windowRef.current = win;
      setDashboardOpen(true);
    }
  }, []);

  const isRight = position === 'bottom-right';

  return (
    <button
      onClick={openDashboard}
      style={{
        ...S.toggleBtn,
        [isRight ? 'right' : 'left']: 16,
        ...(dashboardOpen ? S.toggleBtnActive : {}),
      }}
      title={dashboardOpen ? 'Focus ts-bridge DevTools' : 'Open ts-bridge DevTools'}
    >
      <span style={S.logo}>{'{ }'}</span>
      <span>{buttonLabel}</span>
      {messageCount > 0 && <span style={S.badge}>{messageCount}</span>}
      {dashboardOpen && <span style={S.liveDot} />}
    </button>
  );
}

// ---------- Dashboard HTML builder ----------

function buildDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>ts-bridge DevTools</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #0f172a; color: #e2e8f0; font-size: 13px;
    display: flex; flex-direction: column; height: 100vh;
  }
  #toolbar { display:flex; align-items:center; justify-content:space-between;
    padding:8px 16px; background:#1e293b; border-bottom:1px solid #334155; }
  #toolbar h1 { font-size:14px; color:#3b82f6; font-weight:600; }
  #stats { display:flex; gap:16px; font-size:12px; color:#94a3b8; font-family:monospace; }
  .stat-val { color:#e2e8f0; font-weight:600; }
  #filter-bar { display:flex; align-items:center; gap:6px; padding:6px 16px;
    border-bottom:1px solid #1e293b; }
  .filter-btn { padding:3px 10px; background:transparent; color:#94a3b8;
    border:1px solid transparent; border-radius:4px; font-size:12px; cursor:pointer; }
  .filter-btn.active { background:#1e293b; color:#e2e8f0; border-color:#334155; }
  #search { margin-left:auto; padding:3px 8px; width:200px; background:#1e293b;
    color:#e2e8f0; border:1px solid #334155; border-radius:4px; font-size:12px; outline:none; }
  #body { display:flex; flex:1; overflow:hidden; }
  #timeline { flex:1; overflow-y:auto; border-right:1px solid #1e293b; }
  #inspector { width:40%; overflow-y:auto; padding:12px; }
  .msg-row { display:flex; align-items:center; gap:8px; padding:6px 12px;
    border-left:3px solid transparent; cursor:pointer; border-bottom:1px solid #1e293b; }
  .msg-row:hover { background:#1e293b; }
  .msg-row.selected { background:#1e293b; }
  .msg-icon { font-size:14px; font-weight:700; width:16px; text-align:center; flex-shrink:0; }
  .msg-action { flex:1; font-family:monospace; font-size:12px; overflow:hidden;
    text-overflow:ellipsis; white-space:nowrap; }
  .msg-dur { font-size:11px; color:#64748b; font-family:monospace; flex-shrink:0; }
  .msg-time { font-size:11px; color:#475569; flex-shrink:0; }
  .empty { display:flex; align-items:center; justify-content:center;
    height:100%; color:#475569; }
  pre.code { margin:0; padding:12px; background:#020617; color:#a5f3fc;
    font-size:12px; font-family:monospace; overflow:auto; line-height:1.5; border-radius:4px; }
  .badge { font-size:11px; font-weight:600; padding:2px 8px; border-radius:4px;
    color:#fff; text-transform:uppercase; }
  .tab-bar { display:flex; border-bottom:1px solid #1e293b; margin-bottom:8px; }
  .tab { padding:6px 16px; background:transparent; color:#94a3b8; border:none;
    border-bottom:2px solid transparent; font-size:12px; cursor:pointer; }
  .tab.active { color:#3b82f6; border-bottom-color:#3b82f6; }
  #toolbar button { padding:4px 10px; background:transparent; color:#94a3b8;
    border:1px solid #334155; border-radius:4px; font-size:12px; cursor:pointer; }
  .status-success { color:#22c55e; }
  .status-error { color:#ef4444; }
  .status-pending { color:#3b82f6; }
  .status-timeout { color:#f97316; }
</style>
</head>
<body>
  <div id="toolbar">
    <h1>ts-bridge DevTools</h1>
    <div id="stats"></div>
    <div><button onclick="clearAll()">Clear</button></div>
  </div>
  <div id="filter-bar">
    <button class="filter-btn active" data-filter="all" onclick="setFilter('all',this)">All (0)</button>
    <button class="filter-btn" data-filter="success" onclick="setFilter('success',this)">success</button>
    <button class="filter-btn" data-filter="error" onclick="setFilter('error',this)">error</button>
    <button class="filter-btn" data-filter="pending" onclick="setFilter('pending',this)">pending</button>
    <input id="search" type="text" placeholder="Filter actions..." oninput="renderTimeline()" />
  </div>
  <div id="body">
    <div id="timeline"><div class="empty">Waiting for bridge messages...</div></div>
    <div id="inspector"><div class="empty">Select a message to inspect</div></div>
  </div>
<script>
const records = new Map();
let currentFilter = 'all';
let selectedId = null;

const ch = new BroadcastChannel('__ts-bridge-devtools__');
ch.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'record') {
    records.set(msg.record.recordId, msg.record);
    renderTimeline();
    renderStats();
    if (selectedId === msg.record.recordId) renderInspector(msg.record);
  } else if (msg.type === 'clear') {
    records.clear();
    selectedId = null;
    renderTimeline();
    renderStats();
    document.getElementById('inspector').innerHTML = '<div class="empty">Select a message to inspect</div>';
  }
};

function getFiltered() {
  const search = document.getElementById('search').value.toLowerCase();
  let arr = Array.from(records.values());
  if (currentFilter !== 'all') arr = arr.filter(m => m.status === currentFilter);
  if (search) arr = arr.filter(m => m.action.toLowerCase().includes(search));
  return arr.reverse();
}

function renderTimeline() {
  const el = document.getElementById('timeline');
  const filtered = getFiltered();
  if (!filtered.length) {
    el.innerHTML = '<div class="empty">' + (records.size ? 'No messages match filter' : 'Waiting for bridge messages...') + '</div>';
    return;
  }
  el.innerHTML = filtered.map(m => {
    const color = statusColor(m.status);
    const icon = statusIcon(m.status);
    const time = new Date(m.timestamp).toLocaleTimeString('en-US', { hour12: false });
    const sel = selectedId === m.recordId ? ' selected' : '';
    return '<div class="msg-row' + sel + '" style="border-left-color:' + color + '" onclick="selectMsg(\\'' + m.recordId + '\\')">'
      + '<span class="msg-icon" style="color:' + color + '">' + icon + '</span>'
      + '<span class="msg-action">' + esc(m.action) + '</span>'
      + (m.duration != null ? '<span class="msg-dur">' + m.duration.toFixed(0) + 'ms</span>' : '')
      + '<span class="msg-time">' + time + '</span>'
      + '</div>';
  }).join('');
  // update all count
  document.querySelector('[data-filter="all"]').textContent = 'All (' + records.size + ')';
}

function renderStats() {
  const arr = Array.from(records.values());
  const total = arr.length;
  const errs = arr.filter(m => m.status === 'error').length;
  const successes = arr.filter(m => m.status === 'success').length;
  const rate = total ? Math.round(successes / total * 100) : 0;
  const durations = arr.filter(m => m.duration != null).map(m => m.duration);
  const avg = durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1) : '-';
  document.getElementById('stats').innerHTML =
    '<span>Total: <span class="stat-val">' + total + '</span></span>' +
    '<span>OK: <span class="stat-val" style="color:#22c55e">' + rate + '%</span></span>' +
    '<span>Err: <span class="stat-val" style="color:#ef4444">' + errs + '</span></span>' +
    '<span>Avg: <span class="stat-val">' + avg + 'ms</span></span>';
}

function selectMsg(id) {
  selectedId = id;
  renderTimeline();
  const rec = records.get(id);
  if (rec) renderInspector(rec);
}

function renderInspector(msg) {
  const el = document.getElementById('inspector');
  const color = statusColor(msg.status);
  let html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
    + '<span class="badge" style="background:' + color + '">' + msg.status + '</span>'
    + '<span style="font-family:monospace;font-size:13px">' + esc(msg.action) + '</span>'
    + (msg.duration != null ? '<span style="margin-left:auto;font-family:monospace;font-size:12px;color:#64748b">' + msg.duration.toFixed(2) + 'ms</span>' : '')
    + '</div>';
  html += '<div class="tab-bar">'
    + '<button class="tab active" onclick="switchTab(this,\\'payload\\')">Payload</button>'
    + '<button class="tab" onclick="switchTab(this,\\'response\\')">Response</button>'
    + '<button class="tab" onclick="switchTab(this,\\'raw\\')">Raw</button>'
    + '</div>';
  html += '<div id="tab-content"><pre class="code">' + esc(JSON.stringify(msg.payload ?? null, null, 2)) + '</pre></div>';
  el.innerHTML = html;
  el._msg = msg;
}

function switchTab(btn, tab) {
  btn.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const msg = document.getElementById('inspector')._msg;
  if (!msg) return;
  let content;
  if (tab === 'payload') content = JSON.stringify(msg.payload ?? null, null, 2);
  else if (tab === 'response') content = JSON.stringify(msg.error ? { error: msg.error } : (msg.responseData ?? null), null, 2);
  else content = JSON.stringify(msg, null, 2);
  document.getElementById('tab-content').innerHTML = '<pre class="code">' + esc(content) + '</pre>';
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTimeline();
}

function clearAll() {
  records.clear();
  selectedId = null;
  renderTimeline();
  renderStats();
  document.getElementById('inspector').innerHTML = '<div class="empty">Select a message to inspect</div>';
}

function statusColor(s) {
  return s === 'success' ? '#22c55e' : s === 'error' ? '#ef4444' : s === 'pending' ? '#3b82f6' : s === 'timeout' ? '#f97316' : '#64748b';
}
function statusIcon(s) {
  return s === 'success' ? '\\u2713' : s === 'error' ? '\\u2717' : s === 'pending' ? '\\u25CB' : s === 'timeout' ? '\\u23F1' : '\\u2022';
}
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
</script>
</body>
</html>`;
}

// ---------- Styles ----------

const S: Record<string, React.CSSProperties> = {
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
  toggleBtnActive: {
    borderColor: '#3b82f6',
    boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
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
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    marginLeft: 4,
  },
};
