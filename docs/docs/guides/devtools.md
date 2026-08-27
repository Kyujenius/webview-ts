---
sidebar_position: 8
title: DevTools
---

# DevTools

A real-time message inspector: all bridge traffic (requests, responses, events, and call timings) captured and displayed in a web dashboard.

## Setup

One import in your dev entry — the recorder registers itself and auto-connects to `ws://localhost:4000`:

```typescript title="main.tsx"
if (import.meta.env.DEV) {
  import('@webview-ts/devtools/client');
}
```

Then run the server:

```bash
pnpm devtools
# or: npx @webview-ts/devtools
```

## Design notes

- The recorder lives in a **separate package** (`@webview-ts/devtools/client`) — production bundles never carry the DevTools runtime.
- It observes through the bridge's public lifecycle surface (`onCall`, `onAnyEvent`); the engine has no knowledge of DevTools beyond a 20-line registration seam.
- Import order doesn't matter: if the recorder loads after bridges have connected, it attaches to them retroactively.
- If the server isn't running, the recorder retries quietly in the background — no console noise, no impact on calls.
