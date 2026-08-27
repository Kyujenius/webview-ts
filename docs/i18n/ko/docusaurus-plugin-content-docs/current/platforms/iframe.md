---
sidebar_position: 4
title: Iframe 임베드
---

# Iframe 임베드

네이티브 코드 없이 같은 브릿지를 씁니다. **부모 페이지가 호스트**, 각 **iframe이 클라이언트**입니다. 결제 위젯, 서드파티/파트너 임베드, 보안 경계, 레거시 앱 임베딩에 그대로 가져다 쓸 수 있는 템플릿입니다.

돌려볼 수 있는 데모는 [`examples/iframe`](https://github.com/Kyujenius/webview-ts/tree/main/examples/iframe)에 있습니다 — 프레임 두 장, 타입 호출, 브로드캐스트 + 타깃 이벤트, standalone fallback 모드까지.

## 이것은 무엇이고, 무엇이 아닌가

이건 **iframe 격리 방식**입니다. 각 프레임은 별도의 윈도우/JS 컨텍스트이고, 따로 번들·배포되며(크로스 오리진도 됩니다), 둘을 잇는 유일한 채널은 문자열 `postMessage`입니다. 바로 이 딱딱한 경계가 webview-ts가 서는 자리입니다.

**Module Federation 방식의 마이크로 프론트엔드 조합은 아닙니다.** 거기서는 리모트 번들이 _같은_ JS 컨텍스트에 올라갑니다. window와 힙을 공유하고 모듈이 서로 직접 import하니, 브릿지가 타입을 붙일 메시지 경계 자체가 없습니다. MF/single-spa 계열 아키텍처라면 리모트 사이에 webview-ts는 필요 없습니다.

두 어댑터 모두 `@webview-ts/core`에 내장돼 있습니다 — `IframeClientAdapter`와 `IframeHostAdapter`. iframe 플랫폼은 바로 쓸 수 있고, 소스(각 ~40줄)는 [커스텀 어댑터](./custom-adapters)의 레퍼런스 역할도 합니다.

## 클라이언트 쪽 (iframe 내부)

`BridgeConfig.adapter`로 어댑터 하나를 주입하면 됩니다:

```typescript
import { BridgeClient, IframeClientAdapter } from '@webview-ts/core';

const bridge = new BridgeClient<Actions, Events>({
  adapter: new IframeClientAdapter(SHELL_ORIGIN),
  fallback: mergeFallbacks([shell], undefined),
});
bridge.applyPlugins([shell]);
bridge.connect();
```

참고로 어댑터의 실체는 이게 전부입니다:

```typescript
class IframeClientAdapter implements ClientAdapter {
  constructor(private readonly parentOrigin: string) {}

  isAvailable() {
    return typeof window !== 'undefined' && window.parent !== window;
  }
  get connectionMode() {
    return this.isAvailable() ? 'native' : 'disconnected';
  }
  send(message: BridgeMessage) {
    window.parent.postMessage(JSON.stringify(message), this.parentOrigin);
  }
  onMessage(callback: (raw: string) => void) {
    const listener = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      if (event.origin !== this.parentOrigin) return; // 쉘만 말할 수 있다
      if (event.source !== window.parent) return;
      callback(event.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }
}
```

부모 쉘 없이 단독으로 열면 `isAvailable()`이 false가 되고, 플러그인의 [fallback 목](../guides/fallback-mode)이 이어받습니다.

## 호스트 쪽 (부모 페이지)

프레임마다 `IframeHostAdapter` 하나씩(`event.source` 검사가 프레임별 트래픽을 갈라 줍니다)을 중립 팩토리 `createBridgeHost`에 넣습니다:

```typescript
import { createBridgeHost, IframeHostAdapter } from '@webview-ts/core';

const registry = new ConnectionRegistry();

function mountFrame(frame: HTMLIFrameElement, id: string) {
  const adapter = new IframeHostAdapter(frame, CHILD_ORIGIN);

  const { bridgeHost, sendEvent } = createBridgeHost({
    adapter,
    config: { registry },
    plugins: [
      shell.host({
        getUser: async () => ({ name: 'Jane', role: 'member' }),
        showToast: async ({ message }) => {
          render(message);
          return { shown: true };
        },
      }),
    ],
  });

  registry.register(id, (message) => adapter.send(message));
  return bridgeHost;
}
```

React나 Vue로 쉘을 만든다면 각 프레임워크의 `useBridgeHost({ adapter, plugins })` 훅/컴포저블을 쓰면 됩니다 — 밑에서 도는 건 같은 팩토리입니다.

브로드캐스트와 타깃 이벤트는 모바일과 똑같이 동작합니다:

```typescript
host.sendEvent('shell.themeChanged', { theme }, { target: TARGET.BROADCAST });
host.sendEvent('shell.ping', { from: 'shell' }, { target: 'frame-B' });
```

## 중첩: 위젯이 네이티브 능력을 원한다면?

이 페이지 자체가 네이티브 WebView 안에 있다면, 명시적으로 릴레이하세요 — [패턴 § 중첩 임베드는 명시적으로 릴레이한다](../guides/patterns)를 참고하세요.

## 크로스 오리진

두 어댑터 모두 origin을 파라미터로 받고, 메시지마다 `event.origin`과 `event.source`를 확인합니다. 프레임이 다른 오리진에서 서빙돼도 같은 코드가 돌아갑니다. [보안](../guides/security)을 참고하세요.
