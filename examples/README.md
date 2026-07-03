# webview-ts Examples

This directory contains feature-complete example applications demonstrating all webview-ts capabilities across multiple frameworks and platforms.

## Feature Coverage Map

| Feature                         | React Web            | Vue Web              | React Native          | Plugins                    | Notes                                                      |
| ------------------------------- | -------------------- | -------------------- | --------------------- | -------------------------- | ---------------------------------------------------------- |
| **Contract & Types**            | ✅ All plugins       | ✅ All plugins       | ✅ Host handlers      | ✅ Defined                 | Single source of truth shared across frameworks            |
| **Schema Validation**           | ✅ ValidationPage    | ✅ ValidationPage    | ✅ Host handlers      | ✅ Zod schemas             | Runtime validation on inbound payloads and responses       |
| **VALIDATION_ERROR Handling**   | ✅ ValidationPage    | ✅ ValidationPage    | ✅ storage, clipboard | —                          | Structured error details with message + path               |
| **Fallback Mode (Browser Dev)** | ✅ All actions       | ✅ All actions       | —                     | ✅ All plugins             | Develop without native app via `withFallback()`            |
| **Global Interceptors**         | ✅ MiddlewarePage    | ✅ MiddlewarePage    | —                     | —                          | Request/response transform chains at bridge level          |
| **Per-Action Interceptors**     | ✅ calendar.addEvent | ✅ calendar.addEvent | —                     | ✅ calendar plugin         | Modify or inspect individual action requests               |
| **Lifecycle onCall (Client)**   | ✅ LifecyclePage     | ✅ LifecyclePage     | —                     | —                          | Subscribe to `call:start`, `call:end`, `call:error` events |
| **Lifecycle onCall (Host)**     | —                    | —                    | ✅ App.tsx call log   | ✅ Host handlers           | Log/telemetry on handler execution (client+host sides)     |
| **Per-Action Timeout**          | ✅ PhonePage         | ✅ PhonePage         | ✅ Host               | ✅ phone.call (5000ms)     | Configurable timeout per action in contract                |
| **Per-Action Retry**            | ✅ PhonePage         | ✅ PhonePage         | ✅ Host               | ✅ phone.call (2 attempts) | Automatic retry with exponential backoff config            |
| **Per-Action Cache**            | ✅ DevicePage        | ✅ DevicePage        | ✅ Host               | ✅ device.getInfo          | Cache response for duplicate calls within TTL              |
| **Host→Client Events**          | ✅ LocationPage      | ✅ LocationPage      | —                     | ✅ location, device events | Subscribe to server-initiated `event()` messages           |
| **Multi-WebView Routing**       | —                    | —                    | ✅ App.tsx (A/B)      | —                          | ConnectionRegistry routes events between WebViews          |
| **DevTools**                    | ✅ Auto-connects     | ✅ Auto-connects     | —                     | —                          | Zero-config real-time inspector at ws://localhost:4000     |
| **CLI Schema Export**           | —                    | —                    | —                     | ✅ `pnpm schema:export`    | Export contract as JSON Schema for codegen/docs            |

## Quick Reference

### React Web Example

- **Location:** `examples/react/`
- **Run:** `pnpm dev` (starts at http://localhost:3000)
- **Pages:** HomePage, CameraPage, LocationPage, StoragePage, BiometricPage, PhonePage, CalendarPage, DevicePage, SharePage, **LifecyclePage**, **MiddlewarePage**, **ValidationPage**
- **Highlights:** All plugin demos, global/per-action interceptors, client-side lifecycle logging, validation error handling

### Vue Web Example

- **Location:** `examples/vue/`
- **Run:** `pnpm dev`
- **Pages:** Same as React (Vue 3 composables)
- **Highlights:** Vue-specific setup with `createBridgeVue()`, composables instead of hooks

### React Native Example

- **Location:** `examples/react-native/`
- **Run:** `npx react-native run-ios` or `run-android`
- **Highlights:** Two WebViews with shared ConnectionRegistry, host-side `onCall()` lifecycle logging (useful for telemetry), validation demo handlers

### Plugin Definitions

- **Location:** `examples/plugins/src/`
- **Plugins:** camera, location, biometric, haptics, phone, calendar, device, share, storage, clipboard, validationDemo
- **Features:** Zod schema validation, per-action options (timeout, retry, cache, interceptors), mock fallback implementations
- **Export:** Run `pnpm schema:export` to generate JSON Schema files in `schemas/` directory

## Development Setup

```bash
# Install all workspace dependencies
pnpm install

# Run all web examples (React + Vue) in dev mode
pnpm dev

# Run DevTools server (real-time message inspector)
pnpm devtools

# Export plugin contracts to JSON Schema
cd examples/plugins && pnpm schema:export

# Run React Native example
npx react-native run-ios
# or
npx react-native run-android
```

## Key Concepts Demonstrated

### 1. Contract-First Design

All frameworks (React, Vue, React Native) use the same plugin contract definitions from `examples/plugins`. See how:

- `examples/react/src/bridge.ts` imports plugins
- `examples/react-native/hosts/index.ts` implements handlers
- Both sides have 100% type safety from a single source of truth

### 2. Schema Validation in Action

- **Plugin definition:** `examples/plugins/src/validation-demo/plugin.ts` — response schema
- **Client handling:** `examples/react/src/pages/ValidationPage.tsx` — catches `VALIDATION_ERROR` with structured details
- **Server implementation:** `examples/react-native/hosts/validation-demo.ts` — deliberately returns wrong shape to trigger validation

### 3. Request/Response Interception

- **Global interceptor:** `examples/react/src/pages/MiddlewarePage.tsx` — logger and auth-token injection
- **Per-action interceptor:** `examples/plugins/src/calendar/plugin.ts` — "stamp-source" modifies request for every `addEvent` call

### 4. Lifecycle Tracing

- **Client side:** `examples/react/src/pages/LifecyclePage.tsx` — real-time call progress with durations
- **Host side:** `examples/react-native/App.tsx` — `onCall()` for telemetry (compatible with Datadog/Sentry)

### 5. Multi-Platform Fallback

All plugins in `examples/plugins/src/` have `.withFallback()` mocks. Develop the React web UI without any native code — it works in a browser.

## Testing a Feature

### Test Schema Validation

1. `cd examples/react && pnpm dev`
2. Navigate to **ValidationPage**
3. Click "Get Broken Profile" to see `VALIDATION_ERROR` with structured issue details

### Test Lifecycle Events

1. `cd examples/react && pnpm dev`
2. Navigate to **LifecyclePage**
3. Click any action button
4. Watch the live log show `call:start`, `call:end`, and duration

### Test Interceptors

1. `cd examples/react && pnpm dev`
2. Navigate to **MiddlewarePage**
3. Click "Fetch Device" — notice the global logger and auth-token interceptors fire
4. Open DevTools (next section) to see all traffic

### Test DevTools

1. Terminal 1: `pnpm devtools` (starts ws://localhost:4000)
2. Terminal 2: `pnpm dev` in React example
3. Open http://localhost:5173 (or wherever your DevTools dashboard is)
4. Navigate any example page and watch messages appear in real-time

### Test Multi-WebView

1. Open `examples/react-native/App.tsx`
2. Note the two `useBridgeHost()` calls with shared `ConnectionRegistry`
3. Events from one WebView can route to the other via `sendEvent(target: TARGET.BROADCAST)`

## Next Steps

- **Extend a plugin:** Add a new action to `examples/plugins/src/camera/plugin.ts` with schema and fallback, then use it in React/Vue/RN
- **Add telemetry:** Use `hostBridge.onCall()` in React Native to ship events to Datadog/Sentry
- **Generate SDKs:** Run `pnpm schema:export` in examples/plugins, then use the JSON Schema to generate iOS/Android types
- **Custom interceptor:** Add a request interceptor to `examples/react/src/bridge.ts` (e.g., rate limiting, batching)

## File Structure

```
examples/
├── plugins/             # Contract definitions (single source of truth)
│   ├── src/
│   │   ├── camera/      # Zod schema + plugin definition + fallback
│   │   ├── location/    # Event schema, per-action timeout/retry/cache
│   │   ├── validation-demo/
│   │   └── ... 9 more
│   ├── schemas/         # Generated JSON Schema (run pnpm schema:export)
│   └── package.json     # pnpm schema:export script
├── react/               # React web client + framework example
│   ├── src/
│   │   ├── bridge.ts    # createBridgeReact + all plugins
│   │   ├── pages/
│   │   │   ├── LifecyclePage.tsx
│   │   │   ├── MiddlewarePage.tsx
│   │   │   ├── ValidationPage.tsx
│   │   │   └── ... 9 more
│   │   └── ...
│   └── ...
├── vue/                 # Vue 3 web client (same pages, composables)
│   ├── src/
│   │   ├── bridge.ts    # createBridgeVue
│   │   ├── pages/
│   │   └── ...
│   └── ...
├── react-native/        # React Native host (two WebViews, CallLog, handlers)
│   ├── App.tsx          # Multi-WebView with ConnectionRegistry + onCall logging
│   ├── hosts/           # Handler implementations (one per plugin)
│   └── ...
└── README.md            # This file
```

## License

MIT
