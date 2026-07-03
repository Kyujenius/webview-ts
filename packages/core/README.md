# @webview-ts/core

![npm](https://img.shields.io/npm/v/@webview-ts/core)

Core bridge engine for web-side WebView-to-Native communication.

## Installation

```bash
npm install @webview-ts/core @webview-ts/shared
```

## Quick Start

```typescript
import { createBridge } from '@webview-ts/core';
import { definePlugin, action } from '@webview-ts/shared';

// Define plugins
const camera = definePlugin('camera', {
  takePhoto: action<{ quality?: number }, { uri: string }>(),
});

// Create a typed bridge
const bridge = createBridge<typeof camera._actionMap>({
  timeout: 5000,
  debug: true,
});

// Type-safe call — payload and return type are inferred
const result = await bridge.call('camera.takePhoto', { quality: 0.8 });
// result is typed as { uri: string }
```

## Middleware

Koa-style onion middleware -- code before `next()` runs on request, code after runs on response:

```typescript
import { createBridge, createLogger, createValidator } from '@webview-ts/core';

const bridge = createBridge();

// Built-in logger
bridge.use(createLogger({ level: 'debug', includePayload: true }));

// Built-in validator
bridge.use(createValidator({ validateRequests: true, validateResponses: true }));

// Custom middleware
bridge.use({
  name: 'timing',
  fn: async (ctx, next) => {
    const start = Date.now();
    await next();
    console.log(`${ctx.request.action} took ${Date.now() - start}ms`);
  },
});
```

## Events

Subscribe to native-initiated events pushed from the host:

```typescript
const unsubscribe = bridge.on<{ latitude: number; longitude: number }>(
  'location.updated',
  (pos) => {
    console.log(pos.latitude, pos.longitude);
  }
);

// Clean up
unsubscribe();
```

## FallbackAdapter

When no native bridge is detected (e.g., during local development in a browser), you can provide fallback handlers:

```typescript
const bridge = createBridge({
  fallback: {
    'camera.takePhoto': (payload) => ({ uri: '/mock-photo.jpg' }),
    'storage.get': (payload) => ({ value: localStorage.getItem(payload.key) }),
  },
});
```

Pass `fallback: true` to log all calls without handlers:

```typescript
const bridge = createBridge({ fallback: true });
```

## Retry and Error Handling

```typescript
const bridge = createBridge({
  retry: { maxAttempts: 3, delay: 1000, exponentialBackoff: true },
  onError: (error, context) => {
    console.error(`[${context.action}] attempt ${context.attempt}:`, error.message);
  },
});
```

## API

### `createBridge<TActions>(config?)`

Creates a `BridgeManager` instance.

**Config:**

| Option                  | Type                       | Default | Description                                   |
| ----------------------- | -------------------------- | ------- | --------------------------------------------- |
| `timeout`               | `number`                   | `30000` | Default timeout (ms)                          |
| `debug`                 | `boolean`                  | `false` | Enable debug logging                          |
| `maxConcurrentRequests` | `number`                   | `100`   | Max concurrent requests                       |
| `enableDeduplication`   | `boolean`                  | `true`  | Deduplicate identical requests                |
| `retry`                 | `RetryConfig`              | --      | Retry configuration                           |
| `fallback`              | `true \| FallbackMap`      | --      | Fallback handlers for non-native environments |
| `onError`               | `(error, context) => void` | --      | Global error handler                          |

### `bridge.call(action, payload?, options?)`

Call a native action. Returns a `Promise` with the typed response.

### `bridge.on(event, handler)`

Subscribe to native events. Returns an unsubscribe function.

### `bridge.use(middleware)`

Add a `{ name, fn }` middleware to the onion pipeline.

### `bridge.isAvailable()`

Check if the native bridge adapter is available.

### `bridge.destroy()`

Clean up all listeners, callbacks, and middleware.

### Built-in Middleware

| Factory                     | Description                                            |
| --------------------------- | ------------------------------------------------------ |
| `createLogger(options?)`    | Log requests, responses, and errors                    |
| `createValidator(options?)` | Validate message structure before send / after receive |

## Platform Adapters

The bridge auto-detects the native platform:

- **iOS** -- `webkit.messageHandlers.tsBridge`
- **Android** -- `window.AndroidBridge`
- **Web** -- `FallbackAdapter` (when `fallback` config is provided)

## License

MIT
