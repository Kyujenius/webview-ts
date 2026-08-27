---
sidebar_position: 7
title: Security
---

# Security

The bridge channel is a string channel — anything that can post a string shaped like a bridge message is a potential spoofing vector. webview-ts ships several protections by default.

## Message spoofing protection

Host-injected messages are synthetic events with no `source` window. A real `postMessage` from an iframe or parent window always carries `source` — the client **drops those by default**, so a third-party iframe on your page cannot forge bridge responses or events.

To _deliberately_ accept messages from specific windows (e.g. a trusted same-team iframe speaking the bridge protocol), allowlist their origins:

```typescript
const bridge = new BridgeClient({
  allowedOrigins: ['https://widgets.your-company.com'],
});
```

This is not CORS — it's a `postMessage` origin allowlist. The primary host channel carries no origin and always passes; the allowlist only governs window-sourced messages.

## Unforgeable message ids

Responses are matched to requests by message id. Ids are generated with Web Crypto (`crypto.getRandomValues`, 64 bits of randomness), so spoofing a response requires guessing an unpredictable id — not just observing a counter.

## No stack traces on the wire

When a host handler throws, the error's `message` and `code` cross the boundary — **stack traces never do**. Host internals stay on the host; the full error object still reaches the host-side `onError` for local logging.

## Adapter-level checks

Transport-level filtering lives in the adapters, where the transport knowledge is:

- The React Native client adapter applies the source/origin policy on its `window`/`document` listeners.
- The [iframe example](../platforms/iframe)'s adapters verify both `event.origin` and `event.source`, so two frames' traffic can't cross and foreign frames can't inject messages.

When you write a [custom adapter](../platforms/custom-adapters), apply the same discipline: verify the sender before delivering a string to the engine.

## Validation as a security layer

Schema validation at the receiving boundary means malformed or unexpected payloads never reach your handler code — see [Schema validation](./schema-validation).
