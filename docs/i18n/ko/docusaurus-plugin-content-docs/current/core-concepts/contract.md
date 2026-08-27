---
sidebar_position: 1
title: 계약
---

# 계약

`definePlugin` 함수로 plugin을 설정하고, 이것이 하나의 기준으로 작용합니다. 페이로드와 응답 타입이 여기서 양끝 — 웹 클라이언트의 훅과 호스트의 핸들러 — 으로 흘러갑니다.

## 액션

액션은 요청-응답 한 쌍입니다. **팬텀 모드**에서는 제네릭으로 타입만 선언하고 런타임 검증은 하지 않습니다:

```typescript
import { action, definePlugin } from '@webview-ts/shared';

export const camera = definePlugin('camera', {
  takePhoto: action<{ quality?: number }, { uri: string }>(),
  //                 ^페이로드            ^응답
});
```

액션 이름에는 네임스페이스가 자동으로 붙습니다. `takePhoto`는 와이어에서 `camera.takePhoto`가 됩니다.

### 팬텀 모드 vs 스키마 모드

모든 액션은 두 모드 중 하나로 쓰는데, 본질적인 차이는 *타입을 어디에 두느냐*입니다.

**팬텀 모드** — `action<Payload, Response>()`. 제네릭은 컴파일 타임에만 존재하고, 컴파일되면 사라집니다("팬텀(유령)" 타입 — 런타임 마커 객체에는 흔적이 없습니다). 런타임 비용도 의존성도 0이지만, 런타임 검사도 0입니다. 상대편이 계약에 없는 모양을 보내와도 경계에서 잡아 주지 않습니다.

**스키마 모드** — `action({ payload: z.object(...), response: z.object(...) })`. 제네릭 대신 [Standard Schema](https://standardschema.dev) 객체(zod, valibot, arktype)를 넘깁니다. 타입은 *스키마에서 추론*되어 제네릭을 반복할 필요가 없고, 같은 스키마가 런타임에 받는 쪽 경계에서 실제 페이로드를 검증합니다.

|                               | 팬텀             | 스키마                            |
| ----------------------------- | ---------------- | --------------------------------- |
| 타입의 출처                   | 직접 쓰는 제네릭 | 스키마에서 추론                   |
| 런타임 검증                   | 없음             | 받는 쪽 양 경계에서               |
| 버전 스큐 감지                | ❌               | ✅ (`VALIDATION_ERROR`)           |
| `.default()` / `.transform()` | —                | ✅ 브릿지 너머로 적용             |
| 런타임 비용/의존성            | 0                | 스키마 라이브러리 + 메시지당 검증 |

**선택 기준:** 양쪽이 같이 배포되고 와이어를 신뢰할 수 있다면 팬텀 모드로 충분합니다 — 두 코드베이스가 일치한다는 건 컴파일러가 이미 보장하니까요. 경계가 _신뢰할 수 없거나 어긋날 수 있는_ 곳에서 스키마 모드를 꺼내세요: 따로 배포되는 웹/호스트 버전(스큐), 외부 임베드, 모양을 정말로 검사해야 하는 페이로드. 두 모드는 한 플러그인 안에서 액션 단위로 자유롭게 섞입니다 — 위험한 액션만 검증하고 나머지는 가볍게 두면 됩니다. 전체 동작은 [스키마 검증](../guides/schema-validation)을 참고하세요.

### 액션별 옵션

Timeout, retry, cache는 호출부 여기저기 흩어지는 설정이 아니라 계약의 일부입니다:

```typescript
export const device = definePlugin('device', {
  getInfo: action<void, DeviceInfo>({
    timeout: 5000,
    retry: { maxAttempts: 2, delay: 300 },
    cache: 60_000, // ms TTL, 또는 `true`(무기한)
  }),
});
```

우선순위와 retry 동작은 [Timeout, Retry & Cache](../guides/timeout-retry-cache)를 참고하세요.

### 액션별 인터셉터

```typescript
takePhoto: action<P, R>().interceptors.request.use(compressionInterceptor),
```

[인터셉터](../guides/interceptors)를 참고하세요.

## 이벤트

이벤트는 호스트 → 클라이언트 단방향입니다:

```typescript
import { action, definePlugin, event } from '@webview-ts/shared';

export const location = definePlugin(
  'location',
  { get: action<void, { lat: number; lng: number }>() },
  {
    events: {
      updated: event<{ lat: number; lng: number }>(),
    },
  }
);
```

이벤트 이름도 같은 방식으로 네임스페이스가 붙습니다: `location.updated`. 클라이언트의 `on()` 핸들러도, 호스트의 `sendEvent` / `ctx.emit`도 전부 타입이 붙습니다. [이벤트](../guides/events)에서 이어집니다.

## Fallback Mock

플러그인은 브라우저 개발용 Mock을 스스로 갖고 다닙니다:

```typescript
export const camera = definePlugin('camera', {
  takePhoto: action<P, R>(),
}).withFallback({
  takePhoto: async () => ({ uri: 'https://picsum.photos/400/300' }),
});
```

Mock에도 계약의 타입이 그대로 적용되므로, 반환값 모양이 틀리면 컴파일 에러가 납니다. [Fallback 모드](../guides/fallback-mode)를 참고하세요.

## 호스트 핸들러

`plugin.host(handlers)`가 같은 추론이 적용된 호스트 쪽 등록을 만듭니다:

```typescript
camera.host({
  takePhoto: async (payload, ctx) => {
    //          ^? { quality?: number }
    return { uri: '...' }; // ✅ 응답 타입으로 검사됨
  },
});
```

- 선언된 액션은 전부 구현해야 합니다. 핸들러가 하나라도 빠지면 컴파일 에러입니다.
- 플러그인이 이벤트를 선언하면 `ctx.emit('updated', payload)`가 이벤트 맵 타입으로 제공됩니다.
- 액션에 페이로드 스키마가 있으면 핸들러가 실행되기 **전에** 페이로드를 검증합니다.

## 타입 보장

추론 체인은 컴파일 타임 테스트(`tsc` + vitest typecheck 모드)로 고정되어 있습니다. 계약이 보장하는 것:

- 액션·이벤트 **이름은 정확히 유지됩니다.** `useAction('camera.nope')`는 런타임 404가 아니라 컴파일 에러입니다.
- **페이로드와 응답**은 모든 자리에서 검사됩니다: `execute`, `call`, 핸들러, Mock, `sendEvent`, `emit`.
- 스키마를 쓰면 **입력/출력 타입이 올바르게 갈라집니다.** 보내는 쪽은 스키마의 입력 타입(`.default()` 필드는 옵셔널)을 쓰고, 받는 쪽은 출력 타입을 받습니다.
