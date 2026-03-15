# Plugin System Redesign

## Goal

Redesign ts-bridge's plugin system so that a single `definePlugin()` definition provides:
- ActionMap types (payload/response) via pure TypeScript generics
- Client-side convenience methods (framework-agnostic)
- Host-side typed handler signatures

Web developers install `@ts-bridge/plugins`, use hooks, and never touch native code. App developers implement typed handlers using any native library they prefer.

## Architecture

**Core principle:** ts-bridge enforces the **contract** (types), not the **implementation** (native libraries).

**Type-first:** No Zod dependency required. Plugin types are pure TypeScript. Runtime validation is optional via a separate `withValidation` utility.

```
definePlugin<TActions>({ name, methods })
       │
       ├── .host() → typed handler signatures (for app developers)
       ├── methods  → convenience functions (for web developers)
       └── TActions → ActionMap types (shared, compile-time)
```

## Plugin Definition

### `definePlugin()` Type Signature

```typescript
// ActionMap shape — pure TypeScript, no Zod
interface ActionDefinitionShape {
  payload: unknown;
  response: unknown;
}

// Plugin definition input
interface PluginInput<
  TName extends string,
  TActions extends Record<string, ActionDefinitionShape>,
  TMethods,
> {
  name: TName;
  methods?: (call: PluginCall<TActions>) => TMethods;
}

// Typed call function — constrained to THIS plugin's actions only
type PluginCall<TActions extends Record<string, ActionDefinitionShape>> = <
  K extends keyof TActions & string,
>(
  action: K,
  payload: TActions[K]['payload'],
) => Promise<TActions[K]['response']>;

// Return type of definePlugin
interface PluginInstance<
  TName extends string,
  TActions extends Record<string, ActionDefinitionShape>,
  TMethods,
> {
  name: TName;
  _actionMap: TActions;
  methods: (call: PluginCall<TActions>) => TMethods;
  host: (handlers: HostHandlers<TActions>) => HostPluginResult;
}

// Host handlers use FULL action names (same keys as TActions)
type HostHandlers<TActions extends Record<string, ActionDefinitionShape>> = {
  [K in keyof TActions & string]: (
    payload: TActions[K]['payload'],
    context: RequestContext,
  ) => Promise<TActions[K]['response']> | TActions[K]['response'];
};

// What .host() returns — consumed by useBridgeHost
interface HostPluginResult {
  handlers: Record<string, (payload: any, context: any) => Promise<any>>;
  pluginName: string;
}
```

### `definePlugin()` Function

```typescript
function definePlugin<
  TActions extends Record<string, ActionDefinitionShape>,
  TName extends string = string,
  TMethods = unknown,
>(input: PluginInput<TName, TActions, TMethods>): PluginInstance<TName, TActions, TMethods>;
```

### Example — Official Preset

```typescript
// packages/plugins/src/presets/camera.ts

type CameraActions = {
  'camera.takePhoto': {
    payload: { quality?: number };
    response: { uri: string; width: number; height: number };
  };
  'camera.pickImage': {
    payload: { multiple?: boolean };
    response: { images: { uri: string }[] };
  };
  'camera.recordVideo': {
    payload: { maxDuration?: number };
    response: { uri: string; duration: number };
  };
};

export const camera = definePlugin<CameraActions>({
  name: 'camera',
  methods: (call) => ({
    takePhoto: (opts?: { quality?: number }) =>
      call('camera.takePhoto', opts ?? {}),
    pickImage: (opts?: { multiple?: boolean }) =>
      call('camera.pickImage', opts ?? {}),
    recordVideo: (opts?: { maxDuration?: number }) =>
      call('camera.recordVideo', opts ?? {}),
  }),
});
```

### Example — Custom Plugin

```typescript
// Minimal: just types, no methods needed
type PaymentActions = {
  'payment.checkout': {
    payload: { amount: number; currency: string };
    response: { transactionId: string; success: boolean };
  };
};

export const payment = definePlugin<PaymentActions>({
  name: 'payment',
  methods: (call) => ({
    checkout: (amount: number, currency: string) =>
      call('payment.checkout', { amount, currency }),
  }),
});
```

**Properties:**
- `TActions` — Generic type parameter defining the ActionMap (pure TypeScript)
- `name` — Plugin identifier (string literal for type inference)
- `methods` — Optional factory function receiving a typed `call` constrained to this plugin's actions only

**Naming convention:** Action keys are `'{pluginName}.{methodName}'` (e.g., `'camera.takePhoto'`). The plugin name prefix prevents collisions when multiple plugins are merged.

## Client Side (Web Developer)

### Setup (once per app)

```typescript
// bridge.ts
import { createBridgeReact } from '@ts-bridge/react';
import { camera, storage } from '@ts-bridge/plugins';

export const { BridgeProvider, usePlugin, useAction } = createBridgeReact({
  plugins: [camera, storage],
});
```

`createBridgeReact({ plugins })`:
- Merges ActionMaps from all plugins into an **intersection type** (`CameraActions & StorageActions`)
- Returns `usePlugin()` hook that binds plugin methods to the bridge
- Returns `useAction()` hook with full action name autocompletion across all plugins

Custom (non-plugin) actions can be added via the existing generic parameter:

```typescript
type CustomActions = {
  'myapp.sync': { payload: { force: boolean }; response: { synced: number } };
};

export const { BridgeProvider, usePlugin, useAction } = createBridgeReact<CustomActions>({
  plugins: [camera, storage],
});
// useAction autocompletes: 'camera.takePhoto' | 'camera.pickImage' | 'storage.getItem' | ... | 'myapp.sync'
```

### Usage — convenience methods

```tsx
import { usePlugin } from './bridge';
import { camera } from '@ts-bridge/plugins';

function CameraScreen() {
  const { takePhoto, pickImage } = usePlugin(camera);
  // takePhoto: (opts?: { quality?: number }) => Promise<{ uri: string; width: number; height: number }>

  return <button onClick={() => takePhoto({ quality: 0.8 })}>Take Photo</button>;
}
```

`usePlugin(plugin)` is typed to only accept plugins that were registered in `createBridgeReact({ plugins })`. Passing an unregistered plugin is a compile error.

### Usage — generic action

```tsx
import { useAction } from './bridge';

function SyncScreen() {
  const sync = useAction('myapp.sync');
  return <button onClick={() => sync.execute({ force: true })}>Sync</button>;
}
```

## Host Side (App Developer)

```typescript
import { useBridgeHost } from '@ts-bridge/react-native';
import { camera, storage } from '@ts-bridge/plugins';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

function NativeApp() {
  const { webViewProps } = useBridgeHost({
    plugins: [
      camera.host({
        'camera.takePhoto': async (payload) => {
          // payload: { quality?: number } — auto-inferred
          const result = await launchCamera({ quality: payload.quality });
          const asset = result.assets![0];
          return { uri: asset.uri!, width: asset.width!, height: asset.height! };
          // return type enforced: { uri: string; width: number; height: number }
        },
        'camera.pickImage': async (payload) => {
          const result = await launchImageLibrary({
            selectionLimit: payload.multiple ? 0 : 1,
          });
          return { images: result.assets!.map((a) => ({ uri: a.uri! })) };
        },
        'camera.recordVideo': async (payload) => {
          const result = await launchCamera({ mediaType: 'video' });
          return { uri: result.assets![0].uri!, duration: 0 };
        },
        // Missing handler → compile error
      }),

      storage.host({
        'storage.getItem': async (payload) => ({
          value: await AsyncStorage.getItem(payload.key),
        }),
        'storage.setItem': async (payload) => {
          await AsyncStorage.setItem(payload.key, payload.value);
          return {};
        },
        'storage.removeItem': async (payload) => {
          await AsyncStorage.removeItem(payload.key);
          return {};
        },
        'storage.clear': async () => {
          await AsyncStorage.clear();
          return {};
        },
        'storage.getAllKeys': async () => ({
          keys: (await AsyncStorage.getAllKeys()) as string[],
        }),
      }),
    ],

    // Non-plugin handlers still work (existing API, backward compatible)
    handlers: {
      'legacy.action': async (payload) => ({ ok: true }),
    },
  });

  return <WebView {...webViewProps} source={{ uri: 'https://my-app.com' }} />;
}
```

**`.host()` return value:** A `HostPluginResult` containing a `handlers` map (action name → handler function) and `pluginName` for debugging. `useBridgeHost` iterates over the `plugins` array, extracts each `HostPluginResult.handlers`, and registers them on the `BridgeHost` instance — the same mechanism as the existing `handlers` option, just automated.

**`.host()` enforces:**
- All actions must have a handler (missing = compile error)
- Handler payload type matches the plugin's ActionMap
- Handler return type matches the plugin's ActionMap
- Typos in action names are caught at compile time

**`.host()` does NOT enforce:**
- Which native library is used internally
- How the handler is implemented
- Native library versions

## Optional Runtime Validation

Runtime validation is **not built into `definePlugin`**. For cases where defense-in-depth is needed (e.g., untrusted WebView content), a separate `withValidation` utility wraps a plugin with Zod schemas:

```typescript
import { withValidation } from '@ts-bridge/plugins/validation';
import { z } from 'zod';

const cameraValidated = withValidation(camera, {
  'camera.takePhoto': {
    payload: z.object({ quality: z.number().min(0).max(1).optional() }),
    response: z.object({ uri: z.string(), width: z.number(), height: z.number() }),
  },
});

// Use cameraValidated.host({ ... }) — validates at runtime before handler runs
```

- Zod is a **peer dependency of `@ts-bridge/plugins/validation`**, not of `@ts-bridge/plugins`
- Most apps will never need this
- Validation runs host-side only (the trust boundary)

## Error Handling

**Handler errors:** If a host handler throws, the error is caught by `BridgeHost.handleMessage()` (existing behavior) and returned as a `BridgeResponse` with `success: false`. Unchanged from current system.

**Client-side errors:** `bridge.call()` rejects the promise. `useAction().execute()` catches it and sets the `error` state. Unchanged from current system.

## Edge Cases

**Empty plugins array:** `createBridgeReact({ plugins: [] })` degrades to current behavior — `useAction` has no autocompletion from plugins, but custom `TActions` generic still works.

**Duplicate action names across plugins:** Action names are namespaced by convention (`'{pluginName}.{method}'`). If two plugins define the same action key, the intersection merge produces `never` — a clear compile error at usage. Runtime: `useBridgeHost` throws if duplicate action names detected.

**Unregistered plugin in `usePlugin()`:** `usePlugin` is typed to only accept plugin instances that were passed to `createBridgeReact({ plugins })`. Unregistered plugin = compile error.

**Partial `.host()` implementations:** All handlers are required by default. Initial implementation requires all handlers — partial support can be added later.

**`methods` omitted:** `methods` is optional. Plugins without `methods` are contract-only — usable with `useAction()` but not `usePlugin()`.

## Package Structure

### Changes

| Package | Change | Details |
|---|---|---|
| `@ts-bridge/plugins` | **Rewrite** | Class-based → `definePlugin` + presets |
| `@ts-bridge/react` | **Modify** | Add `plugins` option to `createBridgeReact`, add `usePlugin()` |
| `@ts-bridge/react-native` | **Modify** | Add `plugins` option to `useBridgeHost`, support `.host()` |
| `@ts-bridge/shared` | Keep | Existing types preserved |
| `@ts-bridge/core` | Keep | BridgeManager unchanged |

### New file structure for plugins

```
packages/plugins/
├── src/
│   ├── define.ts           # definePlugin() function
│   ├── types.ts            # PluginInstance, HostHandlers, MergePlugins, etc.
│   ├── presets/
│   │   ├── camera.ts
│   │   ├── storage.ts
│   │   ├── location.ts
│   │   ├── biometric.ts
│   │   └── haptics.ts
│   ├── validation.ts       # withValidation() — optional Zod wrapper
│   └── index.ts            # re-export definePlugin + presets (NOT validation)
```

### Removed

- `BaseWebPlugin`, `BaseNativePlugin` classes
- `CameraPlugin`, `StoragePlugin`, etc. (class-based plugins)
- `CameraNativePlugin`, etc. (native stubs — app dev implements directly)
- `PluginRegistry` class (replaced by plugins array)
- Zod as a required dependency

### Added

- `definePlugin()` — plugin definition function (pure TypeScript, no Zod)
- `.host()` — host handler generation from plugin
- `usePlugin()` — React hook for plugin convenience methods
- `withValidation()` — optional Zod runtime validation wrapper
- `haptics` preset

## Official Presets

Shipped with `@ts-bridge/plugins`:

| Preset | Actions |
|---|---|
| `camera` | `camera.takePhoto`, `camera.pickImage`, `camera.recordVideo` |
| `storage` | `storage.getItem`, `storage.setItem`, `storage.removeItem`, `storage.clear`, `storage.getAllKeys` |
| `location` | `location.getCurrentPosition`, `location.watchPosition`, `location.clearWatch` |
| `biometric` | `biometric.checkAvailability`, `biometric.authenticate` |
| `haptics` | `haptics.impact`, `haptics.notification`, `haptics.selection` |

Each preset is tree-shakeable — unused presets are stripped from the bundle.

## Backward Compatibility

- `createBridgeReact()` without `plugins` still works (existing code)
- `useBridgeHost({ handlers })` without `plugins` still works
- `createBridge<TActions>()` from core is unchanged
- Migration path: replace class plugin usage with `usePlugin()` / `.host()`
