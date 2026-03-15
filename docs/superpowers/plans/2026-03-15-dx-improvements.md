# ts-bridge DX Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform ts-bridge from a well-architected internal engine into a developer-friendly library with type-safe action maps, React hooks, simplified native setup, fallback mode, global error handling, and type-safe plugins.

**Architecture:** Six incremental improvements layered on top of the existing codebase. Each builds on the previous: Action Map types form the foundation, error handling and fallback mode come next, then the plugin system is upgraded, and finally React hooks and native simplification wrap everything into a polished DX. All changes are additive — existing APIs remain functional (backward-compatible).

**Tech Stack:** TypeScript 5.4, Zod 3.23, Vitest, React 18+, React Native 0.70+, pnpm workspaces, tsup, turbo

**Conventions:**
- Tests are co-located with source files (e.g., `Foo.ts` → `Foo.test.ts` in the same directory)
- Vitest with globals enabled, `happy-dom` environment for web packages, `node` for shared
- tsup for dual ESM/CJS builds with dts

---

## Dependency Order

```
1. Action Map Types (shared + core)     ← foundation
2. Global Error Handling + Retry (shared + core)
3. Fallback/Mock Mode (core)
4. Type-Safe Plugin System (shared + plugins)
5. @ts-bridge/react (new package)       ← HARD dependency on 1-3
6. Native Single Entry Point (native)   ← independent
```

---

## Chunk 1: Action Map Type System

### Task 1.1: Define ActionMap and ActionDefinition types in shared

**Files:**
- Create: `packages/shared/src/types/action-map.ts`
- Modify: `packages/shared/src/types/index.ts`
- Test: `packages/shared/src/types/action-map.test.ts`

- [ ] **Step 1: Write the failing type test**

```typescript
// packages/shared/src/types/action-map.test.ts
import { describe, it, expectTypeOf } from 'vitest';
import type { ActionMap, InferPayload, InferResponse, ActionNames, ActionDefinitionShape } from './action-map';

type TestActions = {
  'camera.take': {
    payload: { quality: number };
    response: { uri: string };
  };
  'storage.get': {
    payload: { key: string };
    response: { value: string | null };
  };
  'notification.show': {
    payload: { title: string; body: string };
    response: void;
  };
};

describe('ActionMap types', () => {
  it('should infer payload type from action name', () => {
    expectTypeOf<InferPayload<TestActions, 'camera.take'>>().toEqualTypeOf<{ quality: number }>();
  });

  it('should infer response type from action name', () => {
    expectTypeOf<InferResponse<TestActions, 'camera.take'>>().toEqualTypeOf<{ uri: string }>();
  });

  it('should support void response', () => {
    expectTypeOf<InferResponse<TestActions, 'notification.show'>>().toEqualTypeOf<void>();
  });

  it('should extract valid action names', () => {
    type ValidKeys = ActionNames<TestActions>;
    expectTypeOf<'camera.take'>().toMatchTypeOf<ValidKeys>();
    expectTypeOf<'storage.get'>().toMatchTypeOf<ValidKeys>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared && pnpm vitest run src/types/action-map.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ActionMap types**

```typescript
// packages/shared/src/types/action-map.ts

/**
 * Defines the shape of an action: its payload and response types.
 */
export interface ActionDefinitionShape {
  payload: unknown;
  response: unknown;
}

/**
 * Extract the payload type for a given action name from an ActionMap.
 */
export type InferPayload<
  TMap extends Record<string, ActionDefinitionShape>,
  TAction extends keyof TMap,
> = TMap[TAction]['payload'];

/**
 * Extract the response type for a given action name from an ActionMap.
 */
export type InferResponse<
  TMap extends Record<string, ActionDefinitionShape>,
  TAction extends keyof TMap,
> = TMap[TAction]['response'];

/**
 * Extract all valid action names from an ActionMap.
 */
export type ActionNames<TMap extends Record<string, ActionDefinitionShape>> = keyof TMap & string;

/**
 * Convenience alias — constrains T to a valid action map shape.
 * Can be used to annotate user-defined action maps for better error messages.
 */
export type ActionMap<T extends Record<string, ActionDefinitionShape>> = T;
```

- [ ] **Step 4: Export from types/index.ts**

Add to `packages/shared/src/types/index.ts`:
```typescript
export * from './action-map';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/shared && pnpm vitest run src/types/action-map.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types/action-map.ts packages/shared/src/types/action-map.test.ts packages/shared/src/types/index.ts
git commit -m "feat(shared): add ActionMap type system for type-safe action inference"
```

---

### Task 1.2: Create TypedBridge interface in shared

**Files:**
- Create: `packages/shared/src/types/typed-bridge.ts`
- Modify: `packages/shared/src/types/index.ts`
- Test: `packages/shared/src/types/typed-bridge.test.ts`

- [ ] **Step 1: Write the failing type test**

```typescript
// packages/shared/src/types/typed-bridge.test.ts
import { describe, it, expectTypeOf } from 'vitest';
import type { TypedBridge } from './typed-bridge';

type TestActions = {
  'camera.take': { payload: { quality: number }; response: { uri: string } };
  'storage.get': { payload: { key: string }; response: { value: string | null } };
};

describe('TypedBridge interface', () => {
  it('should enforce correct payload for call()', () => {
    const bridge = {} as TypedBridge<TestActions>;
    expectTypeOf(bridge.call).parameter(0).toMatchTypeOf<'camera.take' | 'storage.get'>();
  });

  it('should return correct response type from call()', () => {
    const bridge = {} as TypedBridge<TestActions>;
    expectTypeOf(bridge.call('camera.take', { quality: 0.8 })).toEqualTypeOf<Promise<{ uri: string }>>();
    expectTypeOf(bridge.call('storage.get', { key: 'foo' })).toEqualTypeOf<Promise<{ value: string | null }>>();
  });

  it('should include getConfig and isAvailable from Bridge', () => {
    const bridge = {} as TypedBridge<TestActions>;
    expectTypeOf(bridge.isAvailable).toBeFunction();
    expectTypeOf(bridge.getConfig).toBeFunction();
    expectTypeOf(bridge.destroy).toBeFunction();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared && pnpm vitest run src/types/typed-bridge.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement TypedBridge interface**

```typescript
// packages/shared/src/types/typed-bridge.ts
import type { ActionDefinitionShape, ActionNames, InferPayload, InferResponse } from './action-map';
import type { BridgeConfig, BridgeCallOptions } from './bridge';

/**
 * A fully type-safe bridge interface. When parameterized with an ActionMap,
 * it enforces correct action names, payloads, and response types at compile time.
 *
 * Extends the base Bridge contract with type-safe call().
 *
 * @example
 * ```typescript
 * const bridge: TypedBridge<MyActions> = createBridge<MyActions>();
 * const photo = await bridge.call('camera.take', { quality: 0.8 });
 * //    ^? { uri: string }  — automatically inferred
 * ```
 */
export interface TypedBridge<TActions extends Record<string, ActionDefinitionShape>> {
  call<TAction extends ActionNames<TActions>>(
    action: TAction,
    payload: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions,
  ): Promise<InferResponse<TActions, TAction>>;

  on<TPayload = unknown>(
    event: string,
    handler: (payload: TPayload) => void,
  ): () => void;

  off(event: string, handler?: (payload: unknown) => void): void;

  isAvailable(): boolean;

  getConfig(): BridgeConfig;

  destroy(): void;
}
```

- [ ] **Step 4: Export from types/index.ts**

Add to `packages/shared/src/types/index.ts`:
```typescript
export * from './typed-bridge';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/shared && pnpm vitest run src/types/typed-bridge.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types/typed-bridge.ts packages/shared/src/types/typed-bridge.test.ts packages/shared/src/types/index.ts
git commit -m "feat(shared): add TypedBridge interface for compile-time action safety"
```

---

### Task 1.3: Make BridgeManager generic with ActionMap

**Files:**
- Modify: `packages/core/src/bridge/BridgeManager.ts`
- Modify: `packages/core/src/index.ts` (update createBridge signature)
- Test: `packages/core/src/bridge/BridgeManager.typed.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/bridge/BridgeManager.typed.test.ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import { createBridge } from '../../index';
import type { TypedBridge } from '@ts-bridge/shared';

type TestActions = {
  'camera.take': { payload: { quality: number }; response: { uri: string } };
  'storage.get': { payload: { key: string }; response: { value: string | null } };
};

describe('BridgeManager with ActionMap', () => {
  it('should accept generic type parameter', () => {
    const bridge = createBridge<TestActions>();
    expectTypeOf(bridge).toMatchTypeOf<TypedBridge<TestActions>>();
  });

  it('should work without type parameter (backward compatible)', () => {
    const bridge = createBridge();
    expect(bridge).toBeDefined();
    expect(typeof bridge.call).toBe('function');
  });

  it('should enforce payload types', () => {
    const bridge = createBridge<TestActions>();
    expectTypeOf(bridge.call('camera.take', { quality: 0.8 })).toEqualTypeOf<Promise<{ uri: string }>>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm vitest run src/bridge/BridgeManager.typed.test.ts`
Expected: FAIL — type errors

- [ ] **Step 3: Add generic parameter to BridgeManager**

Modify `packages/core/src/bridge/BridgeManager.ts`:

1. Add import at top:
```typescript
import type { ActionDefinitionShape, ActionNames, InferPayload, InferResponse } from '@ts-bridge/shared';
```

2. Change class declaration (line 29):
```typescript
export class BridgeManager<TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>> implements Bridge {
```

3. Update `call` method signature (line 62-66):
```typescript
async call<TAction extends ActionNames<TActions>>(
  action: TAction,
  payload?: InferPayload<TActions, TAction>,
  options?: BridgeCallOptions,
): Promise<InferResponse<TActions, TAction>> {
```

The method body remains unchanged — the runtime behavior is the same, only types are narrowed.

- [ ] **Step 4: Update createBridge factory**

Modify `packages/core/src/index.ts` — update createBridge:
```typescript
import type { ActionDefinitionShape } from '@ts-bridge/shared';

export function createBridge<TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>>(
  config?: BridgeConfig,
): BridgeManager<TActions> {
  return new BridgeManager<TActions>(config);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/core && pnpm vitest run src/bridge/BridgeManager.typed.test.ts`
Expected: PASS

- [ ] **Step 6: Run full test suite for regression**

Run: `cd packages/core && pnpm vitest run`
Expected: All existing tests PASS (backward compatible)

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/bridge/BridgeManager.ts packages/core/src/index.ts packages/core/src/bridge/BridgeManager.typed.test.ts
git commit -m "feat(core): make BridgeManager generic with ActionMap type parameter"
```

---

## Chunk 2: Global Error Handling + Retry

### Task 2.1: Extend BridgeConfig with error and retry options

**Files:**
- Modify: `packages/shared/src/types/bridge.ts`
- Test: `packages/shared/src/types/bridge.config.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/shared/src/types/bridge.config.test.ts
import { describe, it, expectTypeOf } from 'vitest';
import type { BridgeConfig, RetryConfig, ErrorContext, BridgeError } from './bridge';

describe('Extended BridgeConfig', () => {
  it('should accept onError handler with BridgeError and ErrorContext', () => {
    const config: BridgeConfig = {
      onError: (error, context) => {
        expectTypeOf(error).toMatchTypeOf<BridgeError>();
        expectTypeOf(context).toMatchTypeOf<ErrorContext>();
      },
    };
    expectTypeOf(config.onError).toMatchTypeOf<((error: BridgeError, context: ErrorContext) => void) | undefined>();
  });

  it('should accept retry config', () => {
    const config: BridgeConfig = {
      retry: {
        maxAttempts: 3,
        delay: 1000,
        exponentialBackoff: true,
      },
    };
    expectTypeOf(config.retry).toMatchTypeOf<RetryConfig | undefined>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared && pnpm vitest run src/types/bridge.config.test.ts`
Expected: FAIL — onError and retry don't exist on BridgeConfig

- [ ] **Step 3: Extend BridgeConfig**

Modify `packages/shared/src/types/bridge.ts` — add new interfaces and extend BridgeConfig:

```typescript
// Add BEFORE the BridgeConfig interface:

export interface RetryConfig {
  /** Maximum number of retry attempts (does not include original attempt). Default: 0 */
  maxAttempts: number;
  /** Base delay in ms between retries. Default: 1000 */
  delay: number;
  /** Whether to use exponential backoff (delay * 2^attempt). Default: false */
  exponentialBackoff?: boolean;
}

export interface ErrorContext {
  action: string;
  payload?: unknown;
  attempt: number;
  timestamp: number;
}

// Add to existing BridgeConfig interface (keep all 4 existing fields, add 2 new):
//   onError?: (error: BridgeError, context: ErrorContext) => void;
//   retry?: RetryConfig;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/shared && pnpm vitest run src/types/bridge.config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/bridge.ts packages/shared/src/types/bridge.config.test.ts
git commit -m "feat(shared): add onError and retry config to BridgeConfig"
```

---

### Task 2.2: Update BridgeManager constructor to handle new config fields

**Files:**
- Modify: `packages/core/src/bridge/BridgeManager.ts`

Since `BridgeConfig` now has optional `onError` and `retry`, and the constructor stores `Required<BridgeConfig>`, we must handle the new fields. The config type should no longer be `Required<BridgeConfig>` because `onError` and `retry` are genuinely optional (no sensible default for `onError`).

- [ ] **Step 1: Change config type from Required to resolved type**

Modify `packages/core/src/bridge/BridgeManager.ts` line 30:

Change:
```typescript
private config: Required<BridgeConfig>;
```

To:
```typescript
private config: {
  timeout: number;
  debug: boolean;
  maxConcurrentRequests: number;
  enableDeduplication: boolean;
  onError?: BridgeConfig['onError'];
  retry?: BridgeConfig['retry'];
};
```

- [ ] **Step 2: Update constructor to spread new fields**

Modify constructor (lines 38-44):
```typescript
constructor(config: BridgeConfig = {}) {
  this.config = {
    timeout: config.timeout ?? 30000,
    debug: config.debug ?? false,
    maxConcurrentRequests: config.maxConcurrentRequests ?? 100,
    enableDeduplication: config.enableDeduplication ?? true,
    onError: config.onError,
    retry: config.retry,
  };
  // ... rest unchanged
}
```

- [ ] **Step 3: Run existing tests for regression**

Run: `cd packages/core && pnpm vitest run`
Expected: All existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/bridge/BridgeManager.ts
git commit -m "refactor(core): update BridgeManager config type to support new optional fields"
```

---

### Task 2.3: Implement retry logic in BridgeManager.call()

**Files:**
- Modify: `packages/core/src/bridge/BridgeManager.ts`
- Test: `packages/core/src/bridge/BridgeManager.retry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/bridge/BridgeManager.retry.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BridgeManager } from './BridgeManager';

describe('BridgeManager retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call global onError on failure', async () => {
    const onError = vi.fn();
    const bridge = new BridgeManager({ onError, timeout: 50 });

    const callPromise = bridge.call('test.action', { key: 'value' });
    await vi.advanceTimersByTimeAsync(100);

    await expect(callPromise).rejects.toThrow();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: expect.any(String), message: expect.any(String) }),
      expect.objectContaining({
        action: 'test.action',
        payload: { key: 'value' },
        attempt: 1,
        timestamp: expect.any(Number),
      }),
    );
  });

  it('should not retry when retry is not configured', async () => {
    const onError = vi.fn();
    const bridge = new BridgeManager({ onError, timeout: 50 });

    const callPromise = bridge.call('test.action', {});
    await vi.advanceTimersByTimeAsync(100);
    await expect(callPromise).rejects.toThrow();

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure up to maxAttempts', async () => {
    const onError = vi.fn();
    const bridge = new BridgeManager({
      retry: { maxAttempts: 2, delay: 100 },
      onError,
      timeout: 50,
    });

    const callPromise = bridge.call('test.action', {});

    // Original attempt timeout
    await vi.advanceTimersByTimeAsync(60);
    // Retry delay + timeout (x2)
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(200);

    await expect(callPromise).rejects.toThrow();

    // 1 original + 2 retries = 3
    expect(onError).toHaveBeenCalledTimes(3);
  });

  it('should respect per-call retry override', async () => {
    const onError = vi.fn();
    const bridge = new BridgeManager({
      retry: { maxAttempts: 3, delay: 100 },
      onError,
      timeout: 50,
    });

    const callPromise = bridge.call('test.action', {}, { retry: { maxAttempts: 1, delay: 100 } });

    await vi.advanceTimersByTimeAsync(60);
    await vi.advanceTimersByTimeAsync(200);

    await expect(callPromise).rejects.toThrow();

    // 1 original + 1 retry = 2
    expect(onError).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm vitest run src/bridge/BridgeManager.retry.test.ts`
Expected: FAIL — retry not implemented, onError not called

- [ ] **Step 3: Extract call logic into private executeCall method**

Modify `packages/core/src/bridge/BridgeManager.ts`:

Rename the current `call()` body into a new private method `executeCall()`:

```typescript
private async executeCall<TAction extends ActionNames<TActions>>(
  action: TAction,
  payload: InferPayload<TActions, TAction> | undefined,
  options?: BridgeCallOptions,
): Promise<InferResponse<TActions, TAction>> {
  // ... existing call() body (lines 67-115), unchanged
}
```

- [ ] **Step 4: Implement new call() with retry and onError**

Replace the public `call()` with:

```typescript
async call<TAction extends ActionNames<TActions>>(
  action: TAction,
  payload?: InferPayload<TActions, TAction>,
  options?: BridgeCallOptions,
): Promise<InferResponse<TActions, TAction>> {
  const retryConfig = options?.retry ?? this.config.retry;
  const maxAttempts = (retryConfig?.maxAttempts ?? 0) + 1;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await this.executeCall(action, payload, options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const bridgeError: BridgeError = {
        code: (error as any)?.code ?? 'BRIDGE_ERROR',
        message: lastError.message,
        details: (error as any)?.details,
      };

      this.config.onError?.(bridgeError, {
        action: action as string,
        payload,
        attempt,
        timestamp: Date.now(),
      });

      if (attempt < maxAttempts && retryConfig) {
        const delay = retryConfig.exponentialBackoff
          ? retryConfig.delay * Math.pow(2, attempt - 1)
          : retryConfig.delay;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

Add `BridgeError` and `ErrorContext` to the imports from `@ts-bridge/shared`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/core && pnpm vitest run src/bridge/BridgeManager.retry.test.ts`
Expected: PASS

- [ ] **Step 6: Run full test suite for regression**

Run: `cd packages/core && pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/bridge/BridgeManager.ts packages/core/src/bridge/BridgeManager.retry.test.ts
git commit -m "feat(core): implement retry logic and global error handler in BridgeManager"
```

---

## Chunk 3: Fallback/Mock Mode

### Task 3.1: Add fallback configuration to BridgeConfig

**Files:**
- Modify: `packages/shared/src/types/bridge.ts`
- Test: `packages/shared/src/types/bridge.fallback.test.ts`

- [ ] **Step 1: Write the failing type test**

```typescript
// packages/shared/src/types/bridge.fallback.test.ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import type { BridgeConfig, FallbackHandler, FallbackMap } from './bridge';

describe('Fallback config types', () => {
  it('should accept fallback handlers map', () => {
    const config: BridgeConfig = {
      fallback: {
        'camera.take': async (payload) => ({ uri: '/mock.jpg' }),
        'storage.get': async (payload) => ({ value: 'mock' }),
      },
    };
    expect(config.fallback).toBeDefined();
  });

  it('should accept fallback as boolean for console logging mode', () => {
    const config: BridgeConfig = {
      fallback: true,
    };
    expect(config.fallback).toBe(true);
  });

  it('should type FallbackHandler correctly', () => {
    const handler: FallbackHandler = async (payload) => ({ result: 'ok' });
    expectTypeOf(handler).toMatchTypeOf<(payload: unknown) => Promise<unknown> | unknown>();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared && pnpm vitest run src/types/bridge.fallback.test.ts`
Expected: FAIL

- [ ] **Step 3: Add fallback types to BridgeConfig**

Add to `packages/shared/src/types/bridge.ts`:

```typescript
/** A fallback handler that simulates native responses when bridge is unavailable */
export type FallbackHandler<TPayload = unknown, TResponse = unknown> = (
  payload: TPayload,
) => Promise<TResponse> | TResponse;

/** Map of action names to fallback handlers */
export type FallbackMap = Record<string, FallbackHandler>;
```

Add to BridgeConfig interface:
```typescript
  /**
   * Fallback handlers for when native bridge is unavailable (e.g., browser development).
   * - `true`: logs all calls to console, but calls still fail (useful for debugging)
   * - `Record<string, FallbackHandler>`: per-action mock handlers that return mock data
   */
  fallback?: boolean | FallbackMap;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/shared && pnpm vitest run src/types/bridge.fallback.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/bridge.ts packages/shared/src/types/bridge.fallback.test.ts
git commit -m "feat(shared): add fallback handler types to BridgeConfig"
```

---

### Task 3.2: Update BridgeManager constructor for fallback field

**Files:**
- Modify: `packages/core/src/bridge/BridgeManager.ts`

- [ ] **Step 1: Add fallback to config type**

Update the private config type declaration to include:
```typescript
fallback?: BridgeConfig['fallback'];
```

And in the constructor:
```typescript
fallback: config.fallback,
```

- [ ] **Step 2: Run existing tests**

Run: `cd packages/core && pnpm vitest run`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/bridge/BridgeManager.ts
git commit -m "refactor(core): add fallback field to BridgeManager config"
```

---

### Task 3.3: Implement FallbackAdapter in core

**Files:**
- Create: `packages/core/src/adapters/FallbackAdapter.ts`
- Modify: `packages/core/src/adapters/index.ts`
- Modify: `packages/core/src/bridge/BridgeManager.ts` (use fallback adapter)
- Test: `packages/core/src/adapters/FallbackAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/adapters/FallbackAdapter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createBridge } from '../../index';

describe('Fallback mode', () => {
  it('should use fallback handlers when native is unavailable', async () => {
    const bridge = createBridge({
      fallback: {
        'camera.take': async (payload: any) => ({
          uri: '/mock/photo.jpg',
          width: 100,
          height: 100,
        }),
      },
    });

    const result = await bridge.call('camera.take', { quality: 0.8 });
    expect(result).toEqual({ uri: '/mock/photo.jpg', width: 100, height: 100 });
  });

  it('should throw if no fallback handler for the requested action', async () => {
    const bridge = createBridge({
      fallback: {},
      timeout: 50,
    });

    await expect(bridge.call('missing.action', {})).rejects.toThrow();
  });

  it('should log to console when fallback is true (logging-only mode)', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bridge = createBridge({ fallback: true, timeout: 50 });

    // fallback: true means bridge.isAvailable() returns true,
    // but calls fail with a descriptive error after logging
    await expect(bridge.call('any.action', {})).rejects.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ts-bridge fallback]'),
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });

  it('should not use fallback when native IS available', async () => {
    // Mock native availability
    (window as any).webkit = {
      messageHandlers: {
        tsBridge: { postMessage: vi.fn() },
      },
    };

    const fallbackFn = vi.fn();
    const bridge = createBridge({
      fallback: { 'test.action': fallbackFn },
      timeout: 50,
    });

    // Native is available, so fallback should NOT be used
    try {
      await bridge.call('test.action', {});
    } catch {
      // expected timeout — native adapter was used, not fallback
    }
    expect(fallbackFn).not.toHaveBeenCalled();

    delete (window as any).webkit;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm vitest run src/adapters/FallbackAdapter.test.ts`
Expected: FAIL

- [ ] **Step 3: Create FallbackAdapter**

```typescript
// packages/core/src/adapters/FallbackAdapter.ts
import type { BridgeMessage, BridgeResponse, FallbackMap } from '@ts-bridge/shared';
import { Platform } from '@ts-bridge/shared';
import type { NativeAdapter } from './NativeAdapter';

/**
 * Adapter that intercepts bridge calls when native is unavailable.
 * Executes fallback handlers to simulate native responses.
 *
 * The responseCallback is injected via constructor to avoid
 * adding a non-standard method to the NativeAdapter interface.
 */
export class FallbackAdapter implements NativeAdapter {
  private readonly handlers: FallbackMap;
  private readonly logOnly: boolean;
  private readonly responseCallback: (response: BridgeResponse) => void;

  constructor(
    fallback: true | FallbackMap,
    responseCallback: (response: BridgeResponse) => void,
  ) {
    this.logOnly = fallback === true;
    this.handlers = fallback === true ? {} : fallback;
    this.responseCallback = responseCallback;
  }

  send(message: BridgeMessage): void {
    const { id, action, payload } = message;

    if (this.logOnly) {
      console.warn('[ts-bridge fallback]', { action, payload });
      this.respondWithError(id, action);
      return;
    }

    const handler = this.handlers[action];
    if (!handler) {
      this.respondWithError(id, action);
      return;
    }

    Promise.resolve(handler(payload))
      .then((data) => {
        this.responseCallback({
          id,
          success: true,
          data,
          timestamp: Date.now(),
        });
      })
      .catch((error) => {
        this.responseCallback({
          id,
          success: false,
          error: {
            code: 'FALLBACK_ERROR',
            message: error instanceof Error ? error.message : String(error),
          },
          timestamp: Date.now(),
        });
      });
  }

  private respondWithError(id: string, action: string): void {
    this.responseCallback({
      id,
      success: false,
      error: {
        code: 'NO_FALLBACK',
        message: `No fallback handler for action: ${action}`,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * FallbackAdapter always returns true for isAvailable() when handlers are
   * provided (not logOnly), so that BridgeManager.call() does not throw
   * "Native bridge not available" before reaching send().
   *
   * For logOnly mode, also returns true so the call flows through to send()
   * where it logs and then rejects.
   */
  isAvailable(): boolean {
    return true;
  }

  getPlatform(): Platform {
    return Platform.WEB;
  }
}
```

- [ ] **Step 4: Integrate FallbackAdapter into BridgeManager constructor**

Modify `packages/core/src/bridge/BridgeManager.ts` constructor — after `this.adapter = createNativeAdapter();`, add:

```typescript
// If native is unavailable and fallback is configured, use FallbackAdapter
if (!this.adapter.isAvailable() && this.config.fallback) {
  this.adapter = new FallbackAdapter(
    this.config.fallback,
    (response) => this.handleResponse(response),
  );
}
```

Add import: `import { FallbackAdapter } from '../adapters/FallbackAdapter';`

- [ ] **Step 5: Export FallbackAdapter**

Add to `packages/core/src/adapters/index.ts`:
```typescript
export { FallbackAdapter } from './FallbackAdapter';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/core && pnpm vitest run src/adapters/FallbackAdapter.test.ts`
Expected: PASS

- [ ] **Step 7: Run full test suite for regression**

Run: `cd packages/core && pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/adapters/FallbackAdapter.ts packages/core/src/adapters/FallbackAdapter.test.ts packages/core/src/adapters/index.ts packages/core/src/bridge/BridgeManager.ts
git commit -m "feat(core): implement FallbackAdapter for browser development without native"
```

---

## Chunk 4: Type-Safe Plugin System

### Task 4.1: Create defineBridgePlugin helper

**Files:**
- Create: `packages/shared/src/types/typed-plugin.ts`
- Modify: `packages/shared/src/types/index.ts`
- Test: `packages/shared/src/types/typed-plugin.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/shared/src/types/typed-plugin.test.ts
import { describe, it, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { defineBridgePlugin } from './typed-plugin';
import type { PluginDefinition, InferPluginActions } from './typed-plugin';

describe('Type-safe plugin definition', () => {
  it('should define plugin actions with Zod schemas', () => {
    const cameraDef: PluginDefinition = {
      name: 'camera',
      version: '1.0.0',
      actions: {
        'camera.take': {
          payload: z.object({ quality: z.number().min(0).max(1) }),
          response: z.object({ uri: z.string() }),
        },
        'camera.pick': {
          payload: z.object({ multiple: z.boolean() }),
          response: z.object({ uris: z.array(z.string()) }),
        },
      },
    };

    expect(cameraDef.name).toBe('camera');
    expect(cameraDef.actions['camera.take']).toBeDefined();
  });

  it('should infer ActionMap from plugin definition', () => {
    const def = defineBridgePlugin({
      name: 'test',
      version: '1.0.0',
      actions: {
        'test.echo': {
          payload: z.object({ message: z.string() }),
          response: z.object({ echoed: z.string() }),
        },
      },
    });

    type Actions = InferPluginActions<typeof def>;
    expectTypeOf<Actions>().toMatchTypeOf<{
      'test.echo': {
        payload: { message: string };
        response: { echoed: string };
      };
    }>();
  });

  it('should return the same definition from defineBridgePlugin', () => {
    const def = defineBridgePlugin({
      name: 'test',
      version: '1.0.0',
      actions: {
        'test.ping': {
          payload: z.object({}),
          response: z.object({ pong: z.boolean() }),
        },
      },
    });
    expect(def.name).toBe('test');
    expect(def.version).toBe('1.0.0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared && pnpm vitest run src/types/typed-plugin.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement typed plugin types**

```typescript
// packages/shared/src/types/typed-plugin.ts
import type { z } from 'zod';

/**
 * Schema pair for a single action — payload and response validated by Zod.
 */
export interface ActionSchema {
  payload: z.ZodType;
  response: z.ZodType;
}

/**
 * A plugin definition with Zod-validated actions.
 */
export interface PluginDefinition<
  TActions extends Record<string, ActionSchema> = Record<string, ActionSchema>,
> {
  name: string;
  version: string;
  description?: string;
  permissions?: string[];
  actions: TActions;
}

/**
 * Infer an ActionMap from a PluginDefinition's Zod schemas.
 * Converts Zod types to their inferred TypeScript types.
 */
export type InferPluginActions<T extends PluginDefinition> = {
  [K in keyof T['actions'] & string]: {
    payload: z.infer<T['actions'][K]['payload']>;
    response: z.infer<T['actions'][K]['response']>;
  };
};

/**
 * Merge multiple plugin ActionMaps into a single ActionMap.
 */
export type MergePluginActions<T extends PluginDefinition[]> = T extends [
  infer First extends PluginDefinition,
  ...infer Rest extends PluginDefinition[],
]
  ? InferPluginActions<First> & MergePluginActions<Rest>
  : {};

/**
 * Helper to define a plugin with full type inference.
 * Returns the same object with preserved type information.
 */
export function defineBridgePlugin<TActions extends Record<string, ActionSchema>>(
  definition: PluginDefinition<TActions>,
): PluginDefinition<TActions> {
  return definition;
}
```

- [ ] **Step 4: Export from types/index.ts**

Add to `packages/shared/src/types/index.ts`:
```typescript
export * from './typed-plugin';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/shared && pnpm vitest run src/types/typed-plugin.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types/typed-plugin.ts packages/shared/src/types/typed-plugin.test.ts packages/shared/src/types/index.ts
git commit -m "feat(shared): add defineBridgePlugin with Zod schema validation and type inference"
```

---

### Task 4.2: Add runtime validation adapter for plugin calls

**Files:**
- Create: `packages/core/src/plugins/TypedPluginAdapter.ts`
- Modify: `packages/core/src/plugins/index.ts`
- Test: `packages/core/src/plugins/TypedPluginAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/plugins/TypedPluginAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineBridgePlugin } from '@ts-bridge/shared';
import { createTypedPluginAdapter } from './TypedPluginAdapter';

const testPlugin = defineBridgePlugin({
  name: 'test',
  version: '1.0.0',
  actions: {
    'test.echo': {
      payload: z.object({ message: z.string() }),
      response: z.object({ echoed: z.string() }),
    },
  },
});

describe('TypedPluginAdapter', () => {
  it('should validate payload at runtime', () => {
    const adapter = createTypedPluginAdapter(testPlugin);

    expect(() => adapter.validatePayload('test.echo', { message: 'hello' })).not.toThrow();
    expect(() => adapter.validatePayload('test.echo', { message: 123 })).toThrow();
  });

  it('should validate response at runtime', () => {
    const adapter = createTypedPluginAdapter(testPlugin);

    expect(() => adapter.validateResponse('test.echo', { echoed: 'world' })).not.toThrow();
    expect(() => adapter.validateResponse('test.echo', { echoed: 123 })).toThrow();
  });

  it('should throw for unknown action', () => {
    const adapter = createTypedPluginAdapter(testPlugin);

    expect(() => adapter.validatePayload('unknown.action', {})).toThrow(/Unknown action/);
  });

  it('should return parsed values (Zod strips unknown keys by default)', () => {
    const adapter = createTypedPluginAdapter(testPlugin);
    const result = adapter.validatePayload('test.echo', { message: 'hello', extra: 'field' });
    expect(result).toEqual({ message: 'hello' });
  });

  it('should list action names', () => {
    const adapter = createTypedPluginAdapter(testPlugin);
    expect(adapter.getActionNames()).toEqual(['test.echo']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm vitest run src/plugins/TypedPluginAdapter.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement TypedPluginAdapter**

```typescript
// packages/core/src/plugins/TypedPluginAdapter.ts
import type { PluginDefinition, ActionSchema } from '@ts-bridge/shared';

export class TypedPluginAdapter<TActions extends Record<string, ActionSchema>> {
  readonly name: string;
  private readonly actions: TActions;

  constructor(definition: PluginDefinition<TActions>) {
    this.name = definition.name;
    this.actions = definition.actions;
  }

  validatePayload<TAction extends keyof TActions & string>(
    action: TAction,
    payload: unknown,
  ): unknown {
    const schema = this.actions[action];
    if (!schema) {
      throw new Error(`Unknown action: ${action}`);
    }
    return schema.payload.parse(payload);
  }

  validateResponse<TAction extends keyof TActions & string>(
    action: TAction,
    response: unknown,
  ): unknown {
    const schema = this.actions[action];
    if (!schema) {
      throw new Error(`Unknown action: ${action}`);
    }
    return schema.response.parse(response);
  }

  hasAction(action: string): boolean {
    return action in this.actions;
  }

  getActionNames(): string[] {
    return Object.keys(this.actions);
  }
}

export function createTypedPluginAdapter<TActions extends Record<string, ActionSchema>>(
  definition: PluginDefinition<TActions>,
): TypedPluginAdapter<TActions> {
  return new TypedPluginAdapter(definition);
}
```

- [ ] **Step 4: Export from plugins/index.ts**

Add to `packages/core/src/plugins/index.ts`:
```typescript
export { TypedPluginAdapter, createTypedPluginAdapter } from './TypedPluginAdapter';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/core && pnpm vitest run src/plugins/TypedPluginAdapter.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/plugins/TypedPluginAdapter.ts packages/core/src/plugins/TypedPluginAdapter.test.ts packages/core/src/plugins/index.ts
git commit -m "feat(core): add TypedPluginAdapter for runtime Zod validation of plugin actions"
```

---

## Chunk 5: @ts-bridge/react Package

> **HARD DEPENDENCY:** Chunks 1-3 must be completed before this chunk. The tests and implementations rely on `ActionDefinitionShape`, `ActionNames`, `InferPayload`, `InferResponse` from Chunk 1, and `fallback` config from Chunk 3.

### Task 5.1: Scaffold the React package

**Files:**
- Create: `packages/react/package.json`
- Create: `packages/react/tsconfig.json`
- Create: `packages/react/tsup.config.ts`
- Create: `packages/react/vitest.config.ts`
- Create: `packages/react/src/index.ts` (empty placeholder)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@ts-bridge/react",
  "version": "0.1.0",
  "type": "module",
  "description": "React hooks and providers for ts-bridge",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@ts-bridge/shared": "workspace:*",
    "@ts-bridge/core": "workspace:*"
  },
  "peerDependencies": {
    "react": ">=18.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@types/react": "^18.2.0",
    "happy-dom": "^14.12.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tsup": "^8.1.0",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  },
  "files": ["dist"],
  "license": "MIT"
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ['react', 'react-dom', '@ts-bridge/shared', '@ts-bridge/core'],
});
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

- [ ] **Step 5: Create empty src/index.ts**

```typescript
// @ts-bridge/react — React hooks and providers for ts-bridge
```

- [ ] **Step 6: Install dependencies**

Run: `cd /Users/hkj0206/Desktop/web_develop/open_source/ts-bridge && pnpm install`

- [ ] **Step 7: Commit**

```bash
git add packages/react/
git commit -m "feat(react): scaffold @ts-bridge/react package"
```

---

### Task 5.2: Implement BridgeContext and BridgeProvider

**Files:**
- Create: `packages/react/src/BridgeContext.ts`
- Create: `packages/react/src/BridgeProvider.tsx`
- Modify: `packages/react/src/index.ts`
- Test: `packages/react/src/BridgeProvider.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/react/src/BridgeProvider.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { BridgeProvider, useBridgeContext } from './index';

describe('BridgeProvider', () => {
  it('should provide bridge instance via context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BridgeProvider config={{ timeout: 5000 }}>{children}</BridgeProvider>
    );

    const { result } = renderHook(() => useBridgeContext(), { wrapper });

    expect(result.current.bridge).toBeDefined();
    expect(typeof result.current.bridge.call).toBe('function');
    expect(typeof result.current.bridge.isAvailable).toBe('function');
  });

  it('should provide isAvailable state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BridgeProvider config={{ timeout: 5000 }}>{children}</BridgeProvider>
    );

    const { result } = renderHook(() => useBridgeContext(), { wrapper });
    expect(typeof result.current.isAvailable).toBe('boolean');
  });

  it('should throw when used outside provider', () => {
    expect(() => {
      renderHook(() => useBridgeContext());
    }).toThrow(/BridgeProvider/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/react && pnpm vitest run src/BridgeProvider.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement BridgeContext**

```typescript
// packages/react/src/BridgeContext.ts
import { createContext, useContext } from 'react';
import type { BridgeManager } from '@ts-bridge/core';
import type { ActionDefinitionShape } from '@ts-bridge/shared';

export interface BridgeContextValue<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
> {
  bridge: BridgeManager<TActions>;
  isAvailable: boolean;
}

export const BridgeContext = createContext<BridgeContextValue | null>(null);

export function useBridgeContext<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
>(): BridgeContextValue<TActions> {
  const context = useContext(BridgeContext);
  if (!context) {
    throw new Error('useBridgeContext must be used within a <BridgeProvider>');
  }
  return context as BridgeContextValue<TActions>;
}
```

- [ ] **Step 4: Implement BridgeProvider**

```typescript
// packages/react/src/BridgeProvider.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { createBridge } from '@ts-bridge/core';
import type { BridgeConfig, ActionDefinitionShape } from '@ts-bridge/shared';
import { BridgeContext } from './BridgeContext';

export interface BridgeProviderProps<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
> {
  /** Bridge configuration. Only read on mount — changes after mount are ignored. */
  config?: BridgeConfig;
  children: React.ReactNode;
}

export function BridgeProvider<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
>({ config, children }: BridgeProviderProps<TActions>) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- config is intentionally captured once on mount
  const bridge = useMemo(() => createBridge<TActions>(config), []);
  const [isAvailable, setIsAvailable] = useState(() => bridge.isAvailable());

  useEffect(() => {
    setIsAvailable(bridge.isAvailable());
    return () => {
      bridge.destroy();
    };
  }, [bridge]);

  const value = useMemo(() => ({ bridge, isAvailable }), [bridge, isAvailable]);

  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
}
```

- [ ] **Step 5: Export from index.ts**

```typescript
// packages/react/src/index.ts
export { BridgeContext, useBridgeContext } from './BridgeContext';
export type { BridgeContextValue } from './BridgeContext';
export { BridgeProvider } from './BridgeProvider';
export type { BridgeProviderProps } from './BridgeProvider';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/react && pnpm vitest run src/BridgeProvider.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/
git commit -m "feat(react): implement BridgeProvider and BridgeContext"
```

---

### Task 5.3: Implement useBridge hook

**Files:**
- Create: `packages/react/src/useBridge.ts`
- Modify: `packages/react/src/index.ts`
- Test: `packages/react/src/useBridge.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/react/src/useBridge.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { BridgeProvider, useBridge } from './index';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BridgeProvider
    config={{
      timeout: 5000,
      fallback: {
        'test.echo': async (payload: any) => ({ echoed: payload.message }),
      },
    }}
  >
    {children}
  </BridgeProvider>
);

describe('useBridge', () => {
  it('should provide call function', () => {
    const { result } = renderHook(() => useBridge(), { wrapper });
    expect(typeof result.current.call).toBe('function');
  });

  it('should provide isAvailable', () => {
    const { result } = renderHook(() => useBridge(), { wrapper });
    expect(typeof result.current.isAvailable).toBe('boolean');
  });

  it('should call bridge actions via fallback', async () => {
    const { result } = renderHook(() => useBridge(), { wrapper });

    let response: any;
    await act(async () => {
      response = await result.current.call('test.echo', { message: 'hello' });
    });

    expect(response).toEqual({ echoed: 'hello' });
  });

  it('should provide on/off for event subscription', () => {
    const { result } = renderHook(() => useBridge(), { wrapper });
    expect(typeof result.current.on).toBe('function');
    expect(typeof result.current.off).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/react && pnpm vitest run src/useBridge.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement useBridge hook**

```typescript
// packages/react/src/useBridge.ts
import { useCallback } from 'react';
import type {
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  InferResponse,
  BridgeCallOptions,
} from '@ts-bridge/shared';
import { useBridgeContext } from './BridgeContext';

export interface UseBridgeReturn<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
> {
  call: <TAction extends ActionNames<TActions>>(
    action: TAction,
    payload: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions,
  ) => Promise<InferResponse<TActions, TAction>>;
  on: <TPayload = unknown>(event: string, handler: (payload: TPayload) => void) => () => void;
  off: (event: string, handler?: (payload: unknown) => void) => void;
  isAvailable: boolean;
}

export function useBridge<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
>(): UseBridgeReturn<TActions> {
  const { bridge, isAvailable } = useBridgeContext<TActions>();

  const call = useCallback(
    <TAction extends ActionNames<TActions>>(
      action: TAction,
      payload: InferPayload<TActions, TAction>,
      options?: BridgeCallOptions,
    ) => bridge.call(action, payload, options),
    [bridge],
  );

  const on = useCallback(
    <TPayload = unknown>(event: string, handler: (payload: TPayload) => void) =>
      bridge.on(event, handler),
    [bridge],
  );

  const off = useCallback(
    (event: string, handler?: (payload: unknown) => void) => bridge.off(event, handler),
    [bridge],
  );

  return { call, on, off, isAvailable };
}
```

- [ ] **Step 4: Export from index.ts**

Add to `packages/react/src/index.ts`:
```typescript
export { useBridge } from './useBridge';
export type { UseBridgeReturn } from './useBridge';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/react && pnpm vitest run src/useBridge.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/useBridge.ts packages/react/src/useBridge.test.tsx packages/react/src/index.ts
git commit -m "feat(react): implement useBridge hook with typed call/on/off"
```

---

### Task 5.4: Implement useEvent hook

**Files:**
- Create: `packages/react/src/useEvent.ts`
- Modify: `packages/react/src/index.ts`
- Test: `packages/react/src/useEvent.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/react/src/useEvent.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { BridgeProvider, useEvent } from './index';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BridgeProvider config={{ timeout: 5000 }}>{children}</BridgeProvider>
);

describe('useEvent', () => {
  it('should subscribe to bridge events on mount and cleanup on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useEvent('notification', handler), { wrapper });
    unmount(); // should not throw
  });

  it('should use latest handler without resubscribing', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { rerender } = renderHook(
      ({ handler }) => useEvent('notification', handler),
      { wrapper, initialProps: { handler: handler1 } },
    );

    // Changing handler should not cause resubscription
    rerender({ handler: handler2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/react && pnpm vitest run src/useEvent.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement useEvent hook**

```typescript
// packages/react/src/useEvent.ts
import { useEffect, useRef } from 'react';
import { useBridgeContext } from './BridgeContext';

/**
 * Subscribe to a native bridge event. Automatically cleans up on unmount.
 * Uses a ref for the handler to avoid resubscribing when handler identity changes.
 */
export function useEvent<TPayload = unknown>(
  event: string,
  handler: (payload: TPayload) => void,
): void {
  const { bridge } = useBridgeContext();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsubscribe = bridge.on(event, (payload: unknown) => {
      handlerRef.current(payload as TPayload);
    });
    return unsubscribe;
  }, [bridge, event]);
}
```

- [ ] **Step 4: Export from index.ts**

Add to `packages/react/src/index.ts`:
```typescript
export { useEvent } from './useEvent';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/react && pnpm vitest run src/useEvent.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/useEvent.ts packages/react/src/useEvent.test.tsx packages/react/src/index.ts
git commit -m "feat(react): implement useEvent hook for native event subscription"
```

---

### Task 5.5: Implement useAction hook (async call with loading/error state)

**Files:**
- Create: `packages/react/src/useAction.ts`
- Modify: `packages/react/src/index.ts`
- Test: `packages/react/src/useAction.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/react/src/useAction.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { BridgeProvider, useAction } from './index';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BridgeProvider
    config={{
      timeout: 5000,
      fallback: {
        'test.echo': async (payload: any) => ({ echoed: payload.message }),
      },
    }}
  >
    {children}
  </BridgeProvider>
);

describe('useAction', () => {
  it('should return execute function and initial state', () => {
    const { result } = renderHook(() => useAction('test.echo'), { wrapper });

    expect(typeof result.current.execute).toBe('function');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should execute action and update data state', async () => {
    const { result } = renderHook(() => useAction('test.echo'), { wrapper });

    await act(async () => {
      await result.current.execute({ message: 'hello' });
    });

    expect(result.current.data).toEqual({ echoed: 'hello' });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle errors and update error state', async () => {
    const errorWrapper = ({ children }: { children: React.ReactNode }) => (
      <BridgeProvider config={{ timeout: 50, fallback: {} }}>{children}</BridgeProvider>
    );

    const { result } = renderHook(() => useAction('nonexistent.action'), {
      wrapper: errorWrapper,
    });

    await act(async () => {
      try {
        await result.current.execute({});
      } catch {
        // expected
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should reset state', async () => {
    const { result } = renderHook(() => useAction('test.echo'), { wrapper });

    await act(async () => {
      await result.current.execute({ message: 'hello' });
    });

    expect(result.current.data).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/react && pnpm vitest run src/useAction.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement useAction hook**

```typescript
// packages/react/src/useAction.ts
import { useState, useCallback } from 'react';
import type {
  ActionDefinitionShape,
  ActionNames,
  InferPayload,
  InferResponse,
  BridgeCallOptions,
} from '@ts-bridge/shared';
import { useBridgeContext } from './BridgeContext';

export interface UseActionReturn<
  TActions extends Record<string, ActionDefinitionShape>,
  TAction extends ActionNames<TActions>,
> {
  execute: (
    payload: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions,
  ) => Promise<InferResponse<TActions, TAction>>;
  data: InferResponse<TActions, TAction> | null;
  error: Error | null;
  isLoading: boolean;
  reset: () => void;
}

export function useAction<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
  TAction extends ActionNames<TActions> = ActionNames<TActions>,
>(
  action: TAction,
  defaultOptions?: BridgeCallOptions,
): UseActionReturn<TActions, TAction> {
  type TResponse = InferResponse<TActions, TAction>;

  const { bridge } = useBridgeContext<TActions>();
  const [data, setData] = useState<TResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (
      payload: InferPayload<TActions, TAction>,
      options?: BridgeCallOptions,
    ): Promise<TResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await bridge.call(action, payload, options ?? defaultOptions);
        setData(result);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [bridge, action, defaultOptions],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { execute, data, error, isLoading, reset };
}
```

- [ ] **Step 4: Export from index.ts**

Add to `packages/react/src/index.ts`:
```typescript
export { useAction } from './useAction';
export type { UseActionReturn } from './useAction';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/react && pnpm vitest run src/useAction.test.tsx`
Expected: PASS

- [ ] **Step 6: Run full react package test suite**

Run: `cd packages/react && pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/useAction.ts packages/react/src/useAction.test.tsx packages/react/src/index.ts
git commit -m "feat(react): implement useAction hook with loading/error state management"
```

---

## Chunk 6: Native Single Entry Point

### Task 6.1: Create createSimpleBridgeHost helper and useBridgeHost hook

**Files:**
- Create: `packages/native/src/hooks/useBridgeHost.ts`
- Modify: `packages/native/src/index.ts`
- Test: `packages/native/src/hooks/useBridgeHost.test.ts`

Note: `BridgeHost.registerHandler` accepts `(payload: TPayload) => Promise<TResponse>` but at runtime passes `(payload, context)`. The `ActionHandler` type in the same file accepts `(payload, context)`. For `createSimpleBridgeHost`, we use `ActionHandler` which matches the runtime signature. The handlers map type uses `ActionHandler` directly.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/native/src/hooks/useBridgeHost.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock React since we're testing in Node
vi.mock('react', () => ({
  useRef: vi.fn((val) => ({ current: val })),
  useMemo: vi.fn((fn) => fn()),
  useCallback: vi.fn((fn) => fn),
  useEffect: vi.fn((fn) => { fn(); }),
}));

vi.mock('react-native', () => ({}));
vi.mock('react-native-webview', () => ({}));

import { createSimpleBridgeHost } from './useBridgeHost';

describe('createSimpleBridgeHost', () => {
  it('should create bridgeHost with webViewProps', () => {
    const result = createSimpleBridgeHost({
      handlers: {
        'test.echo': async (payload: any) => ({ echoed: payload.message }),
      },
    });

    expect(result.bridgeHost).toBeDefined();
    expect(result.messageHandler).toBeDefined();
    expect(result.webViewProps).toBeDefined();
    expect(typeof result.webViewProps.onMessage).toBe('function');
    expect(typeof result.webViewProps.ref).toBe('function');
  });

  it('should register handlers that process messages correctly', async () => {
    const handler = vi.fn(async (payload: any) => ({ result: 'ok' }));
    const { bridgeHost } = createSimpleBridgeHost({
      handlers: {
        'action.one': handler,
      },
    });

    const message = {
      id: 'test-1',
      action: 'action.one',
      payload: { key: 'value' },
      timestamp: Date.now(),
    };

    const response = await bridgeHost.handleMessage(message);
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ result: 'ok' });
  });

  it('should provide sendEvent function', () => {
    const { sendEvent } = createSimpleBridgeHost({ handlers: {} });
    expect(typeof sendEvent).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/native && pnpm vitest run src/hooks/useBridgeHost.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement createSimpleBridgeHost and useBridgeHost**

```typescript
// packages/native/src/hooks/useBridgeHost.ts
import type { BridgeHostConfig, ActionHandler } from '../bridge/BridgeHost';
import { BridgeHost } from '../bridge/BridgeHost';
import { MessageHandler } from '../bridge/MessageHandler';

// ---- Pure function (non-React) ----

export interface SimpleBridgeHostOptions {
  /** Action handlers — key is action name, value is the handler function */
  handlers: Record<string, ActionHandler<any, any>>;
  /** Optional BridgeHost configuration */
  config?: BridgeHostConfig;
  /** Optional debug mode */
  debug?: boolean;
}

export interface SimpleBridgeHostResult {
  bridgeHost: BridgeHost;
  messageHandler: MessageHandler;
  /** Spread these onto your WebView component */
  webViewProps: {
    onMessage: (event: any) => void;
    ref: (ref: any) => void;
  };
  /** Send an event to the web side */
  sendEvent: <T>(event: string, payload: T) => void;
}

/**
 * Creates a simplified bridge host setup. Pure function — usable outside React.
 */
export function createSimpleBridgeHost(
  options: SimpleBridgeHostOptions,
): SimpleBridgeHostResult {
  const { handlers, config, debug } = options;

  const bridgeHost = new BridgeHost({ ...config, debug });
  const messageHandler = new MessageHandler(bridgeHost, { debug });

  // Register all handlers using the internal map to avoid registerHandler's
  // single-argument type constraint (runtime accepts two args)
  for (const [action, handler] of Object.entries(handlers)) {
    bridgeHost.registerHandler(action, handler as any);
  }

  const webViewProps = {
    onMessage: messageHandler.handleWebViewMessage,
    ref: (ref: any) => messageHandler.setWebViewRef(ref),
  };

  const sendEvent = <T>(event: string, payload: T) => {
    bridgeHost.sendEvent(event, payload);
  };

  return { bridgeHost, messageHandler, webViewProps, sendEvent };
}

// ---- React hook ----

import { useMemo, useCallback, useEffect, useRef } from 'react';

export interface UseBridgeHostReturn {
  /** Spread onto your WebView: `<WebView {...webViewProps} source={...} />` */
  webViewProps: {
    onMessage: (event: any) => void;
    ref: (ref: any) => void;
  };
  /** Send an event to the web side */
  sendEvent: <T>(event: string, payload: T) => void;
  /** Direct access to BridgeHost (advanced usage) */
  bridgeHost: BridgeHost;
}

/**
 * React Native hook for simplified bridge host setup.
 * Handlers are captured on mount and do not change after.
 *
 * @example
 * ```tsx
 * const { webViewProps, sendEvent } = useBridgeHost({
 *   handlers: {
 *     'camera.take': async (payload) => takePhoto(payload),
 *     'storage.get': async (payload) => AsyncStorage.getItem(payload.key),
 *   },
 * });
 *
 * return <WebView {...webViewProps} source={{ uri: webUrl }} />;
 * ```
 */
export function useBridgeHost(options: SimpleBridgeHostOptions): UseBridgeHostReturn {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers are captured once on mount
  const result = useMemo(() => createSimpleBridgeHost(options), []);

  useEffect(() => {
    return () => {
      result.bridgeHost.destroy();
    };
  }, [result]);

  const sendEvent = useCallback(
    <T>(event: string, payload: T) => result.sendEvent(event, payload),
    [result],
  );

  return {
    webViewProps: result.webViewProps,
    sendEvent,
    bridgeHost: result.bridgeHost,
  };
}
```

- [ ] **Step 4: Export from index.ts**

Add to `packages/native/src/index.ts`:
```typescript
export { createSimpleBridgeHost, useBridgeHost } from './hooks/useBridgeHost';
export type { SimpleBridgeHostOptions, SimpleBridgeHostResult, UseBridgeHostReturn } from './hooks/useBridgeHost';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/native && pnpm vitest run src/hooks/useBridgeHost.test.ts`
Expected: PASS

- [ ] **Step 6: Run full test suite for regression**

Run: `cd packages/native && pnpm vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/native/src/hooks/ packages/native/src/index.ts
git commit -m "feat(native): add createSimpleBridgeHost and useBridgeHost for simplified setup"
```

---

## Final Verification

- [ ] **Step 1: Build all packages**

Run: `cd /Users/hkj0206/Desktop/web_develop/open_source/ts-bridge && pnpm build`
Expected: All packages build successfully

- [ ] **Step 2: Run all tests**

Run: `cd /Users/hkj0206/Desktop/web_develop/open_source/ts-bridge && pnpm test`
Expected: All tests PASS

- [ ] **Step 3: Type-check all packages**

Run: `cd /Users/hkj0206/Desktop/web_develop/open_source/ts-bridge && pnpm type-check`
Expected: No type errors

---

## Summary of New API Surface

After implementation, users will have:

```typescript
// 1. Type-safe bridge with action map
type MyActions = {
  'camera.take': { payload: { quality: number }; response: { uri: string } };
};
const bridge = createBridge<MyActions>({ timeout: 5000 });
await bridge.call('camera.take', { quality: 0.8 }); // fully typed

// 2. React hooks
<BridgeProvider config={{ timeout: 5000, fallback: {...} }}>
  <App />
</BridgeProvider>

const { call, isAvailable } = useBridge<MyActions>();
const { execute, data, isLoading, error } = useAction('camera.take');
useEvent('notification', (payload) => { /* handle */ });

// 3. Simplified native setup
const { webViewProps, sendEvent } = useBridgeHost({
  handlers: { 'camera.take': async (p) => takePhoto(p) },
});
<WebView {...webViewProps} source={{ uri }} />

// 4. Fallback for browser development
createBridge({ fallback: { 'camera.take': async () => mockPhoto } });

// 5. Global error handling + retry
createBridge({
  onError: (error, ctx) => console.error(ctx.action, error),
  retry: { maxAttempts: 2, delay: 1000, exponentialBackoff: true },
});

// 6. Type-safe plugins with Zod
const camera = defineBridgePlugin({
  name: 'camera',
  version: '1.0.0',
  actions: {
    'camera.take': {
      payload: z.object({ quality: z.number() }),
      response: z.object({ uri: z.string() }),
    },
  },
});
type CameraActions = InferPluginActions<typeof camera>;
```
