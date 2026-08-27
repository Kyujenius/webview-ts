---
sidebar_position: 6
title: 멀티 WebView 라우팅
---

# 멀티 WebView 라우팅

WebView 여러 개를 동시에 살려 두는 앱 — 탭바, 메인 뷰 + 모달, 미니앱 쉘 — 은 금방 같은 질문에 부딪힙니다: _이 이벤트, 어느 WebView가 받아야 하지?_

webview-ts의 답은 `ConnectionRegistry`입니다. WebView마다 호스트가 자기 id로 등록하고, 응답은 요청을 보낸 WebView로 알아서 돌아가며, 호스트는 이벤트를 특정 WebView에 보내거나 전체에 뿌립니다.

```tsx
import { ConnectionRegistry, TARGET } from '@webview-ts/shared';
import { useBridgeHost } from '@webview-ts/react-native';

const registry = useMemo(() => new ConnectionRegistry(), []);

const hostA = useBridgeHost({ name: 'webview-A', registry, config: { registry }, plugins });
const hostB = useBridgeHost({ name: 'webview-B', registry, config: { registry }, plugins });

// 특정 WebView 하나에
hostA.bridgeHost.sendEvent('cart.updated', payload, { target: hostB.sourceId });

// 연결된 모든 WebView에
hostA.bridgeHost.sendEvent('session.expired', payload, { target: TARGET.BROADCAST });
```

## 보장되는 것

- **응답은 WebView를 넘나들지 않습니다.** 응답마다 요청자의 id가 붙어 있고, 자기 어댑터를 타고 돌아갑니다.
- **라우팅은 호스트가 중개합니다.** WebView끼리 직접 대화하지 않습니다. 모든 메시지가 호스트를 거치므로 크로스 WebView 트래픽의 감사 지점이 하나로 유지됩니다 — 인터셉터와 `onCall` 텔레메트리가 전부를 봅니다.

## 모바일만의 이야기가 아니다

같은 레지스트리가 iframe 사이도 라우팅합니다. [iframe 예제](../platforms/iframe)는 임베드된 프레임 두 개를 띄워 테마 변경을 양쪽에 뿌리고, 한 프레임만 핑을 받는 동안 다른 프레임은 조용히 있게 합니다 — 네이티브 코드 없이요.

모바일에서 돌려볼 데모는 [`examples/react-native`](https://github.com/Kyujenius/webview-ts/tree/main/examples/react-native)에 있습니다.
