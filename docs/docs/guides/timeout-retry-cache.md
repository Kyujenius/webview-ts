---
sidebar_position: 4
title: Timeout, Retry & Cache
---

# Timeout, Retry & Cache

All three are declared in the contract, overridable closer to the call site. Resolution order everywhere (narrower wins):

```
per-call (execute options) > per-action (useAction) > plugin (action marker) > global (BridgeConfig)
```

## Timeout

```typescript
getInfo: (action<void, DeviceInfo>({ timeout: 5000 }), // per-action
  new BridgeClient({ timeout: 10_000 })); // global default
await getInfo.execute(undefined, { timeout: 2000 }); // per-call
```

`0` (the default) disables the timeout. Expiry rejects with `BridgeCallError` code `TIMEOUT`.

## Retry

```typescript
interface RetryConfig {
  maxAttempts: number; // additional attempts after the first
  delay: number; // ms between attempts
  exponentialBackoff?: boolean; // delay * 2^(attempt-1)
  retryIf?: (error: BridgeError) => boolean;
}
```

By default, **non-transient errors are not retried** — `VALIDATION_ERROR`, `HANDLER_NOT_FOUND`, `NATIVE_UNAVAILABLE`, and `NO_FALLBACK` are deterministic within a session (the adapter and fallback map are fixed at construction), so retrying can never succeed — and blindly retrying a non-idempotent action (a payment, say) is dangerous. `retryIf` takes over the decision completely when you need different rules:

```typescript
import { ERROR_CODE } from '@webview-ts/shared'; // also re-exported by every framework package

retry: {
  maxAttempts: 3,
  delay: 300,
  retryIf: (error) => error.code === ERROR_CODE.TIMEOUT || error.code === ERROR_CODE.NETWORK_ERROR,
}
```

`ERROR_CODE` is the runtime constant for every code (`TIMEOUT`, `NETWORK_ERROR`, `VALIDATION_ERROR`, …) — no hand-typed string literals; `error.code` is typed as the same union, so a typo is a compile error either way.

Every attempt (including the first) reports to the global `onError` with its `attempt` number.

## Aborting a call

`BridgeCallOptions.signal` takes a standard `AbortSignal`. Aborting rejects the **wait** with `ERROR_CODE.ABORTED`, cleans up the pending callback, and never retries — the host-side work is not cancelled (it is already executing), the same way fetch's signal drops the connection without un-running the server handler.

```typescript
const controller = new AbortController();
const promise = search.execute({ q }, { signal: controller.signal });
// user typed again — stop waiting for the stale call
controller.abort();
```

Consecutive `execute()` calls are also **latest-wins** at the state level: a stale response arriving out of order never overwrites a newer result (each caller still receives its own result).

## Cache

```typescript
getInfo: action<void, DeviceInfo>({ cache: 60_000 }),  // ms TTL
listCountries: action<void, Country[]>({ cache: true }), // indefinite
```

Cache is keyed by the serialized payload and **shared per action across the whole bridge** — two components using the same cached action hit the cache instead of each calling the host independently.

Invalidation is deliberately shared too:

- `reset()` clears the action's cache (for every consumer) and resets that handle's state.
- `invalidateCache()` clears the cache without touching state — use after a mutation.

:::note
The first `cache` declaration for an action wins its TTL; later mounts with a different TTL reuse the same store.
:::
