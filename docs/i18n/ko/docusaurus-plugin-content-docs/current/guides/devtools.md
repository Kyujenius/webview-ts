---
sidebar_position: 8
title: DevTools
---

# DevTools

실시간 메시지 인스펙터입니다. 요청·응답·이벤트·호출 시간까지 모든 브릿지 트래픽을 잡아 웹 대시보드에 보여줍니다.

## 셋업

개발 엔트리에 import 한 줄이면 됩니다. recorder가 스스로 등록하고 `ws://localhost:4000`에 자동으로 붙습니다:

```typescript title="main.tsx"
if (import.meta.env.DEV) {
  import('@webview-ts/devtools/client');
}
```

서버는 이렇게 띄웁니다:

```bash
pnpm devtools
# 또는: npx @webview-ts/devtools
```

## 설계 노트

- recorder는 **별도 패키지**(`@webview-ts/devtools/client`)에 삽니다. 프로덕션 번들에 DevTools 런타임이 실릴 일은 없습니다.
- 브릿지의 공개 라이프사이클 API(`onCall`, `onAnyEvent`)로만 관찰합니다. 엔진이 DevTools에 대해 아는 것은 20줄짜리 등록 시임이 전부입니다.
- import 순서는 상관없습니다. 브릿지가 먼저 연결된 뒤에 recorder가 로드돼도 소급해서 붙습니다.
- 서버가 꺼져 있으면 recorder는 뒤에서 조용히 재시도합니다. 콘솔도 조용하고, 호출에도 영향이 없습니다.
