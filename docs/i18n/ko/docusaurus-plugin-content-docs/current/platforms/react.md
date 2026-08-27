---
sidebar_position: 1
title: React
---

# React

`@webview-ts/react`는 브릿지를 프로바이더와 훅으로 감쌉니다. `createBridgeReact`에 넘긴 플러그인에서 모든 타입이 나옵니다.

## 셋업

```typescript title="bridge.ts"
import { createBridgeReact } from '@webview-ts/react';
import { camera, location } from './plugins';

export const { BridgeProvider, useBridge, usePlugin, useAction, useEvent } = createBridgeReact({
  plugins: [camera, location],
  config: { timeout: 10_000 },
  interceptors: { request: [authInterceptor] },
});
```

```tsx title="main.tsx"
<BridgeProvider>
  <App />
</BridgeProvider>
```

Strict Mode도 문제없습니다. 프로바이더가 인스턴스 생성(`useMemo`)과 부수효과(`useEffect`)를 분리해 두어서, 이중 호출로 리스너가 새거나 DevTools 연결이 중복되지 않습니다.

## `usePlugin` — 액션마다 핸들 하나

```tsx
const { takePhoto } = usePlugin(camera);

takePhoto.execute({ quality: 0.9 }); // 타입 페이로드 → 타입 Promise
takePhoto.status; // 'idle' | 'loading' | 'success' | 'error'
takePhoto.data; // response | null
takePhoto.error; // BridgeCallError | null
takePhoto.isLoading; // boolean
takePhoto.reset(); // 상태 리셋 + 이 액션의 캐시 무효화
```

짧은 이름을 쓰는 타입 이벤트 구독도 같이 나옵니다:

```tsx
const { on } = usePlugin(location);
useEffect(() => on('updated', (pos) => setPosition(pos)), []);
```

## `useAction` — 풀 네임으로 액션 하나

```tsx
const info = useAction('device.getInfo', { cache: 60_000 });
```

액션 이름은 정확해야 합니다. 선언에 없는 이름은 컴파일 에러입니다.

## `useEvent` — 이벤트 하나 구독

```tsx
useEvent('location.updated', (pos) => setPosition(pos));
```

구독 수명은 컴포넌트를 따라가고, 해지는 자동입니다.

## `useBridge` — 탈출구

```tsx
const { call, on, off, isAvailable, connectionMode, bridge } = useBridge();
```

`call`은 `usePlugin`과 같은 키/페이로드/응답 추론을 유지합니다. `bridge`는 고급 용도(전역 인터셉터, `onCall` 텔레메트리)를 위한 하부 `BridgeClient`입니다.

## 호스트 역할 — React 페이지가 iframe 쉘일 때

**웹은 언제나 양쪽 다입니다.** WebView 안에서 클라이언트였던 그 React 앱이, iframe들을 임베드하는 *호스트*가 될 수도 있습니다. `useBridgeHost`는 중립 core 팩토리를 감싼 훅이고, 전송은 어댑터로 주입합니다:

```tsx
import { useBridgeHost, IframeHostAdapter, defineHandlers } from '@webview-ts/react';
import { shell } from './plugins';

function Shell({ frameRef }: { frameRef: HTMLIFrameElement }) {
  const { sendEvent } = useBridgeHost({
    adapter: new IframeHostAdapter(frameRef, CHILD_ORIGIN),
    plugins: [shell.host({ getUser: async () => user, showToast: async (p) => toast(p) })],
  });

  return <button onClick={() => sendEvent('shell.themeChanged', { theme: 'dark' })}>…</button>;
}
```

Strict Mode 처리도 클라이언트 쪽과 같습니다 — setup→cleanup→setup 사이클에서 깨끗하게 재부착됩니다. 멀티 프레임 라우팅까지 포함한 전체 패턴은 [Iframe 임베드](./iframe)를 참고하세요.

## 플러그인 없이 커스텀 액션

```typescript
type CustomActions = {
  'app.custom': { payload: { id: string }; response: { done: boolean } };
};

const { useAction } = createBridgeReact<CustomActions>({});
```
