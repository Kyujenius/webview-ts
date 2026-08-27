---
sidebar_position: 4
title: Iframe Embeds
---

# Iframe Embeds

The same bridge with no native code: the **parent page is the host**, each **iframe is a client**. This is the template for payment widgets, third-party/partner embeds, security boundaries, and embedding legacy apps.

A runnable demo lives at [`examples/iframe`](https://github.com/Kyujenius/webview-ts/tree/main/examples/iframe) — two frames, typed calls, broadcast + targeted events, and standalone fallback mode.

## What this is (and isn't)

This is the **iframe-isolation integration style**: each frame is a separate window/JS context, independently bundled and deployed (cross-origin works), and the only channel between them is string `postMessage`. That hard boundary is exactly the condition under which webview-ts applies.

It is **not** Module Federation-style micro-frontend composition. There, remote bundles are loaded into the _same_ JS context — window and heap are shared, modules import each other directly, and there is no message boundary for a bridge to type. If your architecture is MF/single-spa-style, you don't need webview-ts between remotes.

Both adapters ship in `@webview-ts/core` — `IframeClientAdapter` and `IframeHostAdapter` — so the iframe platform works out of the box. Their source (~40 lines each) doubles as the reference for [custom adapters](./custom-adapters).

## Client side (inside the iframe)

One adapter, injected via `BridgeConfig.adapter`:

```typescript
import { BridgeClient, IframeClientAdapter } from '@webview-ts/core';

const bridge = new BridgeClient<Actions, Events>({
  adapter: new IframeClientAdapter(SHELL_ORIGIN),
  fallback: mergeFallbacks([shell], undefined),
});
bridge.applyPlugins([shell]);
bridge.connect();
```

For reference, the adapter itself is just:

```typescript
class IframeClientAdapter implements ClientAdapter {
  constructor(private readonly parentOrigin: string) {}

  isAvailable() {
    return typeof window !== 'undefined' && window.parent !== window;
  }
  get connectionMode() {
    return this.isAvailable() ? 'native' : 'disconnected';
  }
  send(message: BridgeMessage) {
    window.parent.postMessage(JSON.stringify(message), this.parentOrigin);
  }
  onMessage(callback: (raw: string) => void) {
    const listener = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      if (event.origin !== this.parentOrigin) return; // only the shell may speak
      if (event.source !== window.parent) return;
      callback(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }
}
```

Opened standalone (no parent shell), `isAvailable()` is false and the plugin's [fallback mocks](../guides/fallback-mode) take over.

## Host side (the parent page)

One `IframeHostAdapter` per frame (the `event.source` check keeps each frame's traffic separate), fed into the neutral `createBridgeHost` factory:

```typescript
import { createBridgeHost, IframeHostAdapter } from '@webview-ts/core';

const registry = new ConnectionRegistry();

function mountFrame(frame: HTMLIFrameElement, id: string) {
  const adapter = new IframeHostAdapter(frame, CHILD_ORIGIN);

  const { bridgeHost, sendEvent } = createBridgeHost({
    adapter,
    config: { registry },
    plugins: [
      shell.host({
        getUser: async () => ({ name: 'Jane', role: 'member' }),
        showToast: async ({ message }) => {
          render(message);
          return { shown: true };
        },
      }),
    ],
  });

  registry.register(id, (message) => adapter.send(message));
  return bridgeHost;
}
```

In a React or Vue shell, use the framework's `useBridgeHost({ adapter, plugins })` hook/composable instead — same factory underneath.

Broadcast and targeted events work exactly as on mobile:

```typescript
host.sendEvent('shell.themeChanged', { theme }, { target: TARGET.BROADCAST });
host.sendEvent('shell.ping', { from: 'shell' }, { target: 'frame-B' });
```

## Nested: widget needs a native capability?

When this page itself lives inside a native WebView, relay explicitly — see [Patterns § Nested embeds relay explicitly](../guides/patterns#nested-embeds-relay-explicitly).

## Cross-origin

Both adapters take origins as parameters and verify `event.origin` + `event.source` on every message — the same code works when frames are served from a different origin. See [Security](../guides/security).
