---
sidebar_position: 5
title: 커스텀 어댑터
---

# 커스텀 어댑터

새 플랫폼의 비용은 정확히 어댑터 한 쌍입니다. 엔진(`core`)은 플랫폼 API를 만지지 않고, 어댑터는 아무것도 수정하지 않은 채 꽂힙니다. 전송 특이사항은 전부 어댑터가 떠안습니다.

플랫폼의 요건은 둘입니다:

1. **호스트 쪽 JS 런타임** — `BridgeHost`는 순수 TypeScript입니다.
2. **양방향으로 문자열을 넘길 수단** — `postMessage`든 IPC든 상관없습니다.

NativeScript, 그리고 Lynx 같은 새 프레임워크가 여기 들어옵니다. 레퍼런스 구현은 `@webview-ts/core`에 내장된 [iframe 어댑터](./iframe)입니다(각 ~40줄). Electron도 기술적으로는 조건을 만족하지만, webview-ts가 풀려는 문제 — 따로 배포되는 양쪽의 버전 스큐, 호스트 없는 브라우저 개발 — 는 호스트와 웹이 한 바이너리로 같이 배포되는 곳엔 존재하지 않아서 타깃이 아닙니다.

## 클라이언트 쪽: `ClientAdapter`

```typescript
interface ClientAdapter {
  /** 호스트로 메시지를 보낸다 */
  send(message: BridgeMessage): void;
  /** 호스트에서 오는 원시 메시지를 구독한다. unsubscribe 함수를 반환. */
  onMessage?(callback: (raw: string) => void): () => void;
  /** 지금 살아있는 호스트에 닿을 수 있는가? */
  isAvailable(): boolean;
  /** 'native' | 'fallback' | 'disconnected' */
  connectionMode: ConnectionMode;
}
```

config로 주입하면 자동 감지는 건너뜁니다:

```typescript
const bridge = new BridgeClient({ adapter: new MyPlatformAdapter() });
```

주입한 어댑터가 사용 불가를 보고하고 fallback이 설정돼 있으면 [fallback 모드](../guides/fallback-mode)가 그대로 이어받습니다. 어느 플랫폼에서든 브라우저 단독 개발은 계속 됩니다.

:::note
`BridgeConfig.allowedOrigins`는 내장 어댑터만 소비합니다. 주입한 어댑터는 수신을 스스로 소유하므로 발신자 검사도 스스로 해야 합니다 — [보안](../guides/security) 참고.
:::

## 호스트 쪽: `HostAdapter`

```typescript
interface HostAdapter {
  /** 직렬화된 메시지를 임베드된 웹 콘텐츠로 전달한다 */
  send(message: string): void;
  /** 웹 콘텐츠에서 오는 원시 메시지를 구독한다. unsubscribe 함수를 반환. */
  onMessage(callback: (json: string) => void): () => void;
  destroy(): void;
}
```

중립 팩토리로 주입합니다 — 모든 프레임워크 패키지가 감싸는 바로 그 호출입니다:

```typescript
import { createBridgeHost } from '@webview-ts/core';

const { bridgeHost, sendEvent } = createBridgeHost({
  adapter: new MyPlatformHostAdapter(),
  plugins: [myPlugin.host(handlers)],
});
```

(더 낮은 레벨의 `new BridgeHost()` + `host.attach(adapter)`도 가능합니다.)

## 책임 체크리스트

어댑터는 *전송 역학*만 맡고, 나머지는 전부 엔진 몫입니다. 어댑터를 만들 때:

- **발신자를 확인하세요.** 문자열을 넘기기 전에 `event.origin`/`event.source`나 그 플랫폼의 동등한 수단을 검사해, 외부 컨텍스트가 브릿지 메시지를 밀어 넣지 못하게 합니다. [보안](../guides/security) 참고.
- **버리지 말고 큐에 쌓으세요.** 채널이 아직 준비 전이라면(ref 미부착, 윈도우 로딩 중) 나가는 메시지를 버퍼에 뒀다가 준비되는 순간 flush합니다. RN 호스트 어댑터가 상한 있는 큐로 이렇게 합니다.
- **플랫폼 특이사항을 가두세요.** RN 클라이언트 어댑터가 iOS·Android의 전달 차이 때문에 `window`와 `document`를 모두 듣는 것처럼요. 이런 지식이 위 계층으로 새면 안 됩니다.
- **파싱하지 마세요.** 원시 문자열만 전달합니다. 파싱, 타입 가드, 검증, 디스패치는 엔진의 일입니다.

어댑터 위의 모든 것 — 계약, 스키마 검증, 인터셉터, retry/cache, 이벤트, 라우팅, DevTools — 은 새 플랫폼에서도 변경 없이 돌아갑니다.
