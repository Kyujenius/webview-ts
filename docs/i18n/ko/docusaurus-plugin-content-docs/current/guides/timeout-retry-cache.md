---
sidebar_position: 4
title: Timeout, Retry & Cache
---

# Timeout, Retry & Cache

세 가지 모두 계약에 선언하고, 호출부에 가까운 쪽이 덮어씁니다. 우선순위는 어디서나 같습니다(좁은 쪽이 이깁니다):

```
호출별 (execute 옵션) > 액션별 (useAction) > 플러그인 (액션 마커) > 전역 (BridgeConfig)
```

## Timeout

```typescript
getInfo: (action<void, DeviceInfo>({ timeout: 5000 }), // 액션별
  new BridgeClient({ timeout: 10_000 })); // 전역 기본값
await getInfo.execute(undefined, { timeout: 2000 }); // 호출별
```

기본값 `0`은 timeout을 끕니다. 시간이 다 되면 `TIMEOUT` 코드의 `BridgeCallError`로 reject됩니다.

## Retry

```typescript
interface RetryConfig {
  maxAttempts: number; // 첫 시도 이후 추가로 시도할 횟수
  delay: number; // 시도 간격(ms)
  exponentialBackoff?: boolean; // delay * 2^(attempt-1)
  retryIf?: (error: BridgeError) => boolean;
}
```

기본 동작에서 **재시도해도 소용없는 오류는 재시도하지 않습니다.** `VALIDATION_ERROR`, `HANDLER_NOT_FOUND`, `NATIVE_UNAVAILABLE`, `NO_FALLBACK`은 세션 안에서 결과가 정해져 있고(어댑터와 fallback 맵은 생성 시점에 고정), 멱등하지 않은 액션(예: 결제)을 무턱대고 재시도하는 건 위험하기까지 합니다. 다른 기준이 필요하면 `retryIf`가 결정을 통째로 넘겨받습니다:

```typescript
import { ERROR_CODE } from '@webview-ts/shared'; // 각 프레임워크 패키지에서도 re-export됩니다

retry: {
  maxAttempts: 3,
  delay: 300,
  retryIf: (error) => error.code === ERROR_CODE.TIMEOUT || error.code === ERROR_CODE.NETWORK_ERROR,
}
```

`ERROR_CODE`는 모든 코드(`TIMEOUT`, `NETWORK_ERROR`, `VALIDATION_ERROR`, …)의 런타임 상수입니다 — 문자열을 손으로 칠 필요가 없고, `error.code`도 같은 유니온 타입이라 어느 쪽으로 써도 오타는 컴파일 에러입니다.

첫 시도를 포함한 모든 시도가 `attempt` 번호와 함께 전역 `onError`에 보고됩니다.

## 호출 중단하기 (abort)

`BridgeCallOptions.signal`은 표준 `AbortSignal`을 받습니다. abort하면 **기다림**이 `ERROR_CODE.ABORTED`로 reject되고, 대기 중이던 콜백이 정리되며, 재시도도 하지 않습니다 — 호스트 쪽 작업 자체는 취소되지 않습니다(이미 실행 중이니까요). fetch의 signal이 서버 핸들러를 되돌리지 못하고 연결만 끊는 것과 같습니다.

```typescript
const controller = new AbortController();
const promise = search.execute({ q }, { signal: controller.signal });
// 사용자가 다시 타이핑 — 낡은 호출은 그만 기다린다
controller.abort();
```

연속 `execute()`는 상태 차원에서 **latest-wins**이기도 합니다: 순서가 뒤바뀌어 늦게 도착한 낡은 응답이 더 새 결과를 덮어쓰지 못합니다(호출자 각자는 여전히 자기 결과를 받습니다).

## Cache

```typescript
getInfo: action<void, DeviceInfo>({ cache: 60_000 }),    // ms TTL
listCountries: action<void, Country[]>({ cache: true }), // 무기한
```

캐시 키는 직렬화된 페이로드이고, **액션 단위로 브릿지 전체가 공유합니다.** 같은 캐시 액션을 쓰는 두 컴포넌트는 각자 호스트를 부르는 대신 캐시를 나눠 씁니다.

무효화도 일부러 공유로 설계했습니다:

- `reset()` — 그 액션의 캐시를 (모든 소비자에 대해) 비우고, 해당 핸들의 상태를 되돌립니다.
- `invalidateCache()` — 상태는 두고 캐시만 비웁니다. 뮤테이션 뒤에 쓰세요.

:::note
액션의 첫 `cache` 선언이 TTL을 정합니다. 이후 다른 TTL로 마운트해도 같은 저장소를 다시 씁니다.
:::
