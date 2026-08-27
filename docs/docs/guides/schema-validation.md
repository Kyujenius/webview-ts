---
sidebar_position: 1
title: Schema Validation
---

# Schema Validation

Pass any [Standard Schema](https://standardschema.dev) library (zod, valibot, arktype) to `action()` / `event()`. Types are inferred from the schema — no generics needed — and payloads are validated at the **receiving boundary**.

```typescript
import { action, definePlugin, event } from '@webview-ts/shared';
import { z } from 'zod';

export const camera = definePlugin('camera', {
  takePhoto: action({
    payload: z.object({ quality: z.number().min(0).max(1).default(0.8) }),
    response: z.object({ uri: z.string(), width: z.number(), height: z.number() }),
  }),
});
```

## Where validation runs

- **Host validates inbound payloads** before your handler runs — malformed calls never reach host code.
- **Client validates inbound responses and events** — this catches _version skew_: the day your web app ships with a contract the installed host app doesn't have yet.
- Invalid **events** are dropped (not delivered to handlers); the error surfaces through the global `onError`.

## Input vs output types

Schema output **replaces** the value crossing the boundary, so `.default()`, `.transform()`, and `z.coerce` work across the bridge:

- Senders use the schema's **input** type — `quality` above is optional at the call site.
- Receivers get the **output** type — the handler always sees a `number`.

```typescript
await takePhoto.execute({}); // ✅ quality defaults to 0.8
// handler receives { quality: 0.8 }
```

## Failures

Validation failures surface as `BridgeCallError` with `code: 'VALIDATION_ERROR'` and structured `details.issues` (message + path). webview-ts never attaches the raw payload to errors — though some schema libraries (e.g. valibot) may include received values in their own issue messages.

Validation errors are **not retried** by default, even when retry is configured — retrying a payload the schema rejected can never succeed. See [Timeout, retry & cache](./timeout-retry-cache).

## Mixing modes

No schema? Nothing changes — phantom-typed `action<P, R>()` works exactly as before, and the two modes coexist freely in one plugin. Mixing generics _and_ schemas on a single action is a compile error.
