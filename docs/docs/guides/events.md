---
sidebar_position: 3
title: Events
---

# Events

Events flow one way — host → client — and are declared in the contract next to actions:

```typescript
export const location = definePlugin(
  'location',
  { get: action<void, Position>() },
  { events: { updated: event<Position>() } }
);
```

## Subscribing (client)

Through `usePlugin`, event names are short and typed:

```tsx
const { on } = usePlugin(location);

useEffect(
  () =>
    on('updated', (position) => {
      //                            ^? Position
      setPosition(position);
    }),
  []
);
```

Or through the bridge directly with full names — `useEvent('location.updated', handler)` in React, `bridge.on('location.updated', handler)` anywhere.

## Sending (host)

`sendEvent` is typed against the merged plugin event map — contract events get payload checking and autocomplete, while arbitrary custom event names stay allowed (an open event set):

```typescript
const { sendEvent } = useBridgeHost({ plugins: [location.host(handlers)] });

sendEvent('location.updated', { lat: 37.5, lng: 127.0 }); // ✅ payload checked
sendEvent('location.updated', { lat: 'x' }); // ❌ compile error
sendEvent('app.custom', { anything: true }); // ✅ open set
```

Inside a plugin handler, `ctx.emit` uses short names and is typed against that plugin's events:

```typescript
location.host({
  get: async (_payload, ctx) => {
    ctx.emit('updated', { lat, lng }); // ✅ typed
    ctx.emit('nope', {}); // ❌ compile error
    return { lat, lng };
  },
});
```

## Event schemas

`event(schema)` validates inbound event payloads on the client — invalid events are **dropped**, not delivered, and the failure surfaces through the global `onError`. See [Schema validation](./schema-validation).

## Targeting

With multiple WebViews, events can be targeted to one or broadcast to all — see [Multi-WebView routing](./multi-webview-routing).
