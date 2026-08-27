---
sidebar_position: 9
title: Contract Export
---

# Contract Export

`@webview-ts/cli` turns your contract into versioned JSON Schema files — the machine-readable form of the same source of truth, ready for codegen, docs, or cross-language validation.

```bash
npx @webview-ts/cli schema export ./src/plugins/index.ts -o ./schemas
```

Each plugin exports to its own file, stamped with a spec version:

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

## When to use it

- **Cross-language hosts** — environments without a JS runtime (a Rust Tauri backend, a native Swift/Kotlin shell) can't run `BridgeHost`, but they can consume the schema to generate typed handlers or validate messages. This is the deliberate escape hatch for the platforms webview-ts doesn't target directly.
- **API documentation** — publish the schema as the authoritative reference between teams shipping from separate repos.
- **Contract diffing in CI** — export on every build and diff against the previous version to catch breaking contract changes before they ship.

Export requires zod (v4) schemas; _runtime_ validation works with any Standard Schema library.
