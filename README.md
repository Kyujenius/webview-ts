# ts-bridge

Type-safe WebView-Native bridge library for TypeScript

## Overview

ts-bridge is a comprehensive library for building type-safe communication between web applications and native platforms (iOS, Android, React Native) in WebView environments. It provides compile-time type safety, visual debugging tools, and a plugin-based architecture for extensibility.

## Key Features

- **Type Safety**: Compile-time verification of all WebView-Native communication
- **Visual Debugging**: Real-time visualization of message flow and performance metrics
- **Platform Abstraction**: Unified API across iOS, Android, and React Native
- **Plugin System**: Standard plugins for common features (camera, location, storage, biometric)
- **Mock Providers**: Develop web apps independently without native environment
- **Middleware Architecture**: Extensible logging, validation, and monitoring

## Packages

This monorepo contains the following packages:

### Core Packages

- `@ts-bridge/shared` - Shared types and schemas (Single Source of Truth)
- `@ts-bridge/core` - Web-side bridge engine with middleware pipeline
- `@ts-bridge/native` - React Native host implementation
- `@ts-bridge/devtools` - Communication visualization and debugging tools
- `@ts-bridge/plugins` - Standard plugins (camera, location, storage, biometric)

### Applications

- `apps/example-app` - Demo application showcasing all features
- `apps/docs` - Documentation site (VitePress)
- `apps/storybook` - Interactive component playground

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run example app
pnpm --filter example-app dev
```

## Development

```bash
# Start development mode (watch all packages)
pnpm dev

# Run tests in watch mode
pnpm test:watch

# Lint all packages
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

## Project Structure

```
ts-bridge/
├── apps/
│   ├── docs/              # Documentation site
│   ├── storybook/         # Component playground
│   └── example-app/       # Demo application
├── packages/
│   ├── core/              # Core bridge engine
│   ├── native/            # React Native host
│   ├── shared/            # Shared types & schemas
│   ├── devtools/          # Debugging tools
│   └── plugins/           # Plugin system
└── ...configuration files
```

## Architecture

ts-bridge follows three core design principles:

1. **Strict Request-Response Mapping** - Every action has strongly-typed payload and response
2. **Opaque Internal Logic** - Implementation details (callback IDs, postMessage) are hidden
3. **Single Source of Truth** - Web and native share identical type definitions

## Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct.

## License

MIT
