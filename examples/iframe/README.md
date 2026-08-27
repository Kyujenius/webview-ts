# Iframe embed example

The same bridge, no native code: the **parent page is the host** (one `BridgeHost` + `IframeHostAdapter` per iframe, shared `ConnectionRegistry`) and each **iframe is a client** (`BridgeClient` + `IframeClientAdapter`).

```bash
pnpm --filter @example/iframe dev   # http://localhost:5177
```

## What this is (and isn't)

This is the **iframe-isolation integration style**: each frame is a separate window/JS context, independently bundled and deployed (cross-origin works — that's what the adapters' origin parameters are for), and the only channel between them is string `postMessage`. That hard boundary is exactly the condition under which webview-ts applies.

It is **not** Module Federation-style micro-frontend composition. There, remote bundles are loaded into the _same_ JS context — window and heap are shared, modules import each other directly, and there is no message boundary for a bridge to type. If your MFE architecture is MF/single-spa-style, you don't need webview-ts between remotes.

Where iframe isolation is chosen deliberately — payment widgets, third-party/partner embeds, security boundaries, embedding a legacy app — this example is the template.

## What it demonstrates

- **Adapter pair = platform** — the iframe adapters ship in `@webview-ts/core` (`IframeClientAdapter` / `IframeHostAdapter`, ~40 lines each); the client side plugs in via `BridgeConfig.adapter`, the host side via `createBridgeHost({ adapter })`. A custom platform is the same shape — see the custom-adapters docs.
- **Contract-first, transport-agnostic** — `src/plugins.ts` is the same `definePlugin` contract the mobile examples use; typed calls (`shell.getUser`) and events (`shell.themeChanged`) flow through `window.postMessage` instead of a WebView channel.
- **Multi-frame routing** — "Broadcast theme toggle" reaches both frames via `TARGET.BROADCAST`; "Ping frame-B only" targets one frame through the registry while the other stays silent.
- **Fallback mode** — open [`/child.html`](http://localhost:5177/child.html) directly (no shell) and the plugin's mocks take over, exactly like browser-only development against a native app.
- **Origin/source checks** — both adapters verify `event.origin` and `event.source`, so two frames' traffic can't cross and foreign frames can't spoof bridge messages.
