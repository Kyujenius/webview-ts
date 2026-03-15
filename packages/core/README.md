# @ts-bridge/core

Core bridge engine for web-side WebView-Native communication.

## Overview

This package provides the main bridge implementation for web applications running in WebView environments. It handles communication with native platforms (iOS, Android, React Native) with type safety and extensibility.

## Features

- **Platform Detection**: Automatically detects iOS, Android, or web environment
- **Type-Safe API**: Full TypeScript support with strict typing
- **Middleware Pipeline**: Extensible request/response processing
- **Event Subscriptions**: Subscribe to native-initiated events
- **Request Queue**: Manages concurrent requests with deduplication
- **Timeout Handling**: Configurable timeouts for all bridge calls

## Installation

```bash
npm install @ts-bridge/core @ts-bridge/shared
# or
pnpm add @ts-bridge/core @ts-bridge/shared
# or
yarn add @ts-bridge/core @ts-bridge/shared
```

## Usage

### Basic Usage

```typescript
import { createBridge } from '@ts-bridge/core';

// Create bridge instance
const bridge = createBridge({
  timeout: 30000,
  debug: true,
});

// Call native function
try {
  const result = await bridge.call('getUserData', { userId: '123' });
  console.log('User data:', result);
} catch (error) {
  console.error('Bridge call failed:', error);
}
```

### With Middleware

```typescript
import { createBridge, LoggerMiddleware, ValidatorMiddleware } from '@ts-bridge/core';

const bridge = createBridge();

// Add logging middleware
bridge.use(
  new LoggerMiddleware({
    level: 'debug',
    includePayload: true,
    includeResponse: true,
  })
);

// Add validation middleware
bridge.use(
  new ValidatorMiddleware({
    validateRequests: true,
    validateResponses: true,
  })
);
```

### Event Subscriptions

```typescript
// Subscribe to native events
const unsubscribe = bridge.on('locationUpdate', (location) => {
  console.log('Location updated:', location);
});

// Unsubscribe when done
unsubscribe();
```

### Type-Safe Calls

```typescript
interface GetUserPayload {
  userId: string;
}

interface UserData {
  name: string;
  email: string;
}

// Type-safe bridge call
const userData = await bridge.call<GetUserPayload, UserData>('getUserData', { userId: '123' });

// TypeScript knows userData is UserData
console.log(userData.name, userData.email);
```

## API

### createBridge(config?)

Create a new bridge instance with optional configuration.

**Config Options:**

- `timeout` - Default timeout in milliseconds (default: 30000)
- `debug` - Enable debug logging (default: false)
- `maxConcurrentRequests` - Max concurrent requests (default: 100)
- `enableDeduplication` - Enable request deduplication (default: true)

### bridge.call(action, payload?, options?)

Call a native action and wait for response.

Returns a Promise that resolves with the response data or rejects with an error.

### bridge.on(event, handler)

Subscribe to native events. Returns an unsubscribe function.

### bridge.off(event, handler?)

Unsubscribe from native events.

### bridge.isAvailable()

Check if the native bridge is available.

### bridge.use(middleware)

Add middleware to the bridge pipeline.

## Platform Adapters

The bridge automatically selects the appropriate adapter based on the detected platform:

- **iOS**: Uses `webkit.messageHandlers.tsBridge`
- **Android**: Uses `window.AndroidBridge` or `window.Android`
- **Web**: Uses mock adapter (bridge calls will fail gracefully)

## Middleware

Built-in middleware:

- **LoggerMiddleware**: Logs all bridge communication
- **ValidatorMiddleware**: Validates messages against schemas

Create custom middleware by implementing the `Middleware` interface from `@ts-bridge/shared`.

## License

MIT
