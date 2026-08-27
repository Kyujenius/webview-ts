---
sidebar_position: 2
title: 인터셉터 & 라이프사이클
---

# 인터셉터 & 라이프사이클 이벤트

## 인터셉터

webview-ts의 인터셉터는 Axios 방식입니다. 나가는 요청과 들어오는 응답 각각에 순차 변환 체인이 걸립니다.

```typescript
import type { RequestInterceptor } from '@webview-ts/shared';

const logRequest: RequestInterceptor = {
  name: 'log-req',
  fn: (req) => {
    console.log(`[->] ${req.action}`, req.payload);
    return req;
  },
};

const { BridgeProvider, usePlugin } = createBridgeReact({
  plugins: [camera],
  interceptors: { request: [logRequest] },
});
```

### 전역과 액션별

```typescript
// 전역 — 모든 액션에 실행 (unsubscribe 함수 반환)
bridge.interceptors.request.use({ name: 'auth', fn: (req) => req });
bridge.interceptors.response.use({ name: 'unwrap', fn: (res) => res });

// 액션별 — 액션 마커에 부착, 그 액션에만 실행
const camera = definePlugin('camera', {
  takePhoto: action<P, R>().interceptors.request.use(compressionInterceptor),
});
```

실행 순서는 하나의 선형 체인입니다:

```
전역 요청 → 액션별 요청 → [호스트로 전송]
  → 액션별 응답 → 전역 응답
```

## 라이프사이클 이벤트

로깅이나 시간 측정이 목적이라면 변환 대신 구독을 쓰세요:

```typescript
bridge.onCall('call:start', ({ action, payload }) => console.log('[->]', action, payload));
bridge.onCall('call:end', ({ action, duration }) => console.log('[<-]', action, `${duration}ms`));
bridge.onCall('call:error', ({ action, error }) => console.error(action, error));
```

같은 `onCall` API가 `BridgeHost`에도 있습니다. 호스트 쪽에서는 이벤트가 핸들러 실행을 감싸므로, 어느 쪽에서든 Datadog·Sentry 같은 수집기로 브릿지 텔레메트리를 보내기 좋습니다. 라이프사이클 리스너가 호출을 깨뜨릴 일은 없습니다 — 리스너 안에서 터진 예외는 삼켜집니다.
