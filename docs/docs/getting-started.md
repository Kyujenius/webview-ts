---
sidebar_position: 2
title: Getting Started
---

# Getting Started

This walkthrough sets up the most common pairing: a React web app inside a React Native WebView. The same contract works for [Vue](./platforms/vue) clients and [iframe](./platforms/iframe) hosts.

## 1. Install

```bash
# Web (React)
pnpm add @webview-ts/react

# Host (React Native)
pnpm add @webview-ts/react-native
```

## 2. Define a plugin

The contract lives in a neutral file both sides import — a shared package in multi-repo setups, a shared folder in a monorepo.

```typescript title="plugins/camera.ts"
import { action, definePlugin } from '@webview-ts/shared';
// (also re-exported from @webview-ts/react, @webview-ts/vue, @webview-ts/react-native)

interface TakePhotoPayload {
  quality?: number;
}

interface TakePhotoResponse {
  uri: string;
  width: number;
  height: number;
}

export const camera = definePlugin('camera', {
  takePhoto: action<TakePhotoPayload, TakePhotoResponse>(),
}).withFallback({
  // Browser dev without a host — returns mock data
  takePhoto: async () => ({
    uri: 'https://picsum.photos/400/300',
    width: 400,
    height: 300,
  }),
});
```

## 3. Set up the bridge (web)

```typescript title="bridge.ts"
import { createBridgeReact } from '@webview-ts/react';
import { camera } from './plugins/camera';

export const { BridgeProvider, useBridge, usePlugin } = createBridgeReact({
  plugins: [camera],
});
```

## 4. Use in components

```tsx title="PhotoButton.tsx"
import { camera } from './plugins/camera';
import { usePlugin } from './bridge';

function PhotoButton() {
  const { takePhoto } = usePlugin(camera);

  const handlePress = async () => {
    const result = await takePhoto.execute({ quality: 0.9 });
    //    ^? { uri: string; width: number; height: number }
    console.log('Photo:', result.uri);
  };

  return <button onClick={handlePress}>Take Photo</button>;
}
```

`usePlugin` also exposes live state per action — `status`, `data`, `error`, `isLoading` — see [React](./platforms/react).

## 5. Handle on the host (React Native)

```tsx title="WebViewScreen.tsx"
import { WebView } from 'react-native-webview';
import { useBridgeHost } from '@webview-ts/react-native';
import { camera } from './plugins/camera';

function WebViewScreen() {
  const { webViewProps } = useBridgeHost({
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

That's the whole loop: the web side calls `takePhoto.execute`, the payload crosses the WebView boundary as a JSON string, the typed host handler runs, and the response resolves the original promise — with the response type inferred end to end.

## Where to go next

- [The contract](./core-concepts/contract) — everything `definePlugin` can express
- [Schema validation](./guides/schema-validation) — runtime validation with zod/valibot/arktype
- [Fallback mode](./guides/fallback-mode) — develop in the browser without a host
- [Architecture](./core-concepts/architecture) — how a call actually travels
