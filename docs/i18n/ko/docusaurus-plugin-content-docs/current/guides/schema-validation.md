---
sidebar_position: 1
title: 스키마 검증
---

# 스키마 검증

[Standard Schema](https://standardschema.dev)를 구현한 라이브러리라면 무엇이든(zod, valibot, arktype) `action()` / `event()`에 넘길 수 있습니다. 타입은 스키마에서 추론되므로 제네릭이 필요 없고, 페이로드는 **받는 쪽 경계**에서 검증됩니다.

```typescript
import { action, definePlugin, event } from '@webview-ts/shared';
import { z } from 'zod';

export const camera = definePlugin('camera', {
  takePhoto: action({
    payload: z.object({ quality: z.number().min(0).max(1).default(0.8) }),
    response: z.object({ uri: z.string(), width: z.number(), height: z.number() }),
  }),
});
```

## 검증이 실행되는 곳

- **호스트는 들어오는 페이로드를 검증합니다.** 잘못된 호출은 핸들러 코드에 닿지 못합니다.
- **클라이언트는 들어오는 응답과 이벤트를 검증합니다.** 이게 *버전 스큐*를 잡습니다 — 설치된 호스트 앱에는 아직 없는 계약을 웹 앱이 들고 배포되는 날의 문제입니다.
- 검증에 실패한 **이벤트**는 핸들러에 전달되지 않고 버려지며, 오류는 전역 `onError`로 알려집니다.

## 입력 타입과 출력 타입

경계를 건너는 값은 스키마의 출력으로 **교체**됩니다. 그래서 `.default()`, `.transform()`, `z.coerce`가 브릿지 너머에서도 동작합니다:

- 보내는 쪽은 스키마의 **입력** 타입을 씁니다. 위 예시의 `quality`는 호출부에서 옵셔널입니다.
- 받는 쪽은 **출력** 타입을 받습니다. 핸들러가 보는 `quality`는 언제나 `number`입니다.

```typescript
await takePhoto.execute({}); // ✅ quality가 0.8로 채워짐
// 핸들러는 { quality: 0.8 }을 받는다
```

## 실패

검증 실패는 `code: 'VALIDATION_ERROR'`와 구조화된 `details.issues`(메시지 + 경로)를 담은 `BridgeCallError`로 나타납니다. webview-ts는 오류에 원본 페이로드를 붙이지 않습니다. 다만 일부 스키마 라이브러리(예: valibot)는 자체 issue 메시지에 받은 값을 넣기도 합니다.

검증 오류는 retry가 설정돼 있어도 기본적으로 **재시도하지 않습니다.** 스키마가 거부한 페이로드는 몇 번을 다시 보내도 같은 결과입니다. [Timeout, Retry & Cache](./timeout-retry-cache)를 참고하세요.

## 모드 섞어 쓰기

스키마가 없으면? 달라지는 건 없습니다. 팬텀 타입 `action<P, R>()`은 이전과 똑같이 동작하고, 한 플러그인 안에서 두 모드를 자유롭게 섞어도 됩니다. 단, 한 액션에 제네릭과 스키마를 _동시에_ 쓰는 건 컴파일 에러입니다.
