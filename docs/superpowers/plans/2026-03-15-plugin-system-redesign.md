# Plugin System Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the plugin system so `definePlugin<TActions>()` provides typed ActionMap, client convenience methods, and host handler signatures — all from pure TypeScript, no Zod required.

**Architecture:** Three layers built sequentially: (1) plugin core (`definePlugin`, types, `.host()`), (2) official presets (camera, storage, location, biometric, haptics), (3) framework integrations (`createBridgeReact({ plugins })` + `usePlugin()`, `useBridgeHost({ plugins })`). Old class-based plugins are deleted after new system is verified.

**Tech Stack:** TypeScript 5.4, Vitest, React 18+, pnpm workspaces, tsup

**Conventions:**
- Tests are co-located with source files (e.g., `define.ts` → `define.test.ts`)
- Vitest with globals enabled, `node` environment for plugins, `happy-dom` for react
- tsup for dual ESM/CJS builds with dts

---

## Dependency Order

```
1. Plugin types + definePlugin (plugins package)     ← foundation
2. Official presets (plugins package)                ← uses definePlugin
3. createBridgeReact plugin integration (react)      ← uses plugin types
4. useBridgeHost plugin integration (react-native)   ← uses plugin types
5. Delete old class-based plugins                    ← cleanup
6. Final verification                               ← build + test all
```

---

## Chunk 1: Plugin Core — `definePlugin()` and Types

### Task 1.1: Create plugin type definitions

**Files:**
- Create: `packages/plugins/src/types.ts`
- Test: `packages/plugins/src/types.test.ts`

- [ ] **Step 1: Write the failing type test**

```typescript
// packages/plugins/src/types.test.ts
import { describe, it, expectTypeOf } from 'vitest';
import type {
  PluginInstance,
  PluginCall,
  HostHandlers,
  HostPluginResult,
  MergePluginActions,
  ActionDefinitionShape,
} from './types';

type TestActions = {
  'test.echo': { payload: { message: string }; response: { echoed: string } };
  'test.add': { payload: { a: number; b: number }; response: { sum: number } };
};

describe('Plugin types', () => {
  it('PluginCall should constrain to plugin actions', () => {
    type Call = PluginCall<TestActions>;
    // call should accept 'test.echo' with correct payload
    type EchoResult = ReturnType<(c: Call) => ReturnType<typeof c<'test.echo'>>>;
    expectTypeOf<EchoResult>().toEqualTypeOf<Promise<{ echoed: string }>>();
  });

  it('HostHandlers should require all actions', () => {
    type Handlers = HostHandlers<TestActions>;
    expectTypeOf<Handlers>().toHaveProperty('test.echo');
    expectTypeOf<Handlers>().toHaveProperty('test.add');
  });

  it('MergePluginActions should merge multiple plugins', () => {
    type ActionsA = { 'a.one': { payload: { x: number }; response: { y: number } } };
    type ActionsB = { 'b.two': { payload: { m: string }; response: { n: string } } };
    type PluginA = PluginInstance<'a', ActionsA, unknown>;
    type PluginB = PluginInstance<'b', ActionsB, unknown>;
    type Merged = MergePluginActions<[PluginA, PluginB]>;
    expectTypeOf<Merged>().toHaveProperty('a.one');
    expectTypeOf<Merged>().toHaveProperty('b.two');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/plugins && pnpm vitest run src/types.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement types**

```typescript
// packages/plugins/src/types.ts

export interface ActionDefinitionShape {
  payload: unknown;
  response: unknown;
}

/** Typed call function — constrained to THIS plugin's actions only */
export type PluginCall<TActions extends Record<string, ActionDefinitionShape>> = <
  K extends keyof TActions & string,
>(
  action: K,
  payload: TActions[K]['payload'],
) => Promise<TActions[K]['response']>;

/** Plugin definition input */
export interface PluginInput<
  TName extends string,
  TActions extends Record<string, ActionDefinitionShape>,
  TMethods,
> {
  name: TName;
  methods?: (call: PluginCall<TActions>) => TMethods;
}

/** Return type of definePlugin — the plugin instance */
export interface PluginInstance<
  TName extends string,
  TActions extends Record<string, ActionDefinitionShape>,
  TMethods,
> {
  readonly name: TName;
  readonly _actionMap: TActions;
  readonly methods: (call: PluginCall<TActions>) => TMethods;
  readonly host: (handlers: HostHandlers<TActions>) => HostPluginResult;
}

/** Host handlers — keyed by full action name, typed payload/response */
export type HostHandlers<TActions extends Record<string, ActionDefinitionShape>> = {
  [K in keyof TActions & string]: (
    payload: TActions[K]['payload'],
    context: RequestContext,
  ) => Promise<TActions[K]['response']> | TActions[K]['response'];
};

/** Request context passed to host handlers */
export interface RequestContext {
  messageId: string;
  timestamp: number;
}

/** What .host() returns — consumed by useBridgeHost */
export interface HostPluginResult {
  handlers: Record<string, (payload: any, context: any) => Promise<any>>;
  pluginName: string;
}

/** Merge ActionMaps from multiple plugins into an intersection */
export type MergePluginActions<T extends PluginInstance<any, any, any>[]> =
  T extends [infer First extends PluginInstance<any, any, any>, ...infer Rest extends PluginInstance<any, any, any>[]]
    ? First['_actionMap'] & MergePluginActions<Rest>
    : {};

/** Extract plugin from a plugins array by reference */
export type PluginFromArray<
  TPlugins extends PluginInstance<any, any, any>[],
  TPlugin extends PluginInstance<any, any, any>,
> = TPlugin extends TPlugins[number] ? TPlugin : never;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/plugins && pnpm vitest run src/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/src/types.ts packages/plugins/src/types.test.ts
git commit -m "feat(plugins): add plugin type definitions for redesign"
```

---

### Task 1.2: Implement `definePlugin()` function

**Files:**
- Create: `packages/plugins/src/define.ts`
- Test: `packages/plugins/src/define.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/plugins/src/define.test.ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import { definePlugin } from './define';

type TestActions = {
  'test.echo': { payload: { message: string }; response: { echoed: string } };
  'test.greet': { payload: { name: string }; response: { greeting: string } };
};

describe('definePlugin', () => {
  const plugin = definePlugin<TestActions>({
    name: 'test',
    methods: (call) => ({
      echo: (message: string) => call('test.echo', { message }),
      greet: (name: string) => call('test.greet', { name }),
    }),
  });

  it('should preserve plugin name', () => {
    expect(plugin.name).toBe('test');
  });

  it('should have methods factory', () => {
    expect(typeof plugin.methods).toBe('function');
  });

  it('should have host function', () => {
    expect(typeof plugin.host).toBe('function');
  });

  it('should create host handlers result', () => {
    const result = plugin.host({
      'test.echo': async (payload) => ({ echoed: payload.message }),
      'test.greet': async (payload) => ({ greeting: `Hello ${payload.name}` }),
    });

    expect(result.pluginName).toBe('test');
    expect(typeof result.handlers['test.echo']).toBe('function');
    expect(typeof result.handlers['test.greet']).toBe('function');
  });

  it('.host() handlers should execute correctly', async () => {
    const result = plugin.host({
      'test.echo': async (payload) => ({ echoed: payload.message }),
      'test.greet': async (payload) => ({ greeting: `Hello ${payload.name}` }),
    });

    const echoResult = await result.handlers['test.echo']({ message: 'hi' }, { messageId: '1', timestamp: 0 });
    expect(echoResult).toEqual({ echoed: 'hi' });
  });

  it('should work without methods (contract-only)', () => {
    const contractOnly = definePlugin<TestActions>({ name: 'contract' });
    expect(contractOnly.name).toBe('contract');
    expect(typeof contractOnly.host).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/plugins && pnpm vitest run src/define.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement definePlugin**

```typescript
// packages/plugins/src/define.ts
import type {
  ActionDefinitionShape,
  PluginInput,
  PluginInstance,
  PluginCall,
  HostHandlers,
  HostPluginResult,
} from './types';

/**
 * Define a type-safe plugin. Pure TypeScript — no Zod required.
 *
 * @example
 * ```typescript
 * type MyActions = {
 *   'my.action': { payload: { key: string }; response: { value: string } };
 * };
 *
 * export const myPlugin = definePlugin<MyActions>({
 *   name: 'my',
 *   methods: (call) => ({
 *     doAction: (key: string) => call('my.action', { key }),
 *   }),
 * });
 * ```
 */
export function definePlugin<
  TActions extends Record<string, ActionDefinitionShape>,
  TName extends string = string,
  TMethods = unknown,
>(
  input: PluginInput<TName, TActions, TMethods>,
): PluginInstance<TName, TActions, TMethods> {
  const { name, methods } = input;

  return {
    name,
    _actionMap: {} as TActions, // phantom type — never accessed at runtime
    methods: methods ?? (() => ({} as TMethods)),
    host(handlers: HostHandlers<TActions>): HostPluginResult {
      // Wrap handlers to ensure async
      const wrappedHandlers: Record<string, (payload: any, context: any) => Promise<any>> = {};
      for (const [action, handler] of Object.entries(handlers)) {
        wrappedHandlers[action] = async (payload, context) =>
          (handler as any)(payload, context);
      }
      return { handlers: wrappedHandlers, pluginName: name };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/plugins && pnpm vitest run src/define.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/src/define.ts packages/plugins/src/define.test.ts
git commit -m "feat(plugins): implement definePlugin() function"
```

---

## Chunk 2: Official Presets

### Task 2.1: Camera preset

**Files:**
- Create: `packages/plugins/src/presets/camera.ts`
- Test: `packages/plugins/src/presets/camera.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// packages/plugins/src/presets/camera.test.ts
import { describe, it, expect } from 'vitest';
import { camera } from './camera';

describe('camera preset', () => {
  it('should have correct name', () => {
    expect(camera.name).toBe('camera');
  });

  it('should have methods factory', () => {
    const mockCall = async (action: string, payload: any) => {
      if (action === 'camera.takePhoto') return { uri: '/photo.jpg', width: 100, height: 100 };
      if (action === 'camera.pickImage') return { images: [{ uri: '/img.jpg' }] };
      if (action === 'camera.recordVideo') return { uri: '/video.mp4', duration: 10 };
      return {};
    };
    const methods = camera.methods(mockCall as any);
    expect(typeof methods.takePhoto).toBe('function');
    expect(typeof methods.pickImage).toBe('function');
    expect(typeof methods.recordVideo).toBe('function');
  });

  it('.host() should create handler result', () => {
    const result = camera.host({
      'camera.takePhoto': async () => ({ uri: '/p.jpg', width: 1, height: 1 }),
      'camera.pickImage': async () => ({ images: [] }),
      'camera.recordVideo': async () => ({ uri: '/v.mp4', duration: 0 }),
    });
    expect(result.pluginName).toBe('camera');
    expect(Object.keys(result.handlers)).toEqual([
      'camera.takePhoto', 'camera.pickImage', 'camera.recordVideo',
    ]);
  });

  it('methods should call through to bridge', async () => {
    const calls: any[] = [];
    const mockCall = async (action: string, payload: any) => {
      calls.push({ action, payload });
      return { uri: '/photo.jpg', width: 100, height: 100 };
    };
    const methods = camera.methods(mockCall as any);
    await methods.takePhoto({ quality: 0.8 });
    expect(calls[0]).toEqual({ action: 'camera.takePhoto', payload: { quality: 0.8 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/plugins && pnpm vitest run src/presets/camera.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement camera preset**

```typescript
// packages/plugins/src/presets/camera.ts
import { definePlugin } from '../define';

export type CameraActions = {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/plugins && pnpm vitest run src/presets/camera.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/src/presets/camera.ts packages/plugins/src/presets/camera.test.ts
git commit -m "feat(plugins): add camera preset"
```

---

### Task 2.2: Storage preset

**Files:**
- Create: `packages/plugins/src/presets/storage.ts`
- Test: `packages/plugins/src/presets/storage.test.ts`

- [ ] **Step 1: Write test + implementation**

```typescript
// packages/plugins/src/presets/storage.ts
import { definePlugin } from '../define';

export type StorageActions = {
  'storage.getItem': {
    payload: { key: string };
    response: { value: string | null };
  };
  'storage.setItem': {
    payload: { key: string; value: string };
    response: {};
  };
  'storage.removeItem': {
    payload: { key: string };
    response: {};
  };
  'storage.clear': {
    payload: {};
    response: {};
  };
  'storage.getAllKeys': {
    payload: {};
    response: { keys: string[] };
  };
};

export const storage = definePlugin<StorageActions>({
  name: 'storage',
  methods: (call) => ({
    getItem: (key: string) => call('storage.getItem', { key }),
    setItem: (key: string, value: string) => call('storage.setItem', { key, value }),
    removeItem: (key: string) => call('storage.removeItem', { key }),
    clear: () => call('storage.clear', {}),
    getAllKeys: () => call('storage.getAllKeys', {}),
  }),
});
```

```typescript
// packages/plugins/src/presets/storage.test.ts
import { describe, it, expect } from 'vitest';
import { storage } from './storage';

describe('storage preset', () => {
  it('should have correct name', () => {
    expect(storage.name).toBe('storage');
  });

  it('.host() should require all handlers', () => {
    const result = storage.host({
      'storage.getItem': async (p) => ({ value: 'val' }),
      'storage.setItem': async () => ({}),
      'storage.removeItem': async () => ({}),
      'storage.clear': async () => ({}),
      'storage.getAllKeys': async () => ({ keys: [] }),
    });
    expect(result.pluginName).toBe('storage');
    expect(Object.keys(result.handlers).length).toBe(5);
  });

  it('methods should pass correct payloads', async () => {
    const calls: any[] = [];
    const mockCall = async (action: string, payload: any) => {
      calls.push({ action, payload });
      return { value: null };
    };
    const methods = storage.methods(mockCall as any);
    await methods.getItem('myKey');
    expect(calls[0]).toEqual({ action: 'storage.getItem', payload: { key: 'myKey' } });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd packages/plugins && pnpm vitest run src/presets/storage.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/src/presets/storage.ts packages/plugins/src/presets/storage.test.ts
git commit -m "feat(plugins): add storage preset"
```

---

### Task 2.3: Location, Biometric, Haptics presets

**Files:**
- Create: `packages/plugins/src/presets/location.ts`
- Create: `packages/plugins/src/presets/biometric.ts`
- Create: `packages/plugins/src/presets/haptics.ts`
- Test: `packages/plugins/src/presets/location.test.ts`
- Test: `packages/plugins/src/presets/biometric.test.ts`
- Test: `packages/plugins/src/presets/haptics.test.ts`

- [ ] **Step 1: Implement location**

```typescript
// packages/plugins/src/presets/location.ts
import { definePlugin } from '../define';

export type LocationActions = {
  'location.getCurrentPosition': {
    payload: { enableHighAccuracy?: boolean; timeout?: number };
    response: { latitude: number; longitude: number; accuracy: number };
  };
  'location.watchPosition': {
    payload: { enableHighAccuracy?: boolean; interval?: number };
    response: { watchId: number };
  };
  'location.clearWatch': {
    payload: { watchId: number };
    response: {};
  };
};

export const location = definePlugin<LocationActions>({
  name: 'location',
  methods: (call) => ({
    getCurrentPosition: (opts?: { enableHighAccuracy?: boolean; timeout?: number }) =>
      call('location.getCurrentPosition', opts ?? {}),
    watchPosition: (opts?: { enableHighAccuracy?: boolean; interval?: number }) =>
      call('location.watchPosition', opts ?? {}),
    clearWatch: (watchId: number) =>
      call('location.clearWatch', { watchId }),
  }),
});
```

- [ ] **Step 2: Implement biometric**

```typescript
// packages/plugins/src/presets/biometric.ts
import { definePlugin } from '../define';

export type BiometricActions = {
  'biometric.checkAvailability': {
    payload: {};
    response: { available: boolean; biometricTypes: string[] };
  };
  'biometric.authenticate': {
    payload: { promptMessage?: string };
    response: { success: boolean; error?: string };
  };
};

export const biometric = definePlugin<BiometricActions>({
  name: 'biometric',
  methods: (call) => ({
    checkAvailability: () => call('biometric.checkAvailability', {}),
    authenticate: (promptMessage?: string) =>
      call('biometric.authenticate', { promptMessage }),
  }),
});
```

- [ ] **Step 3: Implement haptics**

```typescript
// packages/plugins/src/presets/haptics.ts
import { definePlugin } from '../define';

export type HapticsActions = {
  'haptics.impact': {
    payload: { style?: 'light' | 'medium' | 'heavy' };
    response: {};
  };
  'haptics.notification': {
    payload: { type: 'success' | 'warning' | 'error' };
    response: {};
  };
  'haptics.selection': {
    payload: {};
    response: {};
  };
};

export const haptics = definePlugin<HapticsActions>({
  name: 'haptics',
  methods: (call) => ({
    impact: (style?: 'light' | 'medium' | 'heavy') =>
      call('haptics.impact', { style }),
    notification: (type: 'success' | 'warning' | 'error') =>
      call('haptics.notification', { type }),
    selection: () => call('haptics.selection', {}),
  }),
});
```

- [ ] **Step 4: Write tests for all three** (same pattern as camera/storage tests — verify name, methods, .host())

```typescript
// packages/plugins/src/presets/location.test.ts
import { describe, it, expect } from 'vitest';
import { location } from './location';

describe('location preset', () => {
  it('should have correct name', () => { expect(location.name).toBe('location'); });
  it('.host() should create handlers', () => {
    const result = location.host({
      'location.getCurrentPosition': async () => ({ latitude: 0, longitude: 0, accuracy: 0 }),
      'location.watchPosition': async () => ({ watchId: 1 }),
      'location.clearWatch': async () => ({}),
    });
    expect(Object.keys(result.handlers).length).toBe(3);
  });
});
```

```typescript
// packages/plugins/src/presets/biometric.test.ts
import { describe, it, expect } from 'vitest';
import { biometric } from './biometric';

describe('biometric preset', () => {
  it('should have correct name', () => { expect(biometric.name).toBe('biometric'); });
  it('.host() should create handlers', () => {
    const result = biometric.host({
      'biometric.checkAvailability': async () => ({ available: true, biometricTypes: ['face'] }),
      'biometric.authenticate': async () => ({ success: true }),
    });
    expect(Object.keys(result.handlers).length).toBe(2);
  });
});
```

```typescript
// packages/plugins/src/presets/haptics.test.ts
import { describe, it, expect } from 'vitest';
import { haptics } from './haptics';

describe('haptics preset', () => {
  it('should have correct name', () => { expect(haptics.name).toBe('haptics'); });
  it('.host() should create handlers', () => {
    const result = haptics.host({
      'haptics.impact': async () => ({}),
      'haptics.notification': async () => ({}),
      'haptics.selection': async () => ({}),
    });
    expect(Object.keys(result.handlers).length).toBe(3);
  });
});
```

- [ ] **Step 5: Run all preset tests**

Run: `cd packages/plugins && pnpm vitest run src/presets/`
Expected: PASS (all 5 presets)

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/src/presets/
git commit -m "feat(plugins): add location, biometric, haptics presets"
```

---

### Task 2.4: Update plugins package index and build config

**Files:**
- Rewrite: `packages/plugins/src/index.ts`
- Modify: `packages/plugins/tsup.config.ts`
- Modify: `packages/plugins/package.json`

- [ ] **Step 1: Rewrite index.ts**

```typescript
// packages/plugins/src/index.ts

// Core
export { definePlugin } from './define';
export type {
  ActionDefinitionShape,
  PluginInstance,
  PluginInput,
  PluginCall,
  HostHandlers,
  HostPluginResult,
  RequestContext,
  MergePluginActions,
} from './types';

// Official presets
export { camera } from './presets/camera';
export type { CameraActions } from './presets/camera';
export { storage } from './presets/storage';
export type { StorageActions } from './presets/storage';
export { location } from './presets/location';
export type { LocationActions } from './presets/location';
export { biometric } from './presets/biometric';
export type { BiometricActions } from './presets/biometric';
export { haptics } from './presets/haptics';
export type { HapticsActions } from './presets/haptics';
```

- [ ] **Step 2: Simplify tsup.config.ts** (single entry point — presets are tree-shakeable)

```typescript
// packages/plugins/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['zod'],
});
```

- [ ] **Step 3: Update package.json** — remove old dependencies, simplify exports

Remove `@ts-bridge/shared`, `@ts-bridge/core`, `react-native` from dependencies/peerDependencies. The new plugins package is standalone (pure types + functions).

Update `exports` to single entry:
```json
{
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

- [ ] **Step 4: Verify build**

Run: `cd packages/plugins && pnpm run build`
Expected: Build success with DTS

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/src/index.ts packages/plugins/tsup.config.ts packages/plugins/package.json
git commit -m "feat(plugins): update package exports and build config"
```

---

## Chunk 3: React Integration — `createBridgeReact({ plugins })` + `usePlugin()`

### Task 3.1: Modify `createBridgeReact` to accept plugins option

**Files:**
- Modify: `packages/clients/react/src/createBridgeReact.tsx`
- Test: `packages/clients/react/src/createBridgeReact.test.tsx` (extend existing)

- [ ] **Step 1: Write the failing test**

Add to `packages/clients/react/src/createBridgeReact.test.tsx`:

```typescript
import { definePlugin } from '@ts-bridge/plugins';

type MockActions = {
  'mock.echo': { payload: { msg: string }; response: { echoed: string } };
};

const mockPlugin = definePlugin<MockActions>({
  name: 'mock',
  methods: (call) => ({
    echo: (msg: string) => call('mock.echo', { msg }),
  }),
});

describe('createBridgeReact with plugins', () => {
  const {
    BridgeProvider: PluginProvider,
    usePlugin,
    useAction: usePluginAction,
  } = createBridgeReact({
    plugins: [mockPlugin],
    config: {
      timeout: 5000,
      fallback: {
        'mock.echo': async (payload: any) => ({ echoed: payload.msg }),
      },
    },
  });

  const pluginWrapper = ({ children }: { children: React.ReactNode }) => (
    <PluginProvider>{children}</PluginProvider>
  );

  it('usePlugin should return typed methods', () => {
    const { result } = renderHook(() => usePlugin(mockPlugin), { wrapper: pluginWrapper });
    expect(typeof result.current.echo).toBe('function');
  });

  it('usePlugin methods should call through bridge', async () => {
    const { result } = renderHook(() => usePlugin(mockPlugin), { wrapper: pluginWrapper });
    let response: any;
    await act(async () => { response = await result.current.echo('hello'); });
    expect(response).toEqual({ echoed: 'hello' });
  });

  it('useAction should autocomplete plugin actions', async () => {
    const { result } = renderHook(() => usePluginAction('mock.echo'), { wrapper: pluginWrapper });
    await act(async () => { await result.current.execute({ msg: 'test' }); });
    expect(result.current.data).toEqual({ echoed: 'test' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/clients/react && pnpm vitest run src/createBridgeReact.test.tsx`
Expected: FAIL (usePlugin not exported, plugins option not supported)

- [ ] **Step 3: Implement — modify createBridgeReact**

Key changes to `createBridgeReact.tsx`:

1. Accept `plugins` option alongside the existing generic `TActions`
2. Merge plugin ActionMaps with `TActions` for the bridge generic
3. Add `usePlugin(plugin)` hook that binds plugin methods to bridge.call
4. Keep all existing hooks working

The modified function signature:

```typescript
interface CreateBridgeReactOptions<TPlugins extends PluginInstance<any, any, any>[]> {
  plugins?: TPlugins;
  config?: BridgeConfig;
}

export function createBridgeReact<
  TCustomActions extends Record<string, ActionDefinitionShape> = {},
  TPlugins extends PluginInstance<any, any, any>[] = [],
>(options?: CreateBridgeReactOptions<TPlugins> | undefined) {
  type TAllActions = MergePluginActions<TPlugins> & TCustomActions;
  // ... existing Context + hooks logic using TAllActions
  // + new usePlugin hook
}
```

`usePlugin` implementation:
```typescript
function usePlugin<TPlugin extends TPlugins[number]>(plugin: TPlugin) {
  const { bridge } = useTypedContext();
  const call: PluginCall<TPlugin['_actionMap']> = useCallback(
    (action, payload) => bridge.call(action as any, payload as any) as any,
    [bridge],
  );
  return useMemo(() => plugin.methods(call), [call, plugin]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/clients/react && pnpm vitest run src/createBridgeReact.test.tsx`
Expected: PASS (both old and new tests)

- [ ] **Step 5: Commit**

```bash
git add packages/clients/react/src/createBridgeReact.tsx packages/clients/react/src/createBridgeReact.test.tsx
git commit -m "feat(react): add plugins option and usePlugin() to createBridgeReact"
```

---

## Chunk 4: Host Integration — `useBridgeHost({ plugins })`

### Task 4.1: Modify `useBridgeHost` to accept plugins option

**Files:**
- Modify: `packages/hosts/react-native/src/hooks/useBridgeHost.ts`
- Modify: `packages/hosts/react-native/src/hooks/useBridgeHost.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `useBridgeHost.test.ts`:

```typescript
import { definePlugin } from '@ts-bridge/plugins';

type MockActions = {
  'mock.echo': { payload: { msg: string }; response: { echoed: string } };
};

const mockPlugin = definePlugin<MockActions>({
  name: 'mock',
  methods: (call) => ({
    echo: (msg: string) => call('mock.echo', { msg }),
  }),
});

describe('createSimpleBridgeHost with plugins', () => {
  it('should register plugin handlers', async () => {
    const result = createSimpleBridgeHost({
      plugins: [
        mockPlugin.host({
          'mock.echo': async (payload) => ({ echoed: payload.msg }),
        }),
      ],
    });

    const message = {
      id: 'test-1',
      action: 'mock.echo',
      payload: { msg: 'hello' },
      timestamp: Date.now(),
    };

    const response = await result.bridgeHost.handleMessage(message);
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ echoed: 'hello' });
  });

  it('should support plugins alongside handlers', async () => {
    const result = createSimpleBridgeHost({
      plugins: [
        mockPlugin.host({
          'mock.echo': async (payload) => ({ echoed: payload.msg }),
        }),
      ],
      handlers: {
        'custom.action': async () => ({ custom: true }),
      },
    });

    const pluginResponse = await result.bridgeHost.handleMessage({
      id: '1', action: 'mock.echo', payload: { msg: 'hi' }, timestamp: 0,
    });
    expect(pluginResponse.data).toEqual({ echoed: 'hi' });

    const customResponse = await result.bridgeHost.handleMessage({
      id: '2', action: 'custom.action', payload: {}, timestamp: 0,
    });
    expect(customResponse.data).toEqual({ custom: true });
  });

  it('should throw on duplicate action names', () => {
    expect(() => createSimpleBridgeHost({
      plugins: [
        mockPlugin.host({ 'mock.echo': async (p) => ({ echoed: p.msg }) }),
      ],
      handlers: {
        'mock.echo': async () => ({ echoed: 'duplicate' }),
      },
    })).toThrow(/duplicate/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/hosts/react-native && pnpm vitest run src/hooks/useBridgeHost.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement — modify createSimpleBridgeHost**

Add `plugins` option to `SimpleBridgeHostOptions`:

```typescript
export interface SimpleBridgeHostOptions<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
> {
  handlers?: TypedHandlers<TActions>;
  plugins?: HostPluginResult[];
  config?: BridgeHostConfig;
  debug?: boolean;
}
```

In `createSimpleBridgeHost`, after registering `handlers`, iterate `plugins`:

```typescript
// Register plugin handlers
if (options.plugins) {
  for (const plugin of options.plugins) {
    for (const [action, handler] of Object.entries(plugin.handlers)) {
      if (/* already registered */) {
        throw new Error(`Duplicate action name '${action}' from plugin '${plugin.pluginName}'`);
      }
      bridgeHost.registerHandler(action, handler as any);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/hosts/react-native && pnpm vitest run src/hooks/useBridgeHost.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/hosts/react-native/src/hooks/useBridgeHost.ts packages/hosts/react-native/src/hooks/useBridgeHost.test.ts
git commit -m "feat(react-native): add plugins option to useBridgeHost"
```

---

## Chunk 5: Cleanup and Final Verification

### Task 5.1: Delete old class-based plugin code

**Files to delete:**
- `packages/plugins/src/utils/BaseWebPlugin.ts`
- `packages/plugins/src/utils/BaseNativePlugin.ts`
- `packages/plugins/src/camera/CameraPlugin.ts`
- `packages/plugins/src/camera/CameraNativePlugin.ts`
- `packages/plugins/src/camera/CameraPlugin.test.ts`
- `packages/plugins/src/camera/types.ts`
- `packages/plugins/src/camera/index.ts`
- `packages/plugins/src/storage/StoragePlugin.ts`
- `packages/plugins/src/storage/StorageNativePlugin.ts`
- `packages/plugins/src/storage/StoragePlugin.test.ts`
- `packages/plugins/src/storage/types.ts`
- `packages/plugins/src/storage/index.ts`
- `packages/plugins/src/location/` (entire directory)
- `packages/plugins/src/biometric/` (entire directory)
- `packages/plugins/src/types/plugin.ts`

Also remove from `packages/shared/src/types/typed-plugin.ts` the Zod-based `defineBridgePlugin`, `ActionSchema`, `PluginDefinition`, `InferPluginActions`, `MergePluginActions` (now replaced by the new types in plugins package). Update `packages/shared/src/types/index.ts` to remove those exports.

Also remove `packages/core/src/plugins/TypedPluginAdapter.ts` and its test, and update `packages/core/src/plugins/index.ts`.

- [ ] **Step 1: Delete old files**
- [ ] **Step 2: Update shared/types exports (remove typed-plugin.ts exports)**
- [ ] **Step 3: Update core/plugins exports (remove TypedPluginAdapter)**
- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All pass (new plugin tests pass, old tests removed)

- [ ] **Step 5: Run build**

Run: `pnpm turbo build --force`
Expected: All packages build successfully

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(plugins): remove old class-based plugin system"
```

---

### Task 5.2: Final verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Full build**

Run: `pnpm turbo build --force`
Expected: All packages build with DTS

- [ ] **Step 3: Verify type safety manually**

Create a temporary type-check file to confirm:
1. `usePlugin(camera)` returns `{ takePhoto, pickImage, recordVideo }` with correct types
2. `useAction('camera.takePhoto')` has correct payload/response
3. `camera.host({ ... })` requires all handlers with correct signatures
4. Missing handler in `.host()` produces compile error
5. Wrong payload type produces compile error

- [ ] **Step 4: Clean up and final commit**

```bash
git add -A
git commit -m "chore: final verification of plugin system redesign"
```
