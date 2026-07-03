# @webview-ts/react-native

![npm](https://img.shields.io/npm/v/@webview-ts/react-native)

React Native host for `@webview-ts` -- receives messages from the WebView, executes handlers, and sends responses and events back.

## Installation

```bash
npm install @webview-ts/react-native @webview-ts/shared react-native-webview
```

## Quick Start with Plugins

```typescript
import { definePlugin, action } from '@webview-ts/shared';
import { useBridgeHost } from '@webview-ts/react-native';
import { WebView } from 'react-native-webview';

// Define plugin (shared with web side)
const camera = definePlugin('camera', {
  takePhoto: action<{ quality?: number }, { uri: string }>(),
});

function App() {
  const { webViewProps, sendEvent } = useBridgeHost({
    plugins: [
      camera.host({
        takePhoto: async (payload) => {
          // payload is typed as { quality?: number }
          const photo = await takeNativePhoto(payload.quality);
          return { uri: photo.uri };
        },
      }),
    ],
  });

  return <WebView {...webViewProps} source={{ uri: 'https://your-app.com' }} />;
}
```

## Direct Handlers (without plugins)

For ad-hoc actions that don't need a shared plugin definition:

```typescript
const { webViewProps, sendEvent } = useBridgeHost({
  handlers: {
    'device.getInfo': async () => ({
      platform: Platform.OS,
      version: String(Platform.Version),
    }),
    'storage.get': async (payload) => ({
      value: await AsyncStorage.getItem(payload.key),
    }),
  },
});
```

Use a generic for full type safety on direct handlers:

```typescript
type MyActions = {
  'device.getInfo': { payload: void; response: { platform: string; version: string } };
  'storage.get': { payload: { key: string }; response: { value: string | null } };
};

const { webViewProps } = useBridgeHost<MyActions>({
  handlers: {
    'device.getInfo': async () => ({ platform: Platform.OS, version: '1.0' }),
    'storage.get': async (payload) => ({ value: await AsyncStorage.getItem(payload.key) }),
  },
});
```

## Sending Events to Web

Push events from native to the web side:

```typescript
const { sendEvent } = useBridgeHost({ plugins: [cameraHost] });

// Send typed event
sendEvent('location.updated', {
  latitude: 37.7749,
  longitude: -122.4194,
});
```

## Mixing Plugins and Direct Handlers

```typescript
const { webViewProps } = useBridgeHost({
  plugins: [camera.host({ takePhoto: async (p) => ({ uri: '/photo.jpg' }) })],
  handlers: {
    'custom.action': async () => ({ ok: true }),
  },
});
```

Duplicate action names across plugins and handlers will throw at setup time.

## Host-side Middleware

The host supports the same Koa-style onion middleware as the web side:

```typescript
import { createLogger } from '@webview-ts/core';

const { webViewProps } = useBridgeHost({
  plugins: [cameraHost],
  middleware: [createLogger({ level: 'debug' })],
});
```

## Non-React Usage

Use `createBridgeHost` outside of React components:

```typescript
import { createBridgeHost } from '@webview-ts/react-native';

const { bridgeHost, webViewProps, sendEvent } = createBridgeHost({
  plugins: [cameraHost],
  config: { debug: true, timeout: 10000 },
});
```

## API

### `useBridgeHost<TActions>(options)`

React hook that creates and manages a bridge host. Handlers are captured on mount.

**Options:**

| Option       | Type                      | Description                                        |
| ------------ | ------------------------- | -------------------------------------------------- |
| `handlers`   | `TypedHandlers<TActions>` | Direct action handlers                             |
| `plugins`    | `HostPluginResult[]`      | Plugin host results from `plugin.host()`           |
| `middleware` | `Middleware[]`            | Koa-style middleware array                         |
| `config`     | `BridgeHostConfig`        | Host configuration (`debug`, `timeout`, `onError`) |

**Returns:**

| Property       | Type                       | Description              |
| -------------- | -------------------------- | ------------------------ |
| `webViewProps` | `{ onMessage, ref }`       | Spread onto `<WebView>`  |
| `sendEvent`    | `(event, payload) => void` | Push event to web side   |
| `bridgeHost`   | `BridgeHost`               | Direct access (advanced) |

### `createBridgeHost<TActions>(options)`

Pure function equivalent of `useBridgeHost`. Same options, same return shape plus `messageHandler`.

### `BridgeHost`

Lower-level class powering the host:

- `registerHandler(action, handler)` -- register an action handler
- `unregisterHandler(action)` -- remove a handler
- `sendEvent(event, payload)` -- send event to web
- `handleMessage(message)` -- process a `BridgeMessage`, returns `BridgeResponse`
- `use(middleware)` -- add middleware
- `destroy()` -- clean up

## License

MIT
