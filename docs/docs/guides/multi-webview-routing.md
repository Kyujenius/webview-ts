---
sidebar_position: 6
title: Multi-WebView Routing
---

# Multi-WebView Routing

Apps that keep several WebViews alive at once — tab bars, main view + modal, mini-app shells — hit the same question fast: _which WebView should receive this event?_

webview-ts answers it with a `ConnectionRegistry`: each WebView's host registers under its own id, responses automatically route back to the WebView that sent the request, and the host can target or broadcast events.

```tsx
import { ConnectionRegistry, TARGET } from '@webview-ts/shared';
import { useBridgeHost } from '@webview-ts/react-native';

const registry = useMemo(() => new ConnectionRegistry(), []);

const hostA = useBridgeHost({ name: 'webview-A', registry, config: { registry }, plugins });
const hostB = useBridgeHost({ name: 'webview-B', registry, config: { registry }, plugins });

// Target one WebView
hostA.bridgeHost.sendEvent('cart.updated', payload, { target: hostB.sourceId });

// Broadcast to every connected WebView
hostA.bridgeHost.sendEvent('session.expired', payload, { target: TARGET.BROADCAST });
```

## Guarantees

- **Responses never cross WebViews** — each response carries the requester's id and routes back through its own adapter.
- **Routing is host-mediated** — WebViews never talk to each other directly. The host relays every message, which keeps a single audit point for all cross-WebView traffic: interceptors and `onCall` telemetry see everything.

## Not just mobile

The same registry routes between iframes: the [iframe example](../platforms/iframe) runs two embedded frames, broadcasts a theme change to both, and pings one frame while the other stays silent — no native code involved.

For a runnable mobile demo, see [`examples/react-native`](https://github.com/Kyujenius/webview-ts/tree/main/examples/react-native).
