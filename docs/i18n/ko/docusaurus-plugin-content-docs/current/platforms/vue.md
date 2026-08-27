---
sidebar_position: 2
title: Vue
---

# Vue

`@webview-ts/vue`는 React 패키지와 같은 API를 Vue 3 플러그인 + 컴포저블로 제공합니다. 두 패키지가 같은 공유 상태 기계를 구독하므로 동작도 같습니다.

## 셋업

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

각 액션 핸들은 React와 같은 필드를 `Ref`로 감싸 반응형으로 노출합니다:

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
  //    ^? 계약에서 타입 추론됨
}
</script>

<template>
  <button :disabled="takePhoto.isLoading.value" @click="shoot">Take Photo</button>
  <img v-if="takePhoto.data.value" :src="takePhoto.data.value.uri" />
</template>
```

타입 이벤트 구독은 짧은 이름을 쓰고, scope가 dispose될 때 알아서 정리됩니다:

```typescript
const { on } = usePlugin(location);
on('updated', (pos) => {
  position.value = pos;
});
```

## 호스트 역할 — Vue 페이지가 iframe 쉘일 때

**웹은 host이자 client, 두 가지로 볼 수 있습니다.** Vue 앱도 `useBridgeHost` 컴포저블로 iframe들을 호스팅할 수 있습니다 — 같은 중립 core 팩토리에, 전송만 어댑터로 주입합니다:

```typescript
import { useBridgeHost, IframeHostAdapter } from '@webview-ts/vue';
import { shell } from './plugins';

const { sendEvent } = useBridgeHost({
  adapter: new IframeHostAdapter(frameEl, CHILD_ORIGIN),
  plugins: [shell.host(handlers)],
});
```

정리는 scope dispose 때 알아서 됩니다. 전체 패턴은 [Iframe 임베드](./iframe)를 참고하세요.

## `useAction` / `useEvent`

[React](./react) 쪽과 같은 동작이고, 상태가 `Ref`로 감싸진다는 점만 다릅니다.
