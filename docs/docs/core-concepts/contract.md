---
sidebar_position: 1
title: The Contract
---

# The Contract

One `definePlugin` call is the single source of truth. Payload and response types flow from it to both ends — the web client's hooks and the host's handlers — with zero manual casting.

## Actions

An action is a request-response pair. In **phantom mode** you declare the types as generics; nothing is validated at runtime:

```typescript
import { action, definePlugin } from '@webview-ts/shared';

export const camera = definePlugin('camera', {
  takePhoto: action<{ quality?: number }, { uri: string }>(),
  //                 ^payload            ^response
});
```

Action names are automatically namespaced: `takePhoto` becomes `camera.takePhoto` on the wire.

### Phantom mode vs schema mode

Every action is written in one of two modes, and the difference is _where the types live_:

**Phantom mode** — `action<Payload, Response>()`. The generics exist only at compile time; they vanish when TypeScript compiles ("phantom" types — the runtime marker object carries no trace of them). Zero runtime cost, zero dependencies, but also zero runtime checking: if the other side sends a shape the contract didn't promise, nothing catches it at the boundary.

**Schema mode** — `action({ payload: z.object(...), response: z.object(...) })`. You pass [Standard Schema](https://standardschema.dev) objects (zod, valibot, arktype) instead of generics. Types are _inferred from the schema_ — no generics to repeat — and the same schema validates real payloads at the receiving boundary at runtime.

|                               | Phantom            | Schema                                  |
| ----------------------------- | ------------------ | --------------------------------------- |
| Type source                   | generics you write | inferred from the schema                |
| Runtime validation            | none               | at both receiving boundaries            |
| Version-skew detection        | ❌                 | ✅ (`VALIDATION_ERROR`)                 |
| `.default()` / `.transform()` | —                  | ✅ applied across the bridge            |
| Runtime cost / deps           | zero               | schema library + validation per message |

**How to choose:** phantom mode is enough when both sides ship together and you trust the wire — the compiler already guarantees both codebases agree. Reach for schema mode where the boundary is _untrusted or can drift_: independently deployed web/host versions (skew), external embeds, or payloads whose shape genuinely needs checking. The two modes mix freely per action in one plugin — validate the risky actions, keep the rest free. See [Schema validation](../guides/schema-validation) for the full behavior.

### Per-action options

Timeout, retry, and cache are part of the contract, not scattered call-site configuration:

```typescript
export const device = definePlugin('device', {
  getInfo: action<void, DeviceInfo>({
    timeout: 5000,
    retry: { maxAttempts: 2, delay: 300 },
    cache: 60_000, // ms TTL, or `true` for indefinite
  }),
});
```

See [Timeout, retry & cache](../guides/timeout-retry-cache) for resolution order and retry semantics.

### Per-action interceptors

```typescript
takePhoto: action<P, R>().interceptors.request.use(compressionInterceptor),
```

See [Interceptors](../guides/interceptors).

## Events

Events are one-way, host → client:

```typescript
import { action, definePlugin, event } from '@webview-ts/shared';

export const location = definePlugin(
  'location',
  { get: action<void, { lat: number; lng: number }>() },
  {
    events: {
      updated: event<{ lat: number; lng: number }>(),
    },
  }
);
```

Event names are namespaced the same way: `location.updated`. Both ends are typed — the client's `on()` handler and the host's `sendEvent` / `ctx.emit`. See [Events](../guides/events).

## Fallback mocks

Plugins ship their own browser-dev mocks:

```typescript
export const camera = definePlugin('camera', {
  takePhoto: action<P, R>(),
}).withFallback({
  takePhoto: async () => ({ uri: 'https://picsum.photos/400/300' }),
});
```

The mock signatures are typed from the action markers — a wrong mock shape is a compile error. See [Fallback mode](../guides/fallback-mode).

## Host handlers

`plugin.host(handlers)` produces the host-side registration with the same inference:

```typescript
camera.host({
  takePhoto: async (payload, ctx) => {
    //          ^? { quality?: number }
    return { uri: '...' }; // ✅ checked against the response type
  },
});
```

- Every declared action must be implemented — a missing handler is a compile error.
- When the plugin declares events, `ctx.emit('updated', payload)` is available and typed against the event map.
- When an action has a payload schema, the payload is validated **before** your handler runs.

## Type guarantees

The inference chain is covered by compile-time tests (run by `tsc` and vitest's typecheck mode). What the contract guarantees:

- Action and event **names stay exact** — `useAction('camera.nope')` is a compile error, not a runtime 404.
- **Payloads and responses** are checked at every surface: `execute`, `call`, handlers, mocks, `sendEvent`, `emit`.
- With schemas, **input and output types split** correctly: senders use the schema's input type (`.default()` fields optional), receivers get the output type.
