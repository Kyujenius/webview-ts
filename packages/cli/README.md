# @webview-ts/cli

![npm](https://img.shields.io/npm/v/@webview-ts/cli)

Contract-to-JSON-Schema export CLI for the [@webview-ts](https://github.com/Kyujenius/webview-ts) WebView bridge.

## Installation

```bash
npm install -D @webview-ts/cli
```

## Usage

```bash
webview-ts schema export ./src/contracts.ts -o ./schemas
```

Exports zod-based plugin contracts to JSON Schema files, one per plugin:

```
✓ camera → schemas/camera.schema.json
✓ storage → schemas/storage.schema.json
```

Actions and events defined with plain phantom generics (no schema) are reported as coverage warnings — they have no runtime schema to export.

> Runtime validation works with any [Standard Schema](https://standardschema.dev) library; schema **export** requires zod.

## Documentation

Full docs: https://kyujenius.github.io/webview-ts/guides/contract-export

## License

MIT
