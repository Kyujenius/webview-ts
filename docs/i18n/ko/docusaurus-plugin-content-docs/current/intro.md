---
sidebar_position: 1
slug: /
title: 소개
---

# webview-ts

**TypeScript를 위한 타입 세이프 WebView ↔ 호스트 브릿지.**

WebView 안의 웹과 그걸 품은 호스트가 대화할 통로는 `postMessage`뿐입니다. 문제는 이게 그냥 문자열이라는 것 — 타입도 없고, 요청과 응답을 짝지어 주지도 않고, 런타임에 아무것도 보장하지 않습니다.

webview-ts는 `postMessage`를 타입이 보장되는 함수 호출로 바꿉니다. 중립적인 계약 파일에 플러그인을 한 번 정의하면 양쪽 모두 그 계약을 기준으로 컴파일하고, 원한다면 런타임 검증까지 같은 계약으로 처리합니다.

```typescript
// 양쪽이 공유하는 하나의 계약 파일
export const camera = definePlugin('camera', {
  takePhoto: action<{ quality?: number }, { uri: string }>(),
});

// 웹: 타입이 붙은 호출
const { uri } = await takePhoto.execute({ quality: 0.9 });

// 호스트: 타입이 붙은 핸들러
camera.host({
  takePhoto: async ({ quality }) => ({ uri: await shoot(quality) }),
});
```

## 어떤 환경을 위한 것인가

webview-ts의 타깃은 **TypeScript 호스트**입니다. JS 런타임이 웹 콘텐츠를 품고 양방향으로 문자열을 주고받는 환경이라면 어디든 해당합니다:

- WebView를 임베드하는 **React Native** 앱 (`@webview-ts/react-native`)
- iframe을 임베드하는 **부모 페이지** — 결제 위젯, 파트너 임베드, 레거시 앱 통합 ([iframe 임베드](./platforms/iframe))
- **NativeScript, Lynx, …** — 플랫폼마다 어댑터 한 쌍이면 됩니다 ([커스텀 어댑터](./platforms/custom-adapters))

:::tip 역할은 플랫폼에 고정되지 않습니다
**웹은 언제나 양쪽 다입니다.** 웹 페이지는 누군가에게 임베드되면(WebView, iframe) _클라이언트_, 스스로 남을 임베드하면(iframe 쉘) *호스트*가 됩니다 — 중첩의 중간에 낀 페이지라면 동시에 둘 다죠. `@webview-ts/react`와 `@webview-ts/vue`가 클라이언트 훅 옆에 호스트 훅을 함께 싣는 이유입니다.
:::

네이티브 Swift/Kotlin 쉘은 타깃이 아닙니다. JS 호스트가 없는 환경에는 계약 자체를 넘깁니다: [`webview-ts schema export`](./guides/contract-export)가 플러그인을 버전이 찍힌 JSON Schema 파일로 바꿔 주므로, 다른 언어에서 코드 생성에 쓰면 됩니다.

## 다른 라이브러리와의 비교

|                            | webview-ts                | 수동 `postMessage` | webview-bridge       | Comlink        |
| -------------------------- | ------------------------- | ------------------ | -------------------- | -------------- |
| 타입 안전성                | ✅ 계약 우선              | ❌ 문자열          | ✅ 네이티브 우선     | ✅ 프록시 기반 |
| 단일 기준(source of truth) | 중립 플러그인 파일        | —                  | 네이티브 브릿지 객체 | 노출된 객체    |
| 브라우저 단독 개발         | ✅ 플러그인별 fallback 목 | ❌                 | 부분적               | ❌             |
| 액션별 timeout/retry/cache | ✅ 계약에 선언            | ❌                 | ❌                   | ❌             |
| 경계에서의 런타임 검증     | ✅ 액션별 스키마 (선택)   | ❌                 | ❌                   | ❌             |
| 멀티 WebView 라우팅        | ✅ 타깃 / 브로드캐스트    | 수동               | ❌                   | ❌             |
| 범위                       | 타입 전송 계층            | —                  | 전송 + 상태          | 워커 RPC       |

webview-bridge와 갈리는 지점은 하나입니다. 거기서는 **네이티브 구현이 기준**이라(웹이 그 `typeof`를 import) 호스트 코드가 먼저 있어야 웹 타입이 생깁니다. webview-ts에서는 **계약 파일이 기준**이라 양쪽이 따로 컴파일하고, 호스트 코드가 아직 없어도 fallback 목으로 웹 개발을 먼저 시작합니다.

## 설계 원칙

- **계약 우선** — `definePlugin` 하나에서 클라이언트 훅, 호스트 핸들러, 목, JSON Schema가 전부 나옵니다.
- **제로 의존성** — `@webview-ts/shared`는 런타임 의존성이 없고, core는 순수 TypeScript입니다.
- **계층화** — 바인딩 → core → shared, 오직 한 방향. lint 룰과 타입 테스트가 지킵니다.
- **전송 불가지론** — 엔진은 플랫폼 API를 모릅니다. 플랫폼 특이사항은 전부 어댑터 몫입니다.
- **플랫폼보다 역할** — client/host는 패키지 경계가 아니라 프로토콜의 역할입니다. 플랫폼 패키지는 자기가 맡을 수 있는 역할을 전부 export합니다.
