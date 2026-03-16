# DevTools Standalone Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the floating DevTools panel with a standalone dashboard that opens in a separate browser window, connected via pluggable transport (BroadcastChannel for web, WebSocket for RN).

**Architecture:** The DevToolsMiddleware gains an optional transport field to relay messages. Web users get a `<TsBridgeDevtools>` component that renders only a small floating button (dev-only) and opens a full dashboard via `window.open()` + blob URL. RN users connect headlessly over WebSocket to a CLI-served dashboard.

**Tech Stack:** React, TypeScript, BroadcastChannel API, WebSocket (`ws`), tsup, vitest

---

## Chunk 1: Transport Layer

### Task 1: Transport Interface

**Files:**
- Create: `packages/devtools/src/transport/DevToolsTransport.ts`

- [ ] **Step 1: Create transport types file**

```ts
// packages/devtools/src/transport/DevToolsTransport.ts
import type { RecordedMessage, PerformanceMetrics } from '../types/index';

export type TransportMessage =
  | { type: 'record'; record: RecordedMessage }
  | { type: 'clear' }
  | { type: 'metrics'; metrics: PerformanceMetrics };

export interface DevToolsTransport {
  send(data: TransportMessage): void;
  onMessage(handler: (data: TransportMessage) => void): void;
  onDisconnect(handler: () => void): void;
  readonly connected: boolean;
  disconnect(): void;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/devtools/src/transport/DevToolsTransport.ts
git commit -m "feat(devtools): add transport interface"
```

---

### Task 2: BroadcastChannel Transport

**Files:**
- Create: `packages/devtools/src/transport/BroadcastChannelTransport.ts`
- Create: `packages/devtools/src/transport/__tests__/BroadcastChannelTransport.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/devtools/src/transport/__tests__/BroadcastChannelTransport.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BroadcastChannelTransport } from '../BroadcastChannelTransport';

// vitest runs in jsdom which has no BroadcastChannel — mock it
class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }
  postMessage(data: unknown) {
    // Deliver to other instances with same name
    for (const ch of MockBroadcastChannel.instances) {
      if (ch !== this && ch.name === this.name && ch.onmessage) {
        ch.onmessage({ data });
      }
    }
  }
  close() {
    const idx = MockBroadcastChannel.instances.indexOf(this);
    if (idx >= 0) MockBroadcastChannel.instances.splice(idx, 1);
  }
}

beforeEach(() => {
  MockBroadcastChannel.instances = [];
  vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
});

describe('BroadcastChannelTransport', () => {
  it('sends and receives messages between two transports', () => {
    const sender = new BroadcastChannelTransport();
    const receiver = new BroadcastChannelTransport();
    const handler = vi.fn();
    receiver.onMessage(handler);

    sender.send({ type: 'clear' });

    expect(handler).toHaveBeenCalledWith({ type: 'clear' });
  });

  it('connected is always true', () => {
    const t = new BroadcastChannelTransport();
    expect(t.connected).toBe(true);
  });

  it('stops receiving after disconnect', () => {
    const sender = new BroadcastChannelTransport();
    const receiver = new BroadcastChannelTransport();
    const handler = vi.fn();
    receiver.onMessage(handler);
    receiver.disconnect();

    sender.send({ type: 'clear' });
    expect(handler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/devtools && pnpm test -- --reporter=verbose transport`
Expected: FAIL — module not found

- [ ] **Step 3: Implement BroadcastChannelTransport**

```ts
// packages/devtools/src/transport/BroadcastChannelTransport.ts
import type { DevToolsTransport, TransportMessage } from './DevToolsTransport';

const CHANNEL_NAME = '__ts-bridge-devtools__';

export class BroadcastChannelTransport implements DevToolsTransport {
  private channel: BroadcastChannel;
  private handlers: Array<(data: TransportMessage) => void> = [];
  private disconnectHandlers: Array<() => void> = [];

  constructor(channelName: string = CHANNEL_NAME) {
    this.channel = new BroadcastChannel(channelName);
    this.channel.onmessage = (event: MessageEvent) => {
      for (const h of this.handlers) {
        h(event.data as TransportMessage);
      }
    };
  }

  send(data: TransportMessage): void {
    this.channel.postMessage(data);
  }

  onMessage(handler: (data: TransportMessage) => void): void {
    this.handlers.push(handler);
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  get connected(): boolean {
    return true;
  }

  disconnect(): void {
    this.channel.close();
    this.handlers = [];
    for (const h of this.disconnectHandlers) h();
    this.disconnectHandlers = [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/devtools && pnpm test -- --reporter=verbose transport`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/devtools/src/transport/BroadcastChannelTransport.ts packages/devtools/src/transport/__tests__/BroadcastChannelTransport.test.ts
git commit -m "feat(devtools): add BroadcastChannelTransport"
```

---

### Task 3: WebSocket Transport

**Files:**
- Create: `packages/devtools/src/transport/WebSocketTransport.ts`
- Create: `packages/devtools/src/transport/__tests__/WebSocketTransport.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/devtools/src/transport/__tests__/WebSocketTransport.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketTransport } from '../WebSocketTransport';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
    // Simulate async open
    setTimeout(() => this.onopen?.(), 0);
  }
  send(data: string) { this.sent.push(data); }
  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

beforeEach(() => {
  vi.stubGlobal('WebSocket', MockWebSocket);
});

describe('WebSocketTransport', () => {
  it('sends serialized messages', () => {
    const t = new WebSocketTransport({ port: 4000 });
    t.send({ type: 'clear' });

    const ws = (t as any).ws as MockWebSocket;
    expect(ws.sent).toContain(JSON.stringify({ type: 'clear' }));
  });

  it('receives and deserializes messages', () => {
    const t = new WebSocketTransport({ port: 4000 });
    const handler = vi.fn();
    t.onMessage(handler);

    const ws = (t as any).ws as MockWebSocket;
    ws.onmessage?.({ data: JSON.stringify({ type: 'clear' }) });

    expect(handler).toHaveBeenCalledWith({ type: 'clear' });
  });

  it('fires onDisconnect when socket closes', () => {
    const t = new WebSocketTransport({ port: 4000 });
    const handler = vi.fn();
    t.onDisconnect(handler);

    const ws = (t as any).ws as MockWebSocket;
    ws.close();

    expect(handler).toHaveBeenCalled();
  });

  it('connected reflects ws readyState', () => {
    const t = new WebSocketTransport({ port: 4000 });
    expect(t.connected).toBe(true);

    const ws = (t as any).ws as MockWebSocket;
    ws.readyState = MockWebSocket.CLOSED;
    expect(t.connected).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/devtools && pnpm test -- --reporter=verbose WebSocketTransport`
Expected: FAIL — module not found

- [ ] **Step 3: Implement WebSocketTransport**

```ts
// packages/devtools/src/transport/WebSocketTransport.ts
import type { DevToolsTransport, TransportMessage } from './DevToolsTransport';

export interface WebSocketTransportConfig {
  host?: string;
  port?: number;
}

export class WebSocketTransport implements DevToolsTransport {
  private ws: WebSocket;
  private handlers: Array<(data: TransportMessage) => void> = [];
  private disconnectHandlers: Array<() => void> = [];

  constructor(config: WebSocketTransportConfig = {}) {
    const host = config.host ?? 'localhost';
    const port = config.port ?? 4000;
    this.ws = new WebSocket(`ws://${host}:${port}`);

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as TransportMessage;
        for (const h of this.handlers) h(data);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      for (const h of this.disconnectHandlers) h();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  send(data: TransportMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler: (data: TransportMessage) => void): void {
    this.handlers.push(handler);
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.push(handler);
  }

  get connected(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    this.ws.close();
    this.handlers = [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/devtools && pnpm test -- --reporter=verbose WebSocketTransport`
Expected: PASS

- [ ] **Step 5: Create transport barrel export**

```ts
// packages/devtools/src/transport/index.ts
export type { DevToolsTransport, TransportMessage } from './DevToolsTransport';
export { BroadcastChannelTransport } from './BroadcastChannelTransport';
export { WebSocketTransport } from './WebSocketTransport';
export type { WebSocketTransportConfig } from './WebSocketTransport';
```

- [ ] **Step 6: Commit**

```bash
git add packages/devtools/src/transport/
git commit -m "feat(devtools): add WebSocketTransport + transport barrel"
```

---

### Task 4: Wire Transport into DevToolsMiddleware

**Files:**
- Modify: `packages/devtools/src/types/index.ts` (add `transport` to `DevToolsConfig`)
- Modify: `packages/devtools/src/middleware/DevToolsMiddleware.ts` (send over transport)
- Modify: `packages/devtools/src/middleware/DevToolsMiddleware.test.ts` (add transport test)

- [ ] **Step 1: Add transport field to DevToolsConfig**

In `packages/devtools/src/types/index.ts`, add to `DevToolsConfig`:

```ts
import type { DevToolsTransport } from '../transport/DevToolsTransport';

// Inside DevToolsConfig interface, add:
  /**
   * Transport for sending recorded messages to external dashboard
   */
  transport?: DevToolsTransport;
```

- [ ] **Step 2: Write failing test**

Add to `packages/devtools/src/middleware/DevToolsMiddleware.test.ts`:

```ts
it('sends records over transport when provided', async () => {
  const sent: any[] = [];
  const mockTransport = {
    send: (data: any) => sent.push(data),
    onMessage: () => {},
    onDisconnect: () => {},
    connected: true,
    disconnect: () => {},
  };

  const mw = new DevToolsMiddleware({ transport: mockTransport });
  const ctx = createMockContext('test.action');
  const next = vi.fn().mockResolvedValue(undefined);

  await mw.fn(ctx, next);

  // Should have sent pending + final
  expect(sent.length).toBe(2);
  expect(sent[0].type).toBe('record');
  expect(sent[0].record.status).toBe('pending');
  expect(sent[1].type).toBe('record');
  expect(sent[1].record.status).toMatch(/success|error/);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/devtools && pnpm test -- --reporter=verbose DevToolsMiddleware`
Expected: FAIL — transport not used

- [ ] **Step 4: Add transport relay to DevToolsMiddleware**

In `packages/devtools/src/middleware/DevToolsMiddleware.ts`:

1. Change the stored config type from `Required<DevToolsConfig>` to handle optional `transport`:

```ts
private config: Omit<Required<DevToolsConfig>, 'transport'> & { transport?: DevToolsTransport };
```

2. In the constructor, keep `transport` as-is (don't default it):

```ts
this.config = {
  enabled: config.enabled ?? true,
  maxRecords: config.maxRecords ?? 1000,
  trackPerformance: config.trackPerformance ?? true,
  captureStackTraces: config.captureStackTraces ?? true,
  filter: config.filter ?? (() => true),
  onMessage: config.onMessage ?? (() => {}),
  transport: config.transport,
};
```

3. In `createFn`, after each `this.config.onMessage(record)` call, add:

```ts
this.config.transport?.send({ type: 'record', record: { ...record } });
```

Add this in both places (after pending creation and after final update).

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/devtools && pnpm test -- --reporter=verbose DevToolsMiddleware`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/devtools/src/types/index.ts packages/devtools/src/middleware/DevToolsMiddleware.ts packages/devtools/src/middleware/DevToolsMiddleware.test.ts
git commit -m "feat(devtools): wire transport into DevToolsMiddleware"
```

---

### Task 5: Update package.json exports + tsup config

**Files:**
- Modify: `packages/devtools/package.json`
- Modify: `packages/devtools/tsup.config.ts`

- [ ] **Step 1: Add sub-path export for transport**

In `packages/devtools/package.json`, add to `exports`:

```json
"./transport": {
  "source": "./src/transport/index.ts",
  "types": "./dist/transport/index.d.ts",
  "import": "./dist/transport/index.js",
  "require": "./dist/transport/index.cjs"
}
```

- [ ] **Step 2: Add transport entry to tsup config**

In `packages/devtools/tsup.config.ts`, change entry to:

```ts
entry: ['src/index.ts', 'src/transport/index.ts'],
```

- [ ] **Step 3: Verify build**

Run: `cd packages/devtools && pnpm build`
Expected: `dist/transport/index.js` and `dist/transport/index.d.ts` are generated

- [ ] **Step 4: Commit**

```bash
git add packages/devtools/package.json packages/devtools/tsup.config.ts
git commit -m "feat(devtools): add transport sub-path export"
```

---

## Chunk 2: Dashboard UI + Rewrite TsBridgeDevtools

### Task 6: Extract WaterfallView from old panel

**Files:**
- Create: `packages/devtools/src/dashboard/WaterfallView.tsx`

The `WaterfallView`, `TraceDetail`, and helpers from old `TsBridgeDevtools.tsx` (lines 386-532, styles at 907-1062) get extracted into a standalone component. Use the same dark theme inline styles.

- [ ] **Step 1: Create WaterfallView.tsx**

Extract `WaterfallView` and `TraceDetail` functions from `panel/TsBridgeDevtools.tsx` lines 386-532 into `dashboard/WaterfallView.tsx`. Include the relevant styles (waterfallContainer, waterfallHeader, waterfallRow, waterfallLayerBadge, waterfallName, waterfallBar, waterfallMs, waterfallShortCircuit, expandArrow, mwErrorBadge, traceDetail, traceSection, traceSectionTitle, traceError, traceStack, traceLog, traceMetadata, traceEmpty) from lines 907-1062.

Export the component:
```ts
export interface WaterfallViewProps {
  traces: MiddlewareTrace[];
  handlerMs?: number;
  handlerSkipped?: boolean;
  totalMs?: number;
}
export function WaterfallView(props: WaterfallViewProps): JSX.Element
```

- [ ] **Step 2: Commit**

```bash
git add packages/devtools/src/dashboard/WaterfallView.tsx
git commit -m "refactor(devtools): extract WaterfallView component"
```

---

### Task 7: Create Dashboard component

**Files:**
- Create: `packages/devtools/src/dashboard/Dashboard.tsx`
- Create: `packages/devtools/src/dashboard/index.ts`

The Dashboard is the full-screen UI that runs inside the separate window. It receives messages via transport and renders the toolbar, filter bar, timeline, inspector with waterfall.

- [ ] **Step 1: Create Dashboard.tsx**

Based on the mockup HTML (`/tmp/devtools-mockup.html`), implement a React component with:
- `BroadcastChannelTransport` receiver that accumulates `RecordedMessage[]` in state
- Toolbar: title, connection dot, stats (total, success%, errors, avg ms), clear, export buttons
- Filter bar: status buttons (all/success/error/pending), plugin buttons, search input
- Body: left timeline (message list) + right inspector (tabs: payload, response, waterfall, raw)
- Dark theme with inline styles matching the mockup

Props:
```ts
export interface DashboardProps {
  transport: DevToolsTransport;
}
```

Use the extracted `WaterfallView` for the waterfall tab. Inline the Inspector sub-component (payload/response/raw tabs are simple JSON renders).

- [ ] **Step 2: Create barrel export**

```ts
// packages/devtools/src/dashboard/index.ts
export { Dashboard } from './Dashboard';
export type { DashboardProps } from './Dashboard';
export { WaterfallView } from './WaterfallView';
export type { WaterfallViewProps } from './WaterfallView';
```

- [ ] **Step 3: Verify build compiles**

Run: `cd packages/devtools && pnpm build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/devtools/src/dashboard/
git commit -m "feat(devtools): add Dashboard component"
```

---

### Task 8: Rewrite TsBridgeDevtools

**Files:**
- Rewrite: `packages/devtools/src/panel/TsBridgeDevtools.tsx`
- Rewrite: `packages/devtools/src/panel/TsBridgeDevtools.test.tsx`

Replace the 1,062-line floating panel with a small component (~100 lines) that:
1. Returns `null` if `process.env.NODE_ENV === 'production'`
2. Registers DevToolsMiddleware with BroadcastChannelTransport on mount
3. Renders a small floating button
4. Opens dashboard in a new window via blob URL on click
5. Hides button when dashboard window is open
6. Shows button again when dashboard window closes

- [ ] **Step 1: Write failing tests**

Rewrite `packages/devtools/src/panel/TsBridgeDevtools.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TsBridgeDevtools } from './TsBridgeDevtools';

function createMockBridge() {
  return { use: vi.fn(), prepend: vi.fn() };
}

// Mock window.open
let mockChildWindow: { closed: boolean; close: () => void };

beforeEach(() => {
  mockChildWindow = { closed: false, close: () => { mockChildWindow.closed = true; } };
  vi.stubGlobal('open', vi.fn(() => mockChildWindow));
  // Stub BroadcastChannel
  vi.stubGlobal('BroadcastChannel', class {
    onmessage = null;
    postMessage() {}
    close() {}
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TsBridgeDevtools', () => {
  it('renders floating button in dev mode', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} />);
    expect(screen.getByTitle('Open ts-bridge DevTools')).toBeDefined();
  });

  it('registers middleware on mount', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} />);
    expect(bridge.prepend).toHaveBeenCalledTimes(1);
  });

  it('opens a new window on button click', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} />);
    fireEvent.click(screen.getByTitle('Open ts-bridge DevTools'));
    expect(window.open).toHaveBeenCalled();
  });

  it('hides button after opening dashboard', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} />);
    fireEvent.click(screen.getByTitle('Open ts-bridge DevTools'));
    expect(screen.queryByTitle('Open ts-bridge DevTools')).toBeNull();
  });

  it('falls back to bridge.use when prepend is not available', () => {
    const bridge = { use: vi.fn() }; // no prepend
    render(<TsBridgeDevtools bridge={bridge} />);
    expect(bridge.use).toHaveBeenCalledTimes(1);
  });

  it('shows button again when child window closes', () => {
    vi.useFakeTimers();
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} />);
    fireEvent.click(screen.getByTitle('Open ts-bridge DevTools'));

    // Simulate window close
    mockChildWindow.closed = true;
    act(() => { vi.advanceTimersByTime(1500); });

    expect(screen.getByTitle('Open ts-bridge DevTools')).toBeDefined();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/devtools && pnpm test -- --reporter=verbose TsBridgeDevtools`
Expected: FAIL — old component doesn't match new behavior

- [ ] **Step 3: Rewrite TsBridgeDevtools.tsx**

Replace the entire file with the new implementation (~100 lines):

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DevToolsMiddleware } from '../middleware/DevToolsMiddleware';
import { BroadcastChannelTransport } from '../transport/BroadcastChannelTransport';

export interface TsBridgeDevtoolsProps {
  bridge: { use(middleware: any): void; prepend?(middleware: any): void };
}

export function TsBridgeDevtools({ bridge }: TsBridgeDevtoolsProps) {
  if (process.env.NODE_ENV === 'production') return null;

  const [dashboardOpen, setDashboardOpen] = useState(false);
  const childWindowRef = useRef<Window | null>(null);
  const transportRef = useRef<BroadcastChannelTransport | null>(null);

  // Register middleware + transport on mount
  useEffect(() => {
    const transport = new BroadcastChannelTransport();
    transportRef.current = transport;
    const mw = new DevToolsMiddleware({ transport });

    if (bridge.prepend) {
      bridge.prepend(mw);
    } else {
      bridge.use(mw);
    }

    return () => {
      mw.setEnabled(false);
      transport.disconnect();
    };
  }, [bridge]);

  // Poll child window closed state
  useEffect(() => {
    if (!dashboardOpen) return;
    const interval = setInterval(() => {
      if (childWindowRef.current?.closed) {
        setDashboardOpen(false);
        childWindowRef.current = null;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [dashboardOpen]);

  const openDashboard = useCallback(() => {
    // Build dashboard HTML
    const html = buildDashboardHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const child = window.open(url, 'ts-bridge-devtools', 'width=1200,height=700');
    URL.revokeObjectURL(url);

    if (child) {
      childWindowRef.current = child;
      setDashboardOpen(true);
    }
  }, []);

  if (dashboardOpen) return null;

  return (
    <button
      onClick={openDashboard}
      title="Open ts-bridge DevTools"
      style={buttonStyle}
    >
      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#3b82f6' }}>{'{ }'}</span>
      {' '}ts-bridge
    </button>
  );
}

const buttonStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 16,
  left: 16,
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
};

function buildDashboardHtml(): string {
  // The dashboard HTML is a self-contained page that:
  // 1. Creates a BroadcastChannelTransport to receive messages
  // 2. Renders the dashboard UI
  // For now, a minimal HTML that connects via BroadcastChannel
  // and renders incoming messages. Full React dashboard will be
  // injected as an inline bundle.
  return `<!DOCTYPE html>
<html>
<head>
  <title>ts-bridge DevTools</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // BroadcastChannel receiver — Dashboard rendered by parent injection
    const channel = new BroadcastChannel('__ts-bridge-devtools__');
    const messages = [];
    channel.onmessage = (e) => {
      messages.push(e.data);
      render();
    };
    function render() {
      // Minimal rendering — full React dashboard will replace this
      document.getElementById('root').innerHTML =
        '<div style="padding:16px"><h2 style="color:#3b82f6">ts-bridge DevTools</h2>' +
        '<p style="margin:8px 0;color:#64748b">' + messages.length + ' messages</p>' +
        messages.map(m => {
          if (m.type !== 'record') return '';
          const r = m.record;
          const color = r.status === 'success' ? '#22c55e' : r.status === 'error' ? '#ef4444' : '#3b82f6';
          return '<div style="padding:8px 12px;border-left:3px solid ' + color + ';margin:4px 0;background:#1e293b;border-radius:4px;font-size:13px">' +
            '<span style="color:' + color + '">' + r.status + '</span> ' +
            '<span style="font-family:monospace">' + r.action + '</span>' +
            (r.duration != null ? ' <span style="color:#64748b">' + r.duration.toFixed(0) + 'ms</span>' : '') +
            '</div>';
        }).join('') +
        '</div>';
    }
    render();
  </script>
</body>
</html>`;
}
```

Note: `buildDashboardHtml` starts with a minimal vanilla JS dashboard. A future task will replace this with the full React Dashboard component bundled inline. This is intentional — shipping the full React bundle inside a blob URL requires a bundler setup that we'll address separately.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/devtools && pnpm test -- --reporter=verbose TsBridgeDevtools`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/devtools/src/panel/TsBridgeDevtools.tsx packages/devtools/src/panel/TsBridgeDevtools.test.tsx
git commit -m "feat(devtools): rewrite TsBridgeDevtools as standalone launcher"
```

---

### Task 9: Update index.ts exports

**Files:**
- Modify: `packages/devtools/src/index.ts`

- [ ] **Step 1: Update exports**

Replace the file to export transport types and remove old visualizer exports:

```ts
// Types
export type {
  MiddlewareTrace,
  RecordedMessage,
  PerformanceMetrics,
  DevToolsConfig,
  DevToolsStore,
  MessageStatus,
} from './types/index';

// Transport
export type { DevToolsTransport, TransportMessage } from './transport/DevToolsTransport';
export { BroadcastChannelTransport } from './transport/BroadcastChannelTransport';
export { WebSocketTransport } from './transport/WebSocketTransport';
export type { WebSocketTransportConfig } from './transport/WebSocketTransport';

// Middleware
export { DevToolsMiddleware, createDevToolsMiddleware } from './middleware/DevToolsMiddleware';
export { createTimeTracker } from './middleware/TimeTracker';
export type { PerformanceEntry } from './middleware/TimeTracker';

// Logger
export { createStructuredLogger, LogLevel } from './logger/StructuredLogger';
export type { LogEntry, LoggerConfig } from './logger/StructuredLogger';

// Panel
export { TsBridgeDevtools } from './panel/TsBridgeDevtools';
export type { TsBridgeDevtoolsProps } from './panel/TsBridgeDevtools';

// Dashboard (for advanced use / CLI server)
export { Dashboard } from './dashboard/index';
export type { DashboardProps } from './dashboard/index';
export { WaterfallView } from './dashboard/index';
export type { WaterfallViewProps } from './dashboard/index';
```

- [ ] **Step 2: Verify build**

Run: `cd packages/devtools && pnpm build`
Expected: No errors, dist/ contains all exports

- [ ] **Step 3: Run all tests**

Run: `cd packages/devtools && pnpm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/devtools/src/index.ts
git commit -m "refactor(devtools): update public exports for standalone dashboard"
```

---

## Chunk 3: Update Examples + Remove Old Visualizers

### Task 10: Update React example

**Files:**
- Modify: `examples/react/src/App.tsx`

- [ ] **Step 1: Simplify TsBridgeDevtools usage**

Remove old props from `<TsBridgeDevtools>`:

```tsx
// Before:
<TsBridgeDevtools bridge={bridge} />

// After (same — no props changed in the React example, but verify it works):
<TsBridgeDevtools bridge={bridge} />
```

The React example already uses the minimal API. Just verify it compiles.

- [ ] **Step 2: Verify build**

Run: `cd examples/react && pnpm build`
Expected: No errors

- [ ] **Step 3: Commit (if changes were needed)**

```bash
git add examples/react/
git commit -m "chore(examples): update react example for new devtools"
```

---

### Task 11: Remove old standalone visualizers

**Files:**
- Delete: `packages/devtools/src/visualizer/MessageTimeline.tsx`
- Delete: `packages/devtools/src/visualizer/RequestInspector.tsx`

The old standalone visualizers (light theme, separate API) are no longer exported. The Dashboard has its own integrated timeline and inspector.

- [ ] **Step 1: Remove files and update index.ts**

Remove the `MessageTimeline` and `RequestInspector` exports from `index.ts` if still present. Delete the visualizer directory.

- [ ] **Step 2: Run all devtools tests**

Run: `cd packages/devtools && pnpm test`
Expected: All pass (no tests import the old visualizers)

- [ ] **Step 3: Verify build**

Run: `cd packages/devtools && pnpm build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add -A packages/devtools/src/visualizer/ packages/devtools/src/index.ts
git commit -m "refactor(devtools): remove old standalone visualizers"
```

---

### Task 12: Full integration verification

- [ ] **Step 1: Run all monorepo tests**

Run: `pnpm -r test`
Expected: All packages pass

- [ ] **Step 2: Run monorepo build**

Run: `pnpm -r build`
Expected: All packages build successfully

- [ ] **Step 3: Type check**

Run: `pnpm -r type-check`
Expected: No type errors

---

## Deferred (separate PR)

The following are part of the spec but scoped out of this plan to keep it focused:

- **CLI Server (`server/index.ts`)** — HTTP + WebSocket server for RN usage (`npx @webview-ts/devtools`). Requires `ws` dependency, bin entry in package.json, and pre-bundled dashboard HTML. This is a separate deliverable.
- **WebSocket auto-reconnect** — Exponential backoff reconnection for `WebSocketTransport`. Will be added when the CLI server is implemented.
- **Full React Dashboard in blob URL** — Currently `buildDashboardHtml()` uses vanilla JS. Replacing it with the full React `Dashboard` component requires bundling React into the blob HTML, which needs a build pipeline change (e.g., tsup `--no-external react` for a separate dashboard entry). This will be done alongside or after the CLI server.
