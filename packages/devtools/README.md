# @webview-ts/devtools

![npm](https://img.shields.io/npm/v/@webview-ts/devtools)

Debugging and visualization tools for `@webview-ts` bridge communication.

## Installation

```bash
npm install @webview-ts/devtools
```

## Quick Start

```tsx
import { createBridge } from '@webview-ts/core';
import {
  createDevToolsMiddleware,
  createTimeTracker,
  TsBridgeDevtools,
} from '@webview-ts/devtools';

const bridge = createBridge();

// Add devtools middleware
const devtools = createDevToolsMiddleware({ maxRecords: 500 });
const timeTracker = createTimeTracker();

bridge.use(devtools);
bridge.use(timeTracker);

// Render floating panel (TanStack Query DevTools-style)
function App() {
  return (
    <>
      <MyApp />
      <TsBridgeDevtools bridge={bridge} />
    </>
  );
}
```

## DevToolsMiddleware

Records all bridge messages for inspection. Uses the onion model -- captures requests before `next()`, responses/errors after.

```typescript
import { createDevToolsMiddleware } from '@webview-ts/devtools';

const devtools = createDevToolsMiddleware({
  enabled: true,
  maxRecords: 1000,
  trackPerformance: true,
  captureStackTraces: true,
  filter: (message) => message.action !== 'heartbeat',
  onMessage: (record) => console.log('recorded:', record.status),
});

bridge.use(devtools);

// Access recorded data
const store = devtools.getStore();
const messages = store.getMessages();
const metrics = store.getMetrics();
const json = store.export();

// Toggle at runtime
devtools.setEnabled(false);
devtools.clear();
```

## TsBridgeDevtools Component

Floating panel with message timeline, request inspector, filtering, and performance stats:

```tsx
import { TsBridgeDevtools } from '@webview-ts/devtools';

<TsBridgeDevtools
  bridge={bridge}
  initialOpen={false}
  position="bottom-left" // or 'bottom-right'
  panelHeight={420}
  buttonLabel="ts-bridge"
/>;
```

The component auto-attaches a `DevToolsMiddleware` to the bridge instance on mount.

## TimeTracker

Performance tracking middleware:

```typescript
import { createTimeTracker } from '@webview-ts/devtools';

const tracker = createTimeTracker(1000); // max entries
bridge.use(tracker);

// Query performance data
tracker.getEntries();
tracker.getEntriesByAction('camera.takePhoto');
tracker.getAverageDuration('camera.takePhoto'); // ms
tracker.getSuccessRate(); // 0-1
tracker.getPendingEntries();
tracker.export(); // JSON string
```

## StructuredLogger

Configurable structured logging middleware:

```typescript
import { createStructuredLogger, LogLevel } from '@webview-ts/devtools';

const logger = createStructuredLogger({
  minLevel: LogLevel.DEBUG,
  console: true,
  includePayloads: false, // hide sensitive data
  onLog: (entry) => sendToService(entry),
});

bridge.use(logger);

// Query logs
logger.getLogs();
logger.getLogsByLevel(LogLevel.ERROR);
logger.log(LogLevel.INFO, 'custom message', { key: 'value' });
logger.export(); // JSON string
```

## API Overview

### Middleware Factories

| Factory                             | Description                     |
| ----------------------------------- | ------------------------------- |
| `createDevToolsMiddleware(config?)` | Message recording and metrics   |
| `createTimeTracker(maxEntries?)`    | Per-action performance tracking |
| `createStructuredLogger(config?)`   | Structured logging with levels  |

### React Components

| Component          | Description                                 |
| ------------------ | ------------------------------------------- |
| `TsBridgeDevtools` | Floating debug panel (timeline + inspector) |
| `MessageTimeline`  | Standalone message timeline                 |
| `RequestInspector` | Standalone request/response inspector       |

### DevToolsConfig

| Option               | Type               | Default | Description              |
| -------------------- | ------------------ | ------- | ------------------------ |
| `enabled`            | `boolean`          | `true`  | Enable/disable recording |
| `maxRecords`         | `number`           | `1000`  | Max stored messages      |
| `trackPerformance`   | `boolean`          | `true`  | Track durations          |
| `captureStackTraces` | `boolean`          | `true`  | Capture error stacks     |
| `filter`             | `(msg) => boolean` | --      | Message filter           |
| `onMessage`          | `(record) => void` | --      | New record callback      |

## Production

Disable devtools in production to avoid memory overhead:

```typescript
const devtools = createDevToolsMiddleware({
  enabled: process.env.NODE_ENV !== 'production',
});
```

Or conditionally skip the middleware entirely:

```typescript
if (__DEV__) {
  bridge.use(createDevToolsMiddleware());
}
```

## License

MIT
