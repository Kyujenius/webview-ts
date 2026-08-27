---
sidebar_position: 10
title: Patterns
---

# Patterns

Five principles that keep bridge-based apps robust. Each one exists because the alternative fails in a specific, predictable way.

## Events notify — actions own state

Events are **best-effort**: one sent while the page is still loading, or during a reload, is gone. That's fine for what events are for — continuous notifications (`location.updated`, `themeChanged`) where the next value supersedes the lost one.

What breaks is using an event to deliver _state once_. Pull state with an action first, then subscribe for changes:

```typescript
// ✅ pull, then subscribe
const theme = await bridge.call('shell.getTheme');
bridge.on('shell.themeChanged', applyTheme);

// ❌ hope the initial themeChanged event arrived before this component mounted
```

If losing a specific event would break your app, it wasn't an event — it was state.

## When the host needs an answer: ask with an event, receive an action

The protocol is deliberately asymmetric: only the client awaits responses. A WebView page can reload or navigate away at any moment, so host code that _blocks_ on a web answer is structurally fragile. When the host genuinely needs to ask (native back button: "safe to leave?"), make the question an event and the answer an action:

```typescript
// Host
sendEvent('nav.backRequested', {});
// ...and register a handler for the answer:
'nav.confirmBack': async ({ allow }) => { if (allow) navigation.goBack(); }

// Client
bridge.on('nav.backRequested', async () => {
  const allow = !hasUnsavedChanges();
  await bridge.call('nav.confirmBack', { allow });
});
```

No answer arriving is a legitimate outcome (the page died) — the host's default behavior should already handle it.

## Domain failures are responses, not errors

The error channel (`BridgeCallError`, `ERROR_CODE`) is reserved for **infrastructure** failures: timeout, validation, transport. A failure your contract _anticipates_ — insufficient balance, out of stock — belongs in the response type:

```typescript
pay: action<
  { amount: number },
  { ok: true; txId: string } | { ok: false; reason: 'INSUFFICIENT_BALANCE' | 'LIMIT_EXCEEDED' }
>(),
```

Three things come free: exhaustive typed branching on `reason`, schema validation of failure shapes, and — critically — **retry never touches it** (a domain failure is a _successful_ response; retrying `INSUFFICIENT_BALANCE` three times helps no one).

## The bridge is a control plane — pass references, not data

The channel is a JSON string; there is no binary path. A base64 photo is a multi-megabyte string serialized, posted, and parsed on the main thread. Keep large payloads off the bridge entirely: the host writes to a file/cache and sends the **URI**; the WebView loads it through its own networking, which is built for exactly that.

```typescript
takePhoto: action<{ quality?: number }, { uri: string; width: number; height: number }>(),
//                                        ^ a reference, not the bytes
```

Rule of thumb: payloads beyond a few tens of KB should become references.

## Nested embeds relay explicitly

A page can be a client (inside a WebView) and a host (of iframes) at once. When an embedded widget needs a native capability, the middle page **relays by hand**:

```typescript
// The middle page: iframe-facing host handler calls its own native-facing client
widgetHost.registerPlugin(
  widgetCamera.host({
    takePhoto: (payload) => nativeBridge.call('camera.takePhoto', payload),
  })
);
```

The one extra line is not boilerplate — it's a **security gate**. Each boundary declares its own contract, so the surface exposed to a third-party widget is a deliberate subset of the native surface, and the relay point is where you filter payloads or inject consent checks. There is intentionally no automatic proxy: automatic forwarding would be automatic privilege passthrough.
