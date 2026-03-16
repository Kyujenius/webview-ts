# DevTools Standalone Dashboard

## Problem

The current `TsBridgeDevtools` is a 1,062-line floating panel that overlays on top of the app. This causes two problems:

1. **Web**: The panel covers app UI and shrinks with the viewport
2. **Mobile (RN)**: A floating panel inside a WebView is unusable on small screens

## Solution

Replace the floating panel with a **separate-window dashboard**. A small floating button (visible only in `__DEV__`) opens a full dashboard in a new browser window.

## Architecture

```
[Main App Tab]                         [Separate Window]
┌────────────────────┐
│  App UI 100%       │                 ┌──────────────────────┐
│                    │  BroadcastCh.   │  Dashboard (full)    │
│  <TsBridgeDevtools │ ──────────────→ │  - Toolbar + Stats   │
│    bridge={bridge} │                 │  - MessageTimeline   │
│  />                │                 │  - RequestInspector  │
│                    │                 │  - Waterfall         │
│         [btn] ◄─── __DEV__ only     │                      │
└────────────────────┘                 └──────────────────────┘

[React Native App]
┌────────────────────┐
│                    │  WebSocket      ┌──────────────────────┐
│  DevToolsMiddleware│ ──────────────→ │  npx @webview-ts/    │
│  (headless)        │                 │  devtools             │
│                    │                 │  localhost:4000       │
└────────────────────┘                 └──────────────────────┘
```

## Transport Layer

Pluggable transport abstraction so web and RN use the same middleware but different channels.

```ts
interface DevToolsTransport {
  send(message: RecordedMessage): void;
  onMessage(handler: (msg: RecordedMessage) => void): void;
  disconnect(): void;
}
```

### BroadcastChannelTransport (Web default)

- Uses `BroadcastChannel` API for same-origin tab communication
- Zero config — works immediately with `window.open()`
- Channel name: `__ts-bridge-devtools__`

### WebSocketTransport (RN default)

- Connects to a local WebSocket server
- Config: `{ host?: string; port?: number }` (default `localhost:4000`)
- Used by both the RN app (sender) and the CLI dashboard server (receiver)

## Component API

### Web usage

```tsx
// Unchanged from current API shape
<TsBridgeDevtools bridge={bridge} />
```

Internal behavior:
1. Returns `null` if `__DEV__` is falsy (tree-shaken in production)
2. Registers `DevToolsMiddleware` on mount, removes on unmount
3. Renders a small fixed-position floating button
4. On click: opens dashboard via `window.open()` with inline HTML, hides button
5. On child window close: shows button again

### RN usage (headless)

```ts
import { createDevToolsMiddleware } from '@webview-ts/devtools';
import { WebSocketTransport } from '@webview-ts/devtools/transport';

const transport = new WebSocketTransport({ port: 4000 });
const devtools = createDevToolsMiddleware({ transport });
bridgeHost.use(devtools);
```

Separate terminal:
```bash
npx @webview-ts/devtools --port 4000
```

## File Structure

```
packages/devtools/src/
├── index.ts                          # public API
├── types/index.ts                    # unchanged
├── middleware/DevToolsMiddleware.ts   # add transport support
├── middleware/TimeTracker.ts          # unchanged
├── logger/DevToolsStore.ts           # unchanged
├── logger/StructuredLogger.ts        # unchanged
├── transport/
│   ├── DevToolsTransport.ts          # NEW — interface
│   ├── BroadcastChannelTransport.ts  # NEW — web
│   └── WebSocketTransport.ts         # NEW — RN
├── panel/
│   ├── TsBridgeDevtools.tsx          # REWRITE — button + window.open()
│   └── Dashboard.tsx                 # NEW — full dashboard UI
├── visualizer/
│   ├── MessageTimeline.tsx           # unchanged (reused by Dashboard)
│   └── RequestInspector.tsx          # unchanged (reused by Dashboard)
└── server/
    └── index.ts                      # NEW — CLI server for RN
```

## What Gets Deleted

- `panel/TsBridgeDevtools.tsx` — entire 1,062-line floating panel (rewritten from scratch)
- Props: `position`, `panelHeight`, `buttonLabel`, `initialOpen`

## What Stays

- `DevToolsMiddleware`, `DevToolsStore`, `TimeTracker`, `StructuredLogger` — logic intact
- `MessageTimeline`, `RequestInspector` — reused inside Dashboard
- All type definitions
- All existing tests (middleware, store)

## Dashboard UI

The Dashboard component renders in the separate window. It reuses existing visualizer components and adds:

- **Toolbar**: title, live stats (total, success rate, errors, avg response time), clear, export, connection status
- **Filter bar**: status filter, plugin filter, search
- **Split view**: MessageTimeline (left) + RequestInspector (right)
- **Waterfall view**: middleware execution trace (extracted from old panel code)

Dark theme consistent with current design tokens.

## Dashboard Window (Web)

Opened via `window.open()` with a data URI or `document.write()`:

1. Minimal HTML shell with React mount point
2. Inline-bundled Dashboard component
3. Connects back to main tab via `BroadcastChannelTransport`
4. Main tab detects window close via `setInterval` polling `window.closed`

## CLI Server (RN)

`packages/devtools/src/server/index.ts`:

- HTTP server serves dashboard HTML (same Dashboard component, SSR or pre-bundled)
- WebSocket server receives `RecordedMessage` from RN app
- Forwards messages to dashboard via WebSocket
- Minimal dependencies: `ws` for WebSocket

## Migration

Before:
```tsx
<TsBridgeDevtools bridge={bridge} position="bottom-left" panelHeight={420} />
```

After:
```tsx
<TsBridgeDevtools bridge={bridge} />
```

No other changes needed for web users. The component signature is simplified.
