---
sidebar_position: 11
title: Testing
---

# Testing

Three layers, three techniques — all using machinery the library already ships.

## Component tests: fallback is the test seam

In jsdom/happy-dom there is no native transport, so the bridge runs in [fallback mode](./fallback-mode) automatically — your plugins' `withFallback` mocks answer calls. To override responses **per test**, pass a fallback map through the provider (it takes precedence over plugin mocks):

```tsx
render(
  <BridgeProvider
    config={{
      fallback: {
        'camera.takePhoto': async () => ({ uri: '/fixture.jpg', width: 1, height: 1 }),
      },
    }}
  >
    <PhotoButton />
  </BridgeProvider>
);
```

No mocking library, no module interception — the same seam that powers browser-only development powers your tests.

## Handler tests: they're just functions

Host handlers are plain async functions. Test them directly:

```typescript
const handlers = { takePhoto: async ({ quality }) => nativeTake(quality) };
expect(await handlers.takePhoto({ quality: 0.5 })).toEqual({ uri: expect.any(String) });
```

To include the host pipeline (schema validation, error serialization), drive `BridgeHost.handleMessage` with a constructed message:

```typescript
const { bridgeHost } = createBridgeHost({ adapter: stubAdapter, plugins: [camera.host(handlers)] });
const response = await bridgeHost.handleMessage({
  id: 't1',
  action: 'camera.takePhoto',
  payload: { quality: 2 }, // out of range
  timestamp: Date.now(),
  sourceId: 'test',
  targetId: 'host',
});
expect(response.success).toBe(false); // VALIDATION_ERROR, serialized like production
```

## Contract round-trips: a DIY loopback

To verify the full path — interceptors, schemas, error codes — wire a client and host together with a pair of in-memory adapters:

```typescript
function createLoopback() {
  let toHost: (raw: string) => void;
  let toClient: (raw: string) => void;

  const host = createBridgeHost({
    adapter: {
      send: (json) => toClient(json),
      onMessage: (cb) => ((toHost = cb), () => {}),
      destroy: () => {},
    },
    plugins: [camera.host(realHandlers)],
  });

  const client = new BridgeClient({
    adapter: {
      send: (msg) => toHost(JSON.stringify(msg)),
      onMessage: (cb) => ((toClient = cb), () => {}),
      isAvailable: () => true,
      connectionMode: 'native',
    },
  });
  client.applyPlugins([camera]);
  client.connect();

  return { client, host };
}
```

Twenty lines, no platform, and every message crosses a real JSON serialization boundary — version-skew bugs (a contract field the other side doesn't know) reproduce here exactly as they would in production.
