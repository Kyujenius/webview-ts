---
sidebar_position: 10
title: 패턴
---

# 패턴

브릿지 기반 앱을 튼튼하게 지켜 주는 다섯 가지 원칙입니다. 각각은 "반대로 하면 정확히 이렇게 무너진다"가 있어서 존재합니다.

## 이벤트는 통지, 상태는 액션

이벤트는 **최선-노력**입니다. 페이지가 아직 로딩 중일 때, 혹은 리로드 도중에 보낸 이벤트는 사라집니다. 이벤트의 용도 — 연속적인 통지(`location.updated`, `themeChanged`) — 에서는 문제가 없습니다. 다음 값이 잃어버린 값을 대체하니까요.

무너지는 건 이벤트로 _상태를 한 번_ 전달하려 할 때입니다. 상태는 액션으로 먼저 당겨오고, 그다음에 변경을 구독하세요:

```typescript
// ✅ 먼저 당기고, 그다음 구독
const theme = await bridge.call('shell.getTheme');
bridge.on('shell.themeChanged', applyTheme);

// ❌ 컴포넌트 마운트 전에 초기 themeChanged가 도착했기를 기도
```

특정 이벤트 하나를 잃었을 때 앱이 깨진다면, 그건 이벤트가 아니라 상태였던 겁니다.

## 호스트가 물어야 할 때: 이벤트로 묻고 액션으로 받는다

프로토콜은 일부러 비대칭입니다 — 응답을 기다리는 쪽은 클라이언트뿐입니다. WebView 페이지는 언제든 리로드되거나 떠날 수 있어서, 웹의 답에 *블로킹*하는 호스트 코드는 구조적으로 취약합니다. 호스트가 정말 물어야 한다면(네이티브 백 버튼: "나가도 돼?") 질문은 이벤트로, 답은 액션으로 만드세요:

```typescript
// 호스트
sendEvent('nav.backRequested', {});
// ...그리고 답을 받을 핸들러를 등록:
'nav.confirmBack': async ({ allow }) => { if (allow) navigation.goBack(); }

// 클라이언트
bridge.on('nav.backRequested', async () => {
  const allow = !hasUnsavedChanges();
  await bridge.call('nav.confirmBack', { allow });
});
```

답이 안 오는 것도 정상 결과입니다(페이지가 죽었을 수 있으니까) — 호스트의 기본 동작이 이미 그 경우를 감당해야 합니다.

## 도메인 실패는 에러가 아니라 응답이다

에러 채널(`BridgeCallError`, `ERROR_CODE`)은 **인프라** 실패 전용입니다: 타임아웃, 검증, 전송. 계약이 _예견하는_ 실패 — 잔액 부족, 품절 — 는 응답 타입 안에 삽니다:

```typescript
pay: action<
  { amount: number },
  { ok: true; txId: string } | { ok: false; reason: 'INSUFFICIENT_BALANCE' | 'LIMIT_EXCEEDED' }
>(),
```

공짜로 따라오는 게 셋입니다: `reason`에 대한 완전한 타입 분기, 실패 형태의 스키마 검증, 그리고 결정적으로 — **재시도 기계가 아예 안 건드립니다**(도메인 실패는 _성공한_ 응답이니까요. `INSUFFICIENT_BALANCE`를 세 번 재시도해서 좋을 사람은 없습니다).

## 브릿지는 제어 평면이다 — 데이터가 아니라 참조를 건네라

채널은 JSON 문자열이고, 바이너리 경로는 없습니다. base64 사진 한 장은 수 MB짜리 문자열이 되어 메인 스레드에서 직렬화되고, 전송되고, 파싱됩니다. 큰 페이로드는 브릿지에 태우지 마세요: 호스트가 파일/캐시에 쓰고 **URI**를 보내면, WebView는 그 일에 최적화된 자기 네트워킹으로 로드합니다.

```typescript
takePhoto: action<{ quality?: number }, { uri: string; width: number; height: number }>(),
//                                        ^ 바이트가 아니라 참조
```

경험칙: 수십 KB를 넘는 페이로드는 참조로 바꿀 때입니다.

## 중첩 임베드는 명시적으로 릴레이한다

한 페이지가 (WebView 안에서) 클라이언트이면서 동시에 (iframe들의) 호스트일 수 있습니다. 임베드된 위젯이 네이티브 능력을 원하면, 중간 페이지가 **손으로 릴레이**합니다:

```typescript
// 중간 페이지: iframe행 호스트 핸들러가 자기 네이티브행 클라이언트를 호출
widgetHost.registerPlugin(
  widgetCamera.host({
    takePhoto: (payload) => nativeBridge.call('camera.takePhoto', payload),
  })
);
```

이 한 줄은 보일러플레이트가 아니라 **보안 관문**입니다. 경계마다 계약을 따로 선언하므로 서드파티 위젯에 노출되는 표면은 네이티브 표면의 의도된 부분집합이 되고, 릴레이 지점은 페이로드를 거르거나 사용자 동의를 끼워 넣는 자리입니다. 자동 프록시를 일부러 만들지 않았습니다 — 자동 전달은 곧 권한의 자동 통과이기 때문입니다.
