# @webview-ts/shared

![npm](https://img.shields.io/npm/v/@webview-ts/shared)

Shared types, type guards, and plugin primitives for the `@webview-ts` ecosystem.

## Installation

```bash
npm install @webview-ts/shared
```

## Plugin Definition

Define plugins with `definePlugin` and zero-runtime `action()` type markers:

```typescript
import { definePlugin, action } from '@webview-ts/shared';

const camera = definePlugin('camera', {
  takePhoto: action<{ quality?: number }, { uri: string; width: number; height: number }>(),
  pickImage: action<{ maxCount: number }, { images: string[] }>(),
});

// Runtime action name map
camera.actions.takePhoto; // 'camera.takePhoto'
camera.actions.pickImage; // 'camera.pickImage'

// Host handlers (React Native side) — uses short names
const cameraHost = camera.host({
  takePhoto: async (payload) => {
    return { uri: 'file:///photo.jpg', width: 1920, height: 1080 };
  },
  pickImage: async (payload) => {
    return { images: ['file:///img1.jpg'] };
  },
});
```

## Message Types

```typescript
import type { BridgeMessage, BridgeResponse, BridgeEvent } from '@webview-ts/shared';

const message: BridgeMessage<{ userId: string }> = {
  id: 'msg-1',
  action: 'user.get',
  payload: { userId: '123' },
  timestamp: Date.now(),
};

const response: BridgeResponse<{ name: string }> = {
  id: 'msg-1',
  success: true,
  data: { name: 'John' },
  timestamp: Date.now(),
};
```

## Runtime Validation

Zero-dependency type guards (no Zod required):

```typescript
import { isBridgeMessage, isBridgeResponse } from '@webview-ts/shared';

if (isBridgeMessage(unknownData)) {
  console.log(unknownData.action);
}

if (isBridgeResponse(unknownData)) {
  console.log(unknownData.success);
}
```

## Middleware Types

Koa-style onion middleware type definitions:

```typescript
import type { Middleware, MiddlewareFn, MiddlewareContext } from '@webview-ts/shared';

const myMiddleware: Middleware = {
  name: 'my-middleware',
  fn: async (ctx, next) => {
    // Request phase — before sending
    console.log('action:', ctx.request.action);

    await next();

    // Response phase — after receiving
    console.log('success:', ctx.response?.success);
  },
};
```

## API Overview

### Plugin Primitives

| Export | Description |
|---|---|
| `definePlugin(name, markers)` | Create a plugin with typed actions |
| `action<Payload, Response>()` | Zero-runtime type marker for an action |

### Key Types

| Type | Description |
|---|---|
| `PluginInstance` | Plugin object returned by `definePlugin` |
| `ActionMarker<P, R>` | Branded type marker carrying payload/response types |
| `HostPluginResult` | Return type of `plugin.host()` |
| `ShortHostHandlers<T>` | Host handler map with short action names |
| `BridgeMessage` | Request message (web to native) |
| `BridgeResponse` | Response message (native to web) |
| `BridgeEvent` | Event notification (native to web) |
| `BridgeConfig` | Bridge configuration options |
| `Middleware` | Named middleware (`{ name, fn }`) |
| `MiddlewareFn` | Koa-style middleware function |
| `MiddlewareContext` | Context shared across the request-response lifecycle |

## License

MIT
