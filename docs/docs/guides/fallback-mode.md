---
sidebar_position: 5
title: Fallback Mode
---

# Fallback Mode

Develop the web app in a plain browser before any host exists. When no transport is available and fallback is enabled, calls are answered by mock handlers instead of failing.

## Per-plugin mocks (recommended)

Plugins carry their own mocks — typed against the contract:

```typescript
export const camera = definePlugin('camera', {
  takePhoto: action<{ quality?: number }, { uri: string }>(),
}).withFallback({
  takePhoto: async () => ({ uri: 'https://picsum.photos/400/300' }),
});
```

`createBridgeReact` / `createBridgeVue` merge every plugin's mocks automatically. With `@webview-ts/core` directly:

```typescript
import { mergeFallbacks } from '@webview-ts/shared';

const bridge = new BridgeClient({ fallback: mergeFallbacks([camera], undefined) });
```

## Config forms

```typescript
fallback: true; // log a warning and reject each call (visible, not silent)
fallback: false; // disabled — calls fail with NATIVE_UNAVAILABLE (default)
fallback: fallbackMap; // answer calls with these handlers
```

## Checking the mode

```typescript
bridge.connectionMode; // 'native' | 'fallback' | 'disconnected'
```

The React and Vue bindings expose this as `connectionMode` / `isAvailable` — useful for a dev-mode badge. The [iframe example](../platforms/iframe) shows the full pattern: the same page shows `native` inside the shell and `fallback` when opened standalone.

## Precedence

Fallback only activates when the real transport is unavailable. Inside an actual host, plugin mocks are inert — there is no "mock in production" failure mode. This also applies when a [custom adapter](../platforms/custom-adapters) is injected: if it reports unavailable and fallback is enabled, fallback takes over.
