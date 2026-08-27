---
sidebar_position: 2
title: Vue
---

# Vue

`@webview-ts/vue` provides the same surface as the React binding, as a Vue 3 plugin plus composables. Both bindings subscribe to the same shared state machines — behavior is identical.

## Setup

```typescript title="bridge.ts"
import { createBridgeVue } from '@webview-ts/vue';
import { camera, location } from './plugins';

export const bridge = createBridgeVue({
  plugins: [camera, location],
});
```

```typescript title="main.ts"
import { createApp } from 'vue';

createApp(App).use(bridge).mount('#app');
```

## `usePlugin`

Each action handle exposes the same fields as React, wrapped in `Ref`s for reactivity:

```vue
<script setup lang="ts">
import { usePlugin } from '@webview-ts/vue';
import { camera } from './plugins';

const { takePhoto } = usePlugin(camera);
// takePhoto.status    → Ref<'idle' | 'loading' | 'success' | 'error'>
// takePhoto.data      → Ref<Response | null>
// takePhoto.error     → Ref<BridgeCallError | null>
// takePhoto.isLoading → Ref<boolean>

async function shoot() {
  const result = await takePhoto.execute({ quality: 0.9 });
  //    ^? typed from the contract
}
</script>

<template>
  <button :disabled="takePhoto.isLoading.value" @click="shoot">Take Photo</button>
  <img v-if="takePhoto.data.value" :src="takePhoto.data.value.uri" />
</template>
```

Typed event subscription uses short names, with automatic cleanup on scope dispose:

```typescript
const { on } = usePlugin(location);
on('updated', (pos) => {
  position.value = pos;
});
```

## The host role — a Vue page as an iframe shell

**The web is always both.** A Vue app can host embedded iframes with the `useBridgeHost` composable — same neutral core factory, transport injected:

```typescript
import { useBridgeHost, IframeHostAdapter } from '@webview-ts/vue';
import { shell } from './plugins';

const { sendEvent } = useBridgeHost({
  adapter: new IframeHostAdapter(frameEl, CHILD_ORIGIN),
  plugins: [shell.host(handlers)],
});
```

Teardown happens automatically on scope dispose. See [Iframe embeds](./iframe) for the full pattern.

## `useAction` / `useEvent`

Same semantics as the [React](./react) equivalents, with `Ref`-wrapped state.
