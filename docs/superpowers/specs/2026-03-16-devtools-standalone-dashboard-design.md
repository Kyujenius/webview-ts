# DevTools Standalone Dashboard

## Problem

The current `TsBridgeDevtools` is a 1,062-line floating panel that overlays on top of the app. This causes two problems:

1. **Web**: The panel covers app UI and shrinks with the viewport
2. **Mobile (RN)**: A floating panel inside a WebView is unusable on small screens

## Solution

Replace the floating panel with a **separate-window dashboard**. A small floating button (visible only in dev mode) opens a full dashboard in a new browser window.

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
│         [btn] ◄─── dev mode only    │                      │
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
  send(data: TransportMessage): void;
  onMessage(handler: (data: TransportMessage) => void): void;
  onDisconnect(handler: () => void): void;
  readonly connected: boolean;
  disconnect(): void;
}

// Messages sent over transport
type TransportMessage =
  | { type: 'record'; record: RecordedMessage }
  | { type: 'clear' }
  | { type: 'metrics'; metrics: PerformanceMetrics };
```

### BroadcastChannelTransport (Web default)

- Uses `BroadcastChannel` API for same-origin tab communication
- Zero config — works immediately with `window.open()`
- Channel name: `__ts-bridge-devtools__`
- `connected` is always `true` (BroadcastChannel has no connection lifecycle)
- Minimum browser requirement: Chrome 54+, Firefox 38+, Safari 15.4+. No fallback — DevTools simply won't open in unsupported browsers.

### WebSocketTransport (RN default)

- Connects to a local WebSocket server
- Config: `{ host?: string; port?: number }` (default `localhost:4000`)
- `connected` reflects WebSocket `readyState`
- `onDisconnect` fires on close/error; auto-reconnect with exponential backoff

## DevToolsConfig Extension

The existing `DevToolsConfig` type gains an optional `transport` field:

```ts
interface DevToolsConfig {
  // ... existing fields unchanged ...
  transport?: DevToolsTransport;
}
```

When `transport` is provided, `DevToolsMiddleware` sends each `RecordedMessage` update over the transport in addition to storing it locally in `DevToolsStore`.

## Dev Mode Detection

The component uses `process.env.NODE_ENV !== 'production'` to determine dev mode. This works with all major bundlers (webpack, vite, esbuild, rollup) and is tree-shaken in production builds. No custom `__DEV__` global required.

## Component API

### Web usage

```tsx
<TsBridgeDevtools bridge={bridge} />
```

Internal behavior:
1. Returns `null` if `process.env.NODE_ENV === 'production'`
2. Registers `DevToolsMiddleware` with `BroadcastChannelTransport` on mount, cleans up on unmount
3. Renders a small fixed-position floating button (bottom-left)
4. On click: opens dashboard via `window.open()` + blob URL, hides button
5. On child window close (detected via `setInterval` polling `window.closed`): shows button again

### RN usage (headless)

```ts
import { createDevToolsMiddleware, WebSocketTransport } from '@webview-ts/devtools';

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
├── index.ts                          # public API (updated exports)
├── types/index.ts                    # add transport field to DevToolsConfig
├── middleware/DevToolsMiddleware.ts   # add transport.send() calls
├── middleware/TimeTracker.ts          # unchanged
├── logger/DevToolsStore.ts           # unchanged
├── logger/StructuredLogger.ts        # unchanged
├── transport/
│   ├── DevToolsTransport.ts          # NEW — interface + TransportMessage type
│   ├── BroadcastChannelTransport.ts  # NEW — web
│   └── WebSocketTransport.ts         # NEW — RN
├── panel/
│   ├── TsBridgeDevtools.tsx          # REWRITE — button + window.open()
│   └── Dashboard.tsx                 # NEW — full dashboard UI (dark theme)
├── dashboard/
│   ├── WaterfallView.tsx             # NEW — extracted from old panel
│   ├── Toolbar.tsx                   # NEW — stats + actions
│   └── FilterBar.tsx                 # NEW — status/plugin/search filters
├── visualizer/
│   ├── MessageTimeline.tsx           # MODIFY — add optional theme prop
│   └── RequestInspector.tsx          # MODIFY — add optional theme prop
└── server/
    └── index.ts                      # NEW — CLI server for RN
```

## Visualizer Theme Support

`MessageTimeline` and `RequestInspector` currently use a light theme (white bg, light borders). The Dashboard uses a dark theme. To support both:

- Add an optional `theme?: 'light' | 'dark'` prop to both components
- Default to `'light'` for backward compatibility
- Dashboard passes `theme="dark"`
- Theme affects only color tokens, not layout or structure

## Dashboard Window (Web)

The dashboard is opened via `window.open()` with a **blob URL**:

1. Build an HTML string containing a minimal shell + inline `<script>` with the Dashboard bundle
2. Create a `Blob` with `text/html` type → `URL.createObjectURL(blob)`
3. `window.open(blobUrl)` → no size limits (unlike data URIs), no server needed
4. Dashboard component connects via `BroadcastChannelTransport` receiver mode
5. Main tab polls `childWindow.closed` via `setInterval` (1s interval)

## Dashboard UI

The Dashboard component renders in the separate window with a dark theme:

- **Toolbar**: title, live stats, clear/export buttons, connection status indicator
- **Filter bar**: status filter (all/success/error/pending), plugin filter, search input
- **Split view**: MessageTimeline (left, dark theme) + RequestInspector (right, dark theme)
- **Waterfall view**: middleware execution trace with timing bars (extracted from old panel into `WaterfallView.tsx`)

## CLI Server (RN)

`packages/devtools/src/server/index.ts`:

- HTTP server serves pre-bundled dashboard HTML
- WebSocket server receives `RecordedMessage` from RN app
- Forwards messages to connected dashboard clients via WebSocket
- Dependencies: `ws` for WebSocket (no express — use Node `http` module)

## Package.json Updates

Add sub-path export for transport:

```json
{
  "exports": {
    ".": { ... },
    "./transport": {
      "types": "./dist/transport/index.d.ts",
      "import": "./dist/transport/index.js",
      "require": "./dist/transport/index.cjs"
    }
  }
}
```

## What Gets Deleted

- `panel/TsBridgeDevtools.tsx` — entire floating panel (rewritten)
- Props: `position`, `panelHeight`, `buttonLabel`, `initialOpen`
- `panel/TsBridgeDevtools.test.tsx` — rewritten to test new button + window.open() behavior

## What Stays

- `DevToolsMiddleware`, `DevToolsStore`, `TimeTracker`, `StructuredLogger` — logic intact
- `MessageTimeline`, `RequestInspector` — modified only to add theme prop
- All type definitions (extended, not replaced)
- Tests for middleware and store — unchanged

## Migration

Before:
```tsx
<TsBridgeDevtools bridge={bridge} position="bottom-left" panelHeight={420} />
```

After:
```tsx
<TsBridgeDevtools bridge={bridge} />
```

No other changes needed for web users.
