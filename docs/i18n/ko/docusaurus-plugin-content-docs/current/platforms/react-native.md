---
sidebar_position: 3
title: React Native
---

# React Native

`@webview-ts/react-native`는 `react-native-webview`를 임베드하는 앱의 호스트 쪽입니다.

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

`webViewProps`가 `onMessage`와 `ref`를 이어 줍니다. WebView에 스프레드하면 전송 연결 끝입니다.

## 직접 핸들러

플러그인 없이 `ActionMap` 타입만 넘겨도 추론은 그대로입니다:

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

선언한 액션은 전부 구현해야 하고, 페이로드와 응답이 검사되며, 핸들러와 플러그인 사이에 액션 이름이 겹치면 셋업 시점에 throw합니다.

## 직접 핸들러와 플러그인 섞어 쓰기

TypeScript 타입 인자는 전부 아니면 전무입니다. `useBridgeHost<MyActions>({ plugins })`처럼 명시하면 플러그인 튜플 추론이 꺼져 `sendEvent`가 조용히 untyped가 됩니다. 대신 직접 핸들러를 `defineHandlers`로 감싸면 양쪽 추론이 모두 살아 있습니다:

```tsx
import { defineHandlers, useBridgeHost } from '@webview-ts/react-native';

const { sendEvent } = useBridgeHost({
  handlers: defineHandlers<MyActions>({
    'storage.get': async ({ key }) => ({ value: await AsyncStorage.getItem(key) }),
  }),
  plugins: [location.host(locationHandlers)], // sendEvent 타입 유지
});
```

## 이벤트 송신

`sendEvent`는 플러그인 이벤트 맵으로 타입이 붙습니다([열린 집합](../guides/events)):

```tsx
sendEvent('location.updated', { lat, lng });
```

WebView 여러 개와 타깃/브로드캐스트 전달은 [멀티 WebView 라우팅](../guides/multi-webview-routing)에서 다룹니다.

## 어댑터가 흡수하는 플랫폼 특이사항

신경 쓸 필요 없도록 어댑터가 대신 떠안는 두 가지:

- **iOS와 Android의 전달 차이** — react-native-webview는 호스트→웹 메시지를 `window`(iOS) 또는 `document`(Android, 버블링 없음)로 보냅니다. 클라이언트 어댑터가 양쪽을 다 듣습니다.
- **마운트 레이스** — WebView ref가 붙기 전에 보낸 메시지는 조용히 사라지는 대신 큐에 쌓였다가 ref가 붙는 순간 flush됩니다.

## React 밖에서

`createBridgeHost`는 훅의 순수 함수 버전입니다. 같은 옵션을 받고, React 없는 어떤 JS 호스트에서든 돌아갑니다.
