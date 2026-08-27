---
sidebar_position: 5
title: Custom Adapters
---

# Custom Adapters

A new platform is exactly one adapter pair. The engine (`core`) never touches a platform API — adapters own every transport quirk, and they plug in without modifying anything.

The requirements for a platform:

1. **A JS runtime on the host side** — `BridgeHost` is pure TypeScript.
2. **A way to pass strings both ways** — anything from `postMessage` to IPC.

NativeScript and future frameworks like Lynx fit; the built-in [iframe adapters](./iframe) (~40 lines each in `@webview-ts/core`) are the reference implementation. Electron technically fits too, but webview-ts's pains — version skew between separately deployed sides, browser-only fallback dev — don't exist where host and web ship in one binary, so it's not a target.

## Client side: `ClientAdapter`

```typescript
interface ClientAdapter {
  /** Send a message to the host */
  send(message: BridgeMessage): void;
  /** Subscribe to raw messages from the host. Returns an unsubscribe fn. */
  onMessage?(callback: (raw: string) => void): () => void;
  /** Is a live host reachable right now? */
  isAvailable(): boolean;
  /** 'native' | 'fallback' | 'disconnected' */
  connectionMode: ConnectionMode;
}
```

Inject it through config — auto-detection is skipped:

```typescript
const bridge = new BridgeClient({ adapter: new MyPlatformAdapter() });
```

If the injected adapter reports unavailable and fallback is configured, [fallback mode](../guides/fallback-mode) still takes over — browser-only development keeps working on every platform.

:::note
`BridgeConfig.allowedOrigins` is consumed by the built-in adapters only. An injected adapter owns its own reception, so it must apply its own sender checks — see [Security](../guides/security).
:::

## Host side: `HostAdapter`

```typescript
interface HostAdapter {
  /** Deliver a serialized message to the embedded web content */
  send(message: string): void;
  /** Subscribe to raw messages from the web content. Returns an unsubscribe fn. */
  onMessage(callback: (json: string) => void): () => void;
  destroy(): void;
}
```

Inject it through the neutral factory — the same call every framework binding wraps:

```typescript
import { createBridgeHost } from '@webview-ts/core';

const { bridgeHost, sendEvent } = createBridgeHost({
  adapter: new MyPlatformHostAdapter(),
  plugins: [myPlugin.host(handlers)],
});
```

(Lower level: `new BridgeHost()` + `host.attach(adapter)` works too.)

## Responsibilities checklist

The adapter owns _transport mechanics_; the engine owns everything else. When writing one:

- **Verify the sender** before delivering a string — check `event.origin`/`event.source` or the platform equivalent, so foreign contexts can't inject bridge messages. See [Security](../guides/security).
- **Queue, don't drop** — if the channel isn't ready yet (a ref not attached, a window still loading), buffer outbound messages and flush on attach. The RN host adapter does this with a bounded queue.
- **Contain platform quirks** — e.g. the RN client adapter listens on both `window` and `document` because iOS and Android deliver differently. Quirk knowledge must not leak upward.
- **Don't parse** — deliver raw strings; parsing, type guards, validation, and dispatch belong to the engine.

Everything above the adapter — contracts, schema validation, interceptors, retry/cache, events, routing, DevTools — works unchanged on your platform.
