# ts-bridge Project Context

## Project Overview

**ts-bridge** is a TypeScript-based Type-Safe WebView-Native Bridge library for seamless communication between web applications and native platforms (iOS, Android, React Native).

### Core Problem Solved

When building hybrid applications that use WebView to display web content, communication between the web layer (JavaScript/TypeScript) and native layer (iOS/Android) typically lacks type safety, leading to runtime errors and difficult debugging.

### Key Features

1. **Compile-Time Type Safety**: Full TypeScript support with strict typing for all bridge communications
2. **Platform Abstraction**: Automatically detects and adapts to iOS (webkit.messageHandlers), Android (JavascriptInterface), or web environments
3. **Middleware Pipeline**: Extensible request/response processing with built-in logging and validation
4. **Plugin System**: Modular plugins for common native features (Camera, Location, Storage, Biometric)
5. **DevTools Integration**: Real-time visualization and debugging of all bridge communications
6. **Request Queue Management**: Handles concurrent requests with deduplication and timeout handling
7. **Event Subscriptions**: Bidirectional communication - web can call native, native can emit events to web

## Architecture

### Monorepo Structure

```
ts-bridge/
├── packages/
│   ├── shared/        ✅ COMPLETED - Shared types and schemas (Single Source of Truth)
│   ├── core/          ✅ COMPLETED - Web-side bridge engine
│   ├── native/        🚧 NEXT - React Native host implementation
│   ├── devtools/      ⏳ PENDING - Communication visualization & debugging
│   └── plugins/       ⏳ PENDING - Standard plugins (Camera, Location, Storage, Biometric)
├── apps/
│   ├── example-app/   ⏳ PENDING - Demo React + Vite application
│   ├── docs/          ⏳ PENDING - VitePress documentation site
│   └── storybook/     ⏳ PENDING - Storybook component playground
└── [root config files]
```

### Technology Stack

- **Monorepo**: Turborepo 2.x with pnpm workspaces
- **Language**: TypeScript 5.4+ (Strict mode)
- **Build Tool**: tsup (esbuild-based) for dual ESM/CJS output
- **Testing**: Vitest with happy-dom
- **Validation**: Zod for runtime schema validation
- **Documentation**: VitePress + TypeDoc
- **CI/CD**: GitHub Actions + Changesets

## Package Details

### @ts-bridge/shared (✅ Completed)

**Purpose**: Single source of truth for all types and schemas

**Key Exports**:
- `BridgeMessage<T>` - Request message type
- `BridgeResponse<T>` - Response message type
- `BridgeError` - Error type with code and details
- `BridgeEvent<T>` - Native-initiated event type
- `Bridge` - Web-side bridge interface
- `BridgeHost` - Native-side bridge interface
- `Middleware` - Middleware interface
- `WebPlugin`/`NativePlugin` - Plugin interfaces
- Zod schemas for runtime validation

**Status**: Build passing, 5 tests passing

### @ts-bridge/core (✅ Completed)

**Purpose**: Web-side bridge engine with complete communication infrastructure

**Key Components**:
- `BridgeManager` - Main orchestrator (public API)
- `CallbackRegistry` - Matches responses to requests with timeout handling
- `MessageQueue` - Manages concurrent requests with deduplication
- `NativeAdapter` - Platform detection and abstraction (iOS/Android/Web)
- `IOSAdapter` - webkit.messageHandlers integration
- `AndroidAdapter` - JavaScript interface integration
- `MiddlewarePipeline` - Executes middleware in sequence
- `LoggerMiddleware` - Logs all bridge communication
- `ValidatorMiddleware` - Validates messages against schemas
- `PluginRegistry` - Manages web-side plugins

**Public API**:
```typescript
const bridge = createBridge(config);
await bridge.call<Payload, Response>('action', payload);
const unsubscribe = bridge.on('event', handler);
bridge.use(middleware);
bridge.registerPlugin(plugin);
```

**Status**: Build passing, 7 tests passing

### @ts-bridge/native (🚧 Next Implementation)

**Purpose**: React Native host implementation - receives and processes web requests

**Planned Components**:
- `BridgeHost` - RN-side bridge host
- `MessageHandler` - WebView message handling
- `PluginHost` - Native plugin executor
- `PermissionManager` - OS permission handling

**Dependencies**: @ts-bridge/shared, react-native, react-native-webview

### @ts-bridge/devtools (⏳ Pending)

**Purpose**: Communication visualization and debugging tools

**Planned Components**:
- `DevToolsMiddleware` - Intercepts all messages
- `TimeTracker` - Performance monitoring
- `MessageTimeline` - React component for visual timeline
- `RequestInspector` - Detail inspector component
- `StructuredLogger` - Advanced logging

### @ts-bridge/plugins (⏳ Pending)

**Purpose**: Standard plugins for common native features

**Planned Plugins**:
- Camera (capture photos, video)
- Location (GPS, geofencing)
- Storage (secure key-value storage)
- Biometric (fingerprint, face ID)

Each plugin has web-side and native-side implementations.

## Communication Flow

1. **Web → Native Call**:
   ```
   Web App calls bridge.call('getUserData', { userId: '123' })
   ↓
   Middleware pipeline processes request
   ↓
   Message queued with unique ID
   ↓
   Platform adapter sends to native (iOS or Android)
   ↓
   Native processes and responds
   ↓
   Middleware pipeline processes response
   ↓
   Promise resolves with typed response
   ```

2. **Native → Web Event**:
   ```
   Native emits event (e.g., location update)
   ↓
   Web receives event via message handler
   ↓
   Event router calls registered handlers
   ↓
   Web app reacts to event
   ```

## Design Decisions

### Type Safety Strategy
- All types defined in `@ts-bridge/shared` (single source of truth)
- Generic request-response mapping: `call<TPayload, TResponse>`
- Zod for runtime validation at boundaries
- No `any` types - strict TypeScript throughout

### Communication Protocol
- Unique message ID for request-response matching
- Timeout handling for all bridge calls (configurable, default 30s)
- Structured error types with error codes
- Message queue prevents race conditions

### Plugin Architecture
- Separate web and native implementations
- Permission chain checks OS permissions before execution
- Mock providers for web-only development
- Lazy loading - plugins loaded on-demand

### Performance
- Request deduplication prevents duplicate calls
- Turborepo caching for fast builds
- Tree-shakeable exports for minimal bundle size
- Efficient message serialization

## Development Commands

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm type-check

# Lint
pnpm lint

# Format
pnpm format

# Clean all build outputs
pnpm clean
```

## Current Status

**Completed** (2/6 packages):
- ✅ Root workspace configuration
- ✅ @ts-bridge/shared (5 tests passing)
- ✅ @ts-bridge/core (7 tests passing)

**Next Up**:
- 🚧 @ts-bridge/native - React Native host implementation

**Remaining**:
- ⏳ @ts-bridge/devtools
- ⏳ @ts-bridge/plugins
- ⏳ apps/example-app
- ⏳ apps/docs
- ⏳ apps/storybook
- ⏳ CI/CD setup

## Known Issues

1. **Minor Build Warning**: `@ts-bridge/core` has a rollup warning about mixing named and default exports. This doesn't affect functionality but could be resolved by using named exports only.

2. **Limited Test Coverage**: Current tests cover basic initialization and configuration. Need to add more comprehensive tests for:
   - Actual message sending/receiving
   - Timeout handling
   - Error scenarios
   - Middleware execution order
   - Plugin lifecycle

## Future Enhancements

1. **TypeScript Schema Generation**: Automatic generation of request-response type definitions from schemas
2. **Performance Monitoring**: Built-in performance tracking and reporting
3. **Offline Queue**: Queue messages when native is unavailable
4. **Message Replay**: Record and replay message sequences for testing
5. **Custom Adapters**: Support for other platforms (Electron, Cordova, etc.)

## Contributing

This is an open-source project. Contributions are welcome!

### Development Workflow
1. Clone the repository
2. Run `pnpm install`
3. Make changes in relevant package
4. Run `pnpm build` and `pnpm test`
5. Submit PR with clear description

### Code Standards
- Strict TypeScript - no `any` types
- Full test coverage for new features
- Documentation for public APIs
- Conventional commits for changelog generation

---

**Last Updated**: 2026-01-19
**Current Phase**: Package Implementation (Step 4: @ts-bridge/native)
