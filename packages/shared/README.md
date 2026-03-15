# @webview-ts/shared

Shared types and schemas for ts-bridge library.

## Overview

This package provides the single source of truth for all type definitions used across web and native bridge implementations. It ensures type safety and consistency across the entire bridge communication layer.

## Features

- **Type Definitions**: Core types for messages, bridge, middleware, and plugins
- **Runtime Validation**: Zod schemas for validating messages at runtime
- **Zero Dependencies**: Only external dependency is Zod for validation
- **Platform Agnostic**: Works in browser, Node.js, and React Native

## Installation

```bash
npm install @webview-ts/shared
# or
pnpm add @webview-ts/shared
# or
yarn add @webview-ts/shared
```

## Usage

### Message Types

```typescript
import type { BridgeMessage, BridgeResponse, BridgeEvent } from '@webview-ts/shared';

// Define a typed message
const message: BridgeMessage<{ userId: string }> = {
  id: 'unique-id',
  action: 'getUserData',
  payload: { userId: '123' },
  timestamp: Date.now(),
};

// Define a typed response
const response: BridgeResponse<{ name: string; email: string }> = {
  id: 'unique-id',
  success: true,
  data: { name: 'John', email: 'john@example.com' },
  timestamp: Date.now(),
};
```

### Runtime Validation

```typescript
import { bridgeMessageSchema, isBridgeMessage } from '@webview-ts/shared';

// Validate with Zod schema
const result = bridgeMessageSchema.safeParse(unknownData);
if (result.success) {
  // Data is valid BridgeMessage
  const message = result.data;
}

// Or use type guard
if (isBridgeMessage(unknownData)) {
  // TypeScript knows this is a BridgeMessage
  console.log(unknownData.action);
}
```

### Plugin Definition

```typescript
import { definePlugin } from '@webview-ts/shared';

type MyActions = {
  'myPlugin.doSomething': {
    payload: { input: string };
    response: { result: string };
  };
};

export const myPlugin = definePlugin<MyActions>()({
  name: 'myPlugin',
  methods: (call) => ({
    doSomething: (input: string) => call('myPlugin.doSomething', { input }),
  }),
});
```

## Type Categories

### Message Types

- `BridgeMessage` - Request message from web to native
- `BridgeResponse` - Response message from native to web
- `BridgeEvent` - Event notification from native to web
- `BridgeError` - Error information structure

### Bridge Types

- `Bridge` - Web-side bridge interface
- `BridgeHost` - Native-side bridge host interface
- `BridgeConfig` - Bridge configuration options
- `Platform` - Platform detection enum

### Middleware Types

- `Middleware` - Middleware interface
- `MiddlewareContext` - Context passed through middleware
- `MiddlewareFunction` - Middleware function type

### Plugin Types

- `PluginInstance` - Plugin instance returned by `definePlugin`
- `HostHandlers` - Host-side handler map for plugin actions
- `PluginCall` - Typed call function for plugin methods

## License

MIT
