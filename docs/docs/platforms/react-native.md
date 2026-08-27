---
sidebar_position: 3
title: React Native
---

# React Native

`@webview-ts/react-native` is the host side for apps embedding `react-native-webview`.

## `useBridgeHost`

```tsx
import { WebView } from 'react-native-webview';
import { useBridgeHost } from '@webview-ts/react-native';
import { camera } from './plugins/camera';

function WebViewScreen() {
  const { webViewProps, sendEvent, bridgeHost, sourceId } = useBridgeHost({
    plugins: [
      camera.host({
        takePhoto: async ({ quality }) => {
          const photo = await NativeCamera.take({ quality });
          return { uri: photo.uri, width: photo.width, height: photo.height };
        },
      }),
    ],
  });

  return <WebView {...webViewProps} source={{ uri: 'https://your-app.com' }} />;
}
```

`webViewProps` wires `onMessage` and `ref` — spread it onto the WebView and the transport is connected.

## Direct handlers

Without plugins, pass an `ActionMap` type for full inference:

```tsx
type MyActions = {
  'storage.get': { payload: { key: string }; response: { value: string | null } };
};

const { webViewProps } = useBridgeHost<MyActions>({
  handlers: {
    'storage.get': async ({ key }) => ({ value: await AsyncStorage.getItem(key) }),
  },
});
```

Every declared action must be implemented, payloads and responses are checked, and duplicate action names (across handlers and plugins) throw at setup.

## Mixing direct handlers and plugins

TypeScript type arguments are all-or-nothing: `useBridgeHost<MyActions>({ plugins })` disables inference of the plugins tuple, silently untyping `sendEvent`. Wrap direct handlers with `defineHandlers` instead — both sides stay inferred:

```tsx
import { defineHandlers, useBridgeHost } from '@webview-ts/react-native';

const { sendEvent } = useBridgeHost({
  handlers: defineHandlers<MyActions>({
    'storage.get': async ({ key }) => ({ value: await AsyncStorage.getItem(key) }),
  }),
  plugins: [location.host(locationHandlers)], // sendEvent stays typed
});
```

## Sending events

`sendEvent` is typed against the plugin event map ([open set](../guides/events)):

```tsx
sendEvent('location.updated', { lat, lng });
```

For multiple WebViews and targeted/broadcast delivery, see [Multi-WebView routing](../guides/multi-webview-routing).

## Platform quirks, handled

Two things the adapter absorbs so you don't have to:

- **iOS vs Android delivery** — react-native-webview delivers host→web messages on `window` (iOS) or `document` (Android, non-bubbling). The client adapter listens on both.
- **Mount races** — messages sent before the WebView ref is attached are queued and flushed on attach, instead of being silently dropped.

## Outside React

`createBridgeHost` is the pure-function version of the hook — same options, usable in any JS host context without React.
