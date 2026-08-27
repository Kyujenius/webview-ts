---
sidebar_position: 1
title: React
---

# React

`@webview-ts/react` wraps the bridge in a provider and hooks. Everything is typed from the plugins you pass to `createBridgeReact`.

## Setup

```typescript title="bridge.ts"
import { createBridgeReact } from '@webview-ts/react';
import { camera, location } from './plugins';

export const { BridgeProvider, useBridge, usePlugin, useAction, useEvent } = createBridgeReact({
  plugins: [camera, location],
  config: { timeout: 10_000 },
  interceptors: { request: [authInterceptor] },
});
```

```tsx title="main.tsx"
<BridgeProvider>
  <App />
</BridgeProvider>
```

Strict Mode is fully supported — the provider separates instance creation (`useMemo`) from side effects (`useEffect`), so double-invocation never leaks listeners or duplicates DevTools connections.

## `usePlugin` — one handle per action

```tsx
const { takePhoto } = usePlugin(camera);

takePhoto.execute({ quality: 0.9 }); // typed payload → typed Promise
takePhoto.status; // 'idle' | 'loading' | 'success' | 'error'
takePhoto.data; // response | null
takePhoto.error; // BridgeCallError | null
takePhoto.isLoading; // boolean
takePhoto.reset(); // reset state + invalidate this action's cache
```

Plus a typed event subscriber using short names:

```tsx
const { on } = usePlugin(location);
useEffect(() => on('updated', (pos) => setPosition(pos)), []);
```

## `useAction` — one action by full name

```tsx
const info = useAction('device.getInfo', { cache: 60_000 });
```

Action names are exact — an undeclared name is a compile error.

## `useEvent` — subscribe to one event

```tsx
useEvent('location.updated', (pos) => setPosition(pos));
```

Subscription lifetime is tied to the component; unsubscription is automatic.

## `useBridge` — the escape hatch

```tsx
const { call, on, off, isAvailable, connectionMode, bridge } = useBridge();
```

`call` keeps the same key/payload/response inference as `usePlugin`. `bridge` is the underlying `BridgeClient` for advanced usage (global interceptors, `onCall` telemetry).

## The host role — a React page as an iframe shell

**The web is always both.** The same React app that is a client inside a WebView can be the _host_ of embedded iframes. `useBridgeHost` wraps the neutral core factory; you inject the transport:

```tsx
import { useBridgeHost, IframeHostAdapter, defineHandlers } from '@webview-ts/react';
import { shell } from './plugins';

function Shell({ frameRef }: { frameRef: HTMLIFrameElement }) {
  const { sendEvent } = useBridgeHost({
    adapter: new IframeHostAdapter(frameRef, CHILD_ORIGIN),
    plugins: [shell.host({ getUser: async () => user, showToast: async (p) => toast(p) })],
  });

  return <button onClick={() => sendEvent('shell.themeChanged', { theme: 'dark' })}>…</button>;
}
```

Strict Mode is handled the same way as the client side — setup→cleanup→setup re-attaches cleanly. See [Iframe embeds](./iframe) for the full pattern including multi-frame routing.

## Custom actions without plugins

```typescript
type CustomActions = {
  'app.custom': { payload: { id: string }; response: { done: boolean } };
};

const { useAction } = createBridgeReact<CustomActions>({});
```
