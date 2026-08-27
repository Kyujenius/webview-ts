---
sidebar_position: 5
title: Fallback 모드
---

# Fallback 모드

호스트가 아직 없어도 웹 앱을 일반 브라우저에서 먼저 개발할 수 있습니다. 쓸 수 있는 전송이 없고 fallback이 켜져 있으면, 호출은 실패하는 대신 Mock 핸들러가 대답합니다.

## 플러그인별 Mock (권장)

플러그인은 계약 타입이 붙은 Mock을 스스로 갖고 다닙니다:

```typescript
export const camera = definePlugin('camera', {
  takePhoto: action<{ quality?: number }, { uri: string }>(),
}).withFallback({
  takePhoto: async () => ({ uri: 'https://picsum.photos/400/300' }),
});
```

`createBridgeReact` / `createBridgeVue`는 모든 플러그인의 Mock을 알아서 병합합니다. `@webview-ts/core`를 직접 쓴다면:

```typescript
import { mergeFallbacks } from '@webview-ts/shared';

const bridge = new BridgeClient({ fallback: mergeFallbacks([camera], undefined) });
```

## 설정 형태

```typescript
fallback: true; // 경고를 남기고 각 호출을 reject (조용히 넘어가지 않게)
fallback: false; // 꺼짐 — 호출이 NATIVE_UNAVAILABLE로 실패 (기본값)
fallback: fallbackMap; // 이 핸들러들이 호출에 대답
```

## 모드 확인

```typescript
bridge.connectionMode; // 'native' | 'fallback' | 'disconnected'
```

React·Vue 패키지에서는 `connectionMode` / `isAvailable`로 노출됩니다. 개발 모드 배지를 달 때 유용합니다. [iframe 예제](../platforms/iframe)에 전체 패턴이 있습니다 — 같은 페이지가 쉘 안에서는 `native`, 단독으로 열면 `fallback` 배지를 답니다.

## 우선순위

Fallback은 실제 전송이 없을 때만 켜집니다. 진짜 호스트 안에서 플러그인 Mock은 죽은 코드입니다 — "프로덕션에서 Mock이 실행되는" 사고는 구조적으로 불가능합니다. [커스텀 어댑터](../platforms/custom-adapters)를 주입했을 때도 마찬가지입니다. 어댑터가 사용 불가를 보고하고 fallback이 설정돼 있으면 fallback이 이어받습니다.
