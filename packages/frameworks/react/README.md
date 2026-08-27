# @webview-ts/react

![npm](https://img.shields.io/npm/v/@webview-ts/react)

React hooks and provider for the [@webview-ts](https://github.com/Kyujenius/webview-ts) WebView bridge.

## Installation

```bash
npm install @webview-ts/react
```

**Peer dependencies:** `react >=18.0.0`

**Dependencies:** `@webview-ts/core`, `@webview-ts/shared`

## Quick Start

### 1. Create typed hooks

```typescript
// src/bridge.ts
import { createBridgeReact } from '@webview-ts/react';
import { camera, storage, location } from '@example/plugins';
import { cameraFallback, storageFallback } from '@example/plugins';

export const { BridgeProvider, useBridge, useAction, useEvent, usePlugin } = createBridgeReact({
  plugins: [camera, storage, location],
  config: {
    timeout: 5000,
    fallback: { ...cameraFallback, ...storageFallback },
  },
});
```

### 2. Wrap your app with BridgeProvider

```tsx
import { BridgeProvider } from './bridge';

function Root() {
  return (
    <BridgeProvider>
      <App />
    </BridgeProvider>
  );
}
```

### 3. Use hooks in your components

```tsx
import { usePlugin, useEvent } from './bridge';
import { camera } from '@example/plugins';

function CameraScreen() {
  const { takePhoto } = usePlugin(camera);

  const handleCapture = async () => {
    const result = await takePhoto({ quality: 0.8 });
    console.log(result.uri);
  };

  useEvent('location.updated', (pos) => {
    console.log(pos.latitude, pos.longitude);
  });

  return <button onClick={handleCapture}>Take Photo</button>;
}
```

## API

### `createBridgeReact(options)`

Creates a set of typed hooks bound to your plugin definitions. Returns `{ BridgeProvider, useBridge, useAction, useEvent, usePlugin }`.

### `BridgeProvider`

Context provider that initializes the bridge instance. Must wrap your application at the top level.

```tsx
<BridgeProvider>
  <App />
</BridgeProvider>
```

### `usePlugin(plugin)`

Returns auto-generated typed methods from a plugin definition.

```typescript
const { takePhoto, pickImage } = usePlugin(camera);
const result = await takePhoto({ quality: 0.8 });
// result is typed as { uri: string; width: number; height: number }
```

### `useAction(actionName)`

Lower-level hook for individual actions. Provides loading and error state.

```typescript
const { execute, data, loading, error } = useAction('camera.takePhoto');
await execute({ quality: 0.8 });
```

### `useEvent(eventName, handler)`

Subscribe to native-to-web push events. The subscription is automatically cleaned up on unmount.

```typescript
useEvent<{ latitude: number; longitude: number }>('location.updated', (pos) => {
  console.log(pos.latitude, pos.longitude);
});
```

### `useBridge()`

Access the raw bridge instance for advanced use cases.

```typescript
const bridge = useBridge();
```

## License

MIT
