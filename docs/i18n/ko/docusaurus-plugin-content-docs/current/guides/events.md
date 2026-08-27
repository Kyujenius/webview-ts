---
sidebar_position: 3
title: 이벤트
---

# 이벤트

이벤트는 호스트 → 클라이언트로만 흐르고, 계약에서 액션 옆자리에 선언합니다:

```typescript
export const location = definePlugin(
  'location',
  { get: action<void, Position>() },
  { events: { updated: event<Position>() } }
);
```

## 구독 (클라이언트)

`usePlugin`을 거치면 이벤트 이름은 짧아지고 타입이 붙습니다:

```tsx
const { on } = usePlugin(location);

useEffect(
  () =>
    on('updated', (position) => {
      //                            ^? Position
      setPosition(position);
    }),
  []
);
```

브릿지에 풀 네임으로 직접 구독해도 됩니다 — React라면 `useEvent('location.updated', handler)`, 어디서든 `bridge.on('location.updated', handler)`.

## 송신 (호스트)

`sendEvent`는 병합된 플러그인 이벤트 맵으로 타입이 붙습니다. 계약에 있는 이벤트는 페이로드 검사와 자동완성을 받고, 계약 밖의 커스텀 이벤트 이름도 막지는 않습니다(열린 이벤트 집합):

```typescript
const { sendEvent } = useBridgeHost({ plugins: [location.host(handlers)] });

sendEvent('location.updated', { lat: 37.5, lng: 127.0 }); // ✅ 페이로드 검사됨
sendEvent('location.updated', { lat: 'x' }); // ❌ 컴파일 에러
sendEvent('app.custom', { anything: true }); // ✅ 열린 집합
```

플러그인 핸들러 안의 `ctx.emit`은 짧은 이름을 쓰고, 해당 플러그인의 이벤트 타입으로 잠깁니다:

```typescript
location.host({
  get: async (_payload, ctx) => {
    ctx.emit('updated', { lat, lng }); // ✅ 타입 검사됨
    ctx.emit('nope', {}); // ❌ 컴파일 에러
    return { lat, lng };
  },
});
```

## 이벤트 스키마

`event(schema)`를 쓰면 클라이언트가 들어오는 이벤트 페이로드를 검증합니다. 검증에 실패한 이벤트는 전달되지 않고 **버려지며**, 실패는 전역 `onError`로 알려집니다. [스키마 검증](./schema-validation)을 참고하세요.

## 타깃팅

WebView가 여러 개라면 이벤트를 특정 하나에 보내거나 전체에 브로드캐스트할 수 있습니다 — [멀티 WebView 라우팅](./multi-webview-routing)에서 다룹니다.
