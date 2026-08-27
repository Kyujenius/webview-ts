---
sidebar_position: 2
title: 시작하기
---

# 시작하기

가장 흔한 조합인 "React Native WebView 안의 React 웹 앱"으로 진행합니다. 같은 계약이 [Vue](./platforms/vue) 클라이언트와 [iframe](./platforms/iframe) 호스트에서도 그대로 돌아갑니다.

## 1. 설치

```bash
# 웹 (React)
pnpm add @webview-ts/react

# 호스트 (React Native)
pnpm add @webview-ts/react-native
```

## 2. 플러그인 정의

계약은 양쪽이 import하는 중립 파일에 둡니다. 레포가 나뉘어 있다면 공유 패키지, 모노레포라면 공유 폴더가 그 자리입니다.

```typescript title="plugins/camera.ts"
import { action, definePlugin } from '@webview-ts/shared';
// (@webview-ts/react, @webview-ts/vue, @webview-ts/react-native에서도 re-export됩니다)

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
  // 호스트 없는 브라우저 개발 — Mock 데이터를 반환
  takePhoto: async () => ({
    uri: 'https://picsum.photos/400/300',
    width: 400,
    height: 300,
  }),
});
```

## 3. 브릿지 셋업 (웹)

```typescript title="bridge.ts"
import { createBridgeReact } from '@webview-ts/react';
import { camera } from './plugins/camera';

export const { BridgeProvider, useBridge, usePlugin } = createBridgeReact({
  plugins: [camera],
});
```

## 4. 컴포넌트에서 사용

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

`usePlugin`은 액션별 라이브 상태 — `status`, `data`, `error`, `isLoading` — 도 함께 노출합니다. 자세한 건 [React](./platforms/react)에서 다룹니다.

## 5. 호스트에서 처리 (React Native)

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

한 사이클은 이게 전부입니다. 웹이 `takePhoto.execute`를 호출하면 페이로드가 JSON 문자열로 WebView 경계를 건너가고, 호스트 핸들러가 실행된 뒤 응답이 원래의 프로미스를 resolve합니다. 응답 타입은 끝에서 끝까지 추론됩니다.

## 다음으로 볼 것

- [계약](./core-concepts/contract) — `definePlugin`이 표현하는 모든 것
- [스키마 검증](./guides/schema-validation) — zod/valibot/arktype 런타임 검증
- [Fallback 모드](./guides/fallback-mode) — 호스트 없이 브라우저에서 개발하기
- [아키텍처](./core-concepts/architecture) — 호출 한 사이클이 실제로 지나가는 경로
