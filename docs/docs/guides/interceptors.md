---
sidebar_position: 2
title: Interceptors & Lifecycle
---

# Interceptors & Lifecycle Events

## Interceptors

webview-ts uses Axios-style interceptors: sequential transform chains for outgoing requests and incoming responses.

```typescript
import type { RequestInterceptor } from '@webview-ts/shared';

const logRequest: RequestInterceptor = {
  name: 'log-req',
  fn: (req) => {
    console.log(`[->] ${req.action}`, req.payload);
    return req;
  },
};

const { BridgeProvider, usePlugin } = createBridgeReact({
  plugins: [camera],
  interceptors: { request: [logRequest] },
});
```

### Global vs per-action

```typescript
// Global — runs on ALL actions (returns an unsubscribe function)
bridge.interceptors.request.use({ name: 'auth', fn: (req) => req });
bridge.interceptors.response.use({ name: 'unwrap', fn: (res) => res });

// Per-action — attached on the action marker, runs for that action only
const camera = definePlugin('camera', {
  takePhoto: action<P, R>().interceptors.request.use(compressionInterceptor),
});
```

Execution order is a linear chain:

```
global request → per-action request → [send to host]
  → per-action response → global response
```

## Lifecycle events

For logging and timing, subscribe instead of transforming:

```typescript
bridge.onCall('call:start', ({ action, payload }) => console.log('[->]', action, payload));
bridge.onCall('call:end', ({ action, duration }) => console.log('[<-]', action, `${duration}ms`));
bridge.onCall('call:error', ({ action, error }) => console.error(action, error));
```

The same `onCall` API exists on `BridgeHost`, where the events wrap handler execution — useful for shipping bridge telemetry to Datadog, Sentry, or any collector from either side. Lifecycle listeners can never break a call: exceptions inside them are swallowed.
