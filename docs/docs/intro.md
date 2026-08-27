---
sidebar_position: 1
slug: /
title: Introduction
---

# webview-ts

**Type-safe WebView ↔ Host bridge for TypeScript.**

`postMessage` is the only way embedded web content and its host talk. But it's just strings — no types, no request-response matching, no runtime guarantees.

webview-ts turns `postMessage` into typed, validated function calls. Define a plugin once in a neutral contract file — both sides compile against it, and (optionally) validate against it at runtime.

```typescript
// One contract file, shared by both sides
export const camera = definePlugin('camera', {
  takePhoto: action<{ quality?: number }, { uri: string }>(),
});

// Web: fully typed call
const { uri } = await takePhoto.execute({ quality: 0.9 });

// Host: fully typed handler
camera.host({
  takePhoto: async ({ quality }) => ({ uri: await shoot(quality) }),
});
```

## Who it's for

webview-ts targets **TypeScript hosts** — any environment where a JS runtime embeds web content and can pass strings both ways:

- **React Native** apps embedding WebViews (`@webview-ts/react-native`)
- **Parent pages** embedding iframes — payment widgets, partner embeds, legacy-app integration (see [iframe embeds](./platforms/iframe))
- **NativeScript, Lynx, …** — one adapter pair per platform (see [custom adapters](./platforms/custom-adapters))

:::tip Roles are not tied to platforms
**The web is always both.** A web page is a _client_ when something embeds it (a WebView, an iframe) and a _host_ when it embeds others (an iframe shell) — a page in the middle of a nesting is both at once. That's why `@webview-ts/react` and `@webview-ts/vue` ship a host hook alongside their client hooks.
:::

Native Swift/Kotlin shells are _not_ a target. Environments without a JS host are served by the contract instead: [`webview-ts schema export`](./guides/contract-export) turns your plugins into versioned JSON Schema files for cross-language codegen.

## How it compares

|                                    | webview-ts                     | Comlink        | Capacitor         |
| ---------------------------------- | ------------------------------ | -------------- | ----------------- |
| Type safety                        | ✅ contract-first              | ✅ proxy-based | ✅ plugin API     |
| Source of truth                    | Neutral plugin file            | Exposed object | Plugin definition |
| Browser-only dev                   | ✅ per-plugin fallback mocks   | ❌             | ✅ (web impl)     |
| Per-action timeout/retry/cache     | ✅ declared in the contract    | ❌             | ❌                |
| Runtime validation at the boundary | ✅ optional per-action schemas | ❌             | ❌                |
| Multi-WebView routing              | ✅ target / broadcast          | ❌             | —                 |
| Scope                              | Typed transport layer          | Worker RPC     | Full app runtime  |

The defining choice: the **contract file is the source of truth** — both sides compile against it independently, and web development starts with fallback mocks before any host code exists.

## Design principles

- **Contract-first** — one `definePlugin` call generates typed client hooks, host handlers, mocks, and JSON Schema.
- **Zero dependencies** — `@webview-ts/shared` has no runtime deps; core is pure TypeScript.
- **Layered** — frameworks → core → shared, one direction only, enforced by lint rules and type tests.
- **Transport-agnostic** — the engine never touches a platform API; adapters own every platform quirk.
- **Roles over platforms** — client/host are protocol roles, not package boundaries. Every platform package exports each role it can play.
