# @webview-ts/vue

![npm](https://img.shields.io/npm/v/@webview-ts/vue)

Vue 3 composables for the [@webview-ts](https://github.com/Kyujenius/webview-ts) WebView bridge.

## Installation

```bash
npm install @webview-ts/vue
```

**Peer dependencies:** `vue >=3.3.0`

**Dependencies:** `@webview-ts/core`, `@webview-ts/shared`

## Quick Start

### 1. Create the bridge plugin

```typescript
// src/bridge.ts
import { createBridgeVue } from '@webview-ts/vue';
import { camera, storage, location } from '@example/plugins';
import { cameraFallback, storageFallback } from '@example/plugins';

export const bridge = createBridgeVue({
  plugins: [camera, storage, location],
  config: {
    timeout: 5000,
    fallback: { ...cameraFallback, ...storageFallback },
  },
});

export const { useBridge, useAction, useEvent, usePlugin } = bridge;
```

### 2. Install it on your app

```typescript
import { createApp } from 'vue';
import { bridge } from './bridge';
import App from './App.vue';

createApp(App).use(bridge).mount('#app');
```

### 3. Use composables in components

```vue
<script setup lang="ts">
import { camera } from '@example/plugins';
import { usePlugin } from '../bridge';

const { takePhoto } = usePlugin(camera);
</script>

<template>
  <button @click="takePhoto.execute({ quality: 0.8 })" :disabled="takePhoto.isLoading.value">
    {{ takePhoto.isLoading.value ? 'Loading...' : 'Take photo' }}
  </button>
</template>
```

## The web can also be the host

A Vue page can host other clients (e.g. iframes) with `useBridgeHost`:

```typescript
import { IframeHostAdapter, useBridgeHost } from '@webview-ts/vue';
import { shell } from './plugins';

const { sendEvent } = useBridgeHost({
  adapter: new IframeHostAdapter(iframeEl, 'https://child.example.com'),
  plugins: [shell.host({ getTheme: async () => currentTheme.value })],
});
```

## Documentation

Full docs: https://kyujenius.github.io/webview-ts/

## License

MIT
