---
sidebar_position: 7
title: 보안
---

# 보안

브릿지 채널은 문자열 채널입니다. 브릿지 메시지 모양의 문자열을 보낼 수 있는 존재는 전부 잠재적 스푸핑 벡터라는 뜻입니다. webview-ts는 몇 가지 방어를 기본으로 깔아 둡니다.

## 메시지 스푸핑 방어

호스트가 주입하는 메시지는 `source` 윈도우가 없는 합성 이벤트입니다. 반면 iframe이나 부모 윈도우가 보내는 진짜 `postMessage`에는 항상 `source`가 붙습니다. 클라이언트는 그런 메시지를 **기본적으로 버리므로**, 페이지에 낀 서드파티 iframe이 브릿지 응답이나 이벤트를 위조하지 못합니다.

특정 윈도우의 메시지를 _일부러_ 받고 싶다면(예: 브릿지 프로토콜로 말하는, 같은 팀의 신뢰된 iframe) origin을 허용 목록에 올리세요:

```typescript
const bridge = new BridgeClient({
  allowedOrigins: ['https://widgets.your-company.com'],
});
```

이건 CORS가 아니라 `postMessage` origin 허용 목록입니다. 기본 호스트 채널은 origin이 없어 항상 통과하고, 허용 목록은 윈도우가 보낸 메시지에만 적용됩니다.

## 위조할 수 없는 메시지 id

응답은 메시지 id로 요청과 짝지어집니다. id는 Web Crypto(`crypto.getRandomValues`, 64비트 난수)로 만들기 때문에, 응답을 위조하려면 카운터를 지켜보는 게 아니라 예측 불가능한 id를 맞혀야 합니다.

## 와이어에 스택 트레이스 없음

호스트 핸들러가 throw하면 오류의 `message`와 `code`만 경계를 건넙니다. **스택 트레이스는 절대 건너지 않습니다.** 호스트 내부 사정은 호스트에 남고, 전체 오류 객체는 로컬 로깅용으로 호스트 쪽 `onError`에 그대로 갑니다.

## 어댑터 레벨 검사

전송 레벨 필터링은 전송을 아는 곳, 즉 어댑터에 둡니다:

- React Native 클라이언트 어댑터는 `window`/`document` 리스너에 source/origin 정책을 겁니다.
- [iframe 예제](../platforms/iframe)의 어댑터들은 `event.origin`과 `event.source`를 모두 확인합니다. 그래서 두 프레임의 트래픽이 섞이지 않고, 외부 프레임이 메시지를 밀어 넣지 못합니다.

[커스텀 어댑터](../platforms/custom-adapters)를 만들 때도 같은 규율을 지키세요. 엔진에 문자열을 넘기기 전에 발신자부터 확인합니다.

## 검증도 보안 계층이다

받는 쪽 경계의 스키마 검증 덕분에, 잘못됐거나 예상 밖인 페이로드는 핸들러 코드에 닿지 못합니다 — [스키마 검증](./schema-validation)을 참고하세요.
