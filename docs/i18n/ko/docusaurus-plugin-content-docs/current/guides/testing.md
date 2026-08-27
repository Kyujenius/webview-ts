---
sidebar_position: 11
title: 테스트
---

# 테스트

세 계층, 세 가지 기법 — 전부 라이브러리가 이미 싣고 있는 장치로 합니다.

## 컴포넌트 테스트: fallback이 곧 테스트 심이다

jsdom/happy-dom에는 네이티브 전송이 없으므로 브릿지는 자동으로 [fallback 모드](./fallback-mode)로 돕니다 — 플러그인의 `withFallback` 목이 호출에 답합니다. **테스트별로** 응답을 바꾸고 싶으면 프로바이더에 fallback 맵을 넘기세요(플러그인 목보다 우선합니다):

```tsx
render(
  <BridgeProvider
    config={{
      fallback: {
        'camera.takePhoto': async () => ({ uri: '/fixture.jpg', width: 1, height: 1 }),
      },
    }}
  >
    <PhotoButton />
  </BridgeProvider>
);
```

모킹 라이브러리도, 모듈 가로채기도 필요 없습니다. 브라우저 단독 개발을 굴리는 그 심이 테스트도 굴립니다.

## 핸들러 테스트: 그냥 함수다

호스트 핸들러는 평범한 async 함수입니다. 직접 부르면 됩니다:

```typescript
const handlers = { takePhoto: async ({ quality }) => nativeTake(quality) };
expect(await handlers.takePhoto({ quality: 0.5 })).toEqual({ uri: expect.any(String) });
```

호스트 파이프라인(스키마 검증, 에러 직렬화)까지 태우려면 `BridgeHost.handleMessage`에 메시지를 만들어 넣으세요:

```typescript
const { bridgeHost } = createBridgeHost({ adapter: stubAdapter, plugins: [camera.host(handlers)] });
const response = await bridgeHost.handleMessage({
  id: 't1',
  action: 'camera.takePhoto',
  payload: { quality: 2 }, // 범위 밖
  timestamp: Date.now(),
  sourceId: 'test',
  targetId: 'host',
});
expect(response.success).toBe(false); // 프로덕션과 똑같이 직렬화된 VALIDATION_ERROR
```

## 계약 왕복 테스트: 루프백 자작

인터셉터·스키마·에러 코드까지 전체 경로를 검증하려면, 인메모리 어댑터 한 쌍으로 클라이언트와 호스트를 맞물리세요:

```typescript
function createLoopback() {
  let toHost: (raw: string) => void;
  let toClient: (raw: string) => void;

  const host = createBridgeHost({
    adapter: {
      send: (json) => toClient(json),
      onMessage: (cb) => ((toHost = cb), () => {}),
      destroy: () => {},
    },
    plugins: [camera.host(realHandlers)],
  });

  const client = new BridgeClient({
    adapter: {
      send: (msg) => toHost(JSON.stringify(msg)),
      onMessage: (cb) => ((toClient = cb), () => {}),
      isAvailable: () => true,
      connectionMode: 'native',
    },
  });
  client.applyPlugins([camera]);
  client.connect();

  return { client, host };
}
```

스무 줄이면 플랫폼 없이 모든 메시지가 진짜 JSON 직렬화 경계를 건넙니다 — 버전 스큐 버그(상대가 모르는 계약 필드)가 프로덕션과 똑같이 여기서 재현됩니다.
