# ts-bridge

Type-safe WebView <-> Native bridge for TypeScript

---

## Features

- **Type Safety** -- End-to-end type inference from action definition to UI. Payloads, responses, and plugin methods are all checked at compile time.
- **DevTools** -- Real-time message inspector for bridge traffic, inspired by TanStack Query DevTools.
- **Zero Dependencies** -- Pure TypeScript core with no runtime dependencies.

## Quick Start

### 1. Install

```bash
pnpm add @webview-ts/core @webview-ts/react @webview-ts/shared @webview-ts/native
```

### 2. Define Actions

```typescript
// shared/camera-plugin.ts
import { definePlugin } from '@webview-ts/shared';

export type CameraActions = {
  'camera.takePhoto': {
    payload: { quality?: number };
    response: { uri: string; width: number; height: number };
  };
};

export const camera = definePlugin<CameraActions>()({
  name: 'camera',
  methods: (call) => ({
    takePhoto: (opts?: { quality?: number }) => call('camera.takePhoto', opts ?? {}),
  }),
});
```

### 3. Create the Bridge (Web)

```typescript
// web/bridge.ts
import { createBridgeReact } from '@webview-ts/react';
import { camera } from '../shared/camera-plugin';

export const { BridgeProvider, useBridge, usePlugin } = createBridgeReact({
  plugins: [camera],
});
```

### 4. Use in React Components

```tsx
// web/PhotoButton.tsx
import { usePlugin } from './bridge';
import { camera } from '../shared/camera-plugin';

function PhotoButton() {
  const { takePhoto } = usePlugin(camera);

  const handlePress = async () => {
    const { uri, width, height } = await takePhoto({ quality: 0.9 });
    //      ^? string  ^? number  ^? number
    console.log('Photo taken:', uri);
  };

  return <button onClick={handlePress}>Take Photo</button>;
}
```

### 5. Set Up Host (React Native)

```tsx
// native/WebViewScreen.tsx
import { WebView } from 'react-native-webview';
import { useBridgeHost } from '@webview-ts/native';
import { camera } from '../shared/camera-plugin';

function WebViewScreen() {
  const { webViewProps } = useBridgeHost({
    plugins: [
      camera.host({
        'camera.takePhoto': async ({ quality }) => {
          const photo = await NativeCamera.take({ quality });
          return { uri: photo.uri, width: photo.width, height: photo.height };
        },
      }),
    ],
  });

  return <WebView {...webViewProps} source={{ uri: 'https://your-app.com' }} />;
}
```

## Architecture

```mermaid
graph LR
    Web["Web (React)"] -->|"bridge.call()"| Bridge["@webview-ts/core"]
    Bridge -->|"postMessage"| Native["React Native Host"]
    Native -->|"response"| Bridge
    Bridge -->|"typed data"| Web
```

## Packages

| Package               | Description                            |
| --------------------- | -------------------------------------- |
| `@webview-ts/core`     | Web-side bridge engine                 |
| `@webview-ts/shared`   | Shared types and contracts (zero deps) |
| `@webview-ts/react`    | React hooks and provider               |
| `@webview-ts/native`   | React Native host                      |
| `@webview-ts/devtools` | Visual debugging panel                 |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start dev mode (watch)
pnpm dev
```

## Links

- [Contributing](./CONTRIBUTING.md)

## License

MIT
