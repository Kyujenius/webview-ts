---
sidebar_position: 9
title: 계약 내보내기
---

# 계약 내보내기

`@webview-ts/cli`는 계약을 버전이 찍힌 JSON Schema 파일로 바꿉니다. 같은 단일 기준의 기계 판독 버전이라, 코드 생성·문서·다른 언어에서의 검증에 바로 쓸 수 있습니다.

```bash
npx @webview-ts/cli schema export ./src/plugins/index.ts -o ./schemas
```

플러그인마다 스펙 버전이 찍힌 파일 하나씩 나옵니다:

```json
{
  "webviewTs": { "specVersion": 1 },
  "plugin": "camera",
  "actions": {
    "camera.takePhoto": {
      "payload": { "type": "object", "properties": { "quality": { "type": "number" } } },
      "response": { "type": "object", "properties": { "uri": { "type": "string" } } }
    }
  }
}
```

## 언제 쓰는가

- **다른 언어의 호스트** — JS 런타임이 없는 환경(Rust Tauri 백엔드, 네이티브 Swift/Kotlin 쉘)은 `BridgeHost`를 못 돌리지만, 스키마를 받아 타입 핸들러를 생성하거나 메시지를 검증할 수는 있습니다. webview-ts가 직접 타깃하지 않는 플랫폼을 위해 일부러 남겨 둔 문입니다.
- **API 문서** — 레포가 나뉜 팀 사이의 공식 레퍼런스로 스키마를 발행하세요.
- **CI에서의 계약 diff** — 빌드마다 내보내 이전 버전과 비교하면, 계약을 깨는 변경을 배포 전에 잡습니다.

내보내기에는 zod(v4) 스키마가 필요합니다. _런타임_ 검증은 어떤 Standard Schema 라이브러리와도 동작합니다.
