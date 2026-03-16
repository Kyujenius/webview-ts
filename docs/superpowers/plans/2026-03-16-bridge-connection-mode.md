# Bridge Connection Mode 설계 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `isAvailable`를 단일 boolean에서 3-state connection mode(`native` | `fallback` | `disconnected`)로 분리하여, 실제 네이티브 연결 여부와 fallback 사용 여부를 구분한다.

**Architecture:**
- `BridgeManager`가 내부적으로 어떤 adapter가 활성화되었는지 추적: `NativeAdapter`(실제 RN/iOS/Android) vs `FallbackAdapter` vs `MockAdapter`(아무것도 없음)
- `isAvailable()` boolean은 하위 호환성을 위해 유지하되, 새로운 `connectionMode` 프로퍼티를 추가
- React 측에서 `useBridge()`가 `connectionMode`를 노출, 예시 앱에서 이를 활용

**Tech Stack:** TypeScript, React

---

## 현재 문제

1. `FallbackAdapter.isAvailable()`이 `true`를 반환 → fallback 모드에서도 "Connected to Native"로 표시
2. 사용자가 native 연결인지 fallback인지 구분할 방법이 없음
3. `isAvailable`는 "call이 가능한가"만 의미하는데, 이를 "네이티브 연결 상태"로 오해하기 쉬움

## 설계

```typescript
// 새로운 connection mode type
type ConnectionMode = 'native' | 'fallback' | 'disconnected';
```

| Adapter | `isAvailable()` | `connectionMode` |
|---------|-----------------|------------------|
| ReactNativeWebViewAdapter / IOSAdapter / AndroidAdapter | `true` | `'native'` |
| FallbackAdapter | `true` | `'fallback'` |
| MockAdapter (no native, no fallback) | `false` | `'disconnected'` |

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/shared/src/types/bridge.ts` | Modify | `ConnectionMode` type 추가, `Bridge` interface에 `connectionMode` 추가 |
| `packages/core/src/adapters/NativeAdapter.ts` | Modify | `NativeAdapter` interface에 `connectionMode` getter 추가 |
| `packages/core/src/adapters/FallbackAdapter.ts` | Modify | `connectionMode` = `'fallback'` 반환 |
| `packages/core/src/adapters/IOSAdapter.ts` | Modify | `connectionMode` = `'native'` 반환 |
| `packages/core/src/adapters/AndroidAdapter.ts` | Modify | `connectionMode` = `'native'` 반환 |
| `packages/core/src/adapters/ReactNativeWebViewAdapter.ts` | Modify | `connectionMode` = `'native'` 반환 |
| `packages/core/src/bridge/BridgeManager.ts` | Modify | `connectionMode` getter 추가 |
| `packages/clients/react/src/createBridgeReact.tsx` | Modify | context에 `connectionMode` 노출 |
| `packages/shared/src/types/bridge.ts` | Modify | `Bridge` interface에 `connectionMode` 추가 |
| `examples/react/src/pages/HomePage.tsx` | Modify | `connectionMode` 기반 상태 표시 |
| `examples/react/src/pages/*.tsx` | Modify | 각 페이지 mode-badge를 `connectionMode` 기반으로 |
| Tests | Modify | `BridgeManager`, `BridgeProvider`, `createBridgeReact` 테스트 업데이트 |

---

## Chunk 1: Core — ConnectionMode type & adapter interface

### Task 1: ConnectionMode type 정의

**Files:**
- Modify: `packages/shared/src/types/bridge.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/shared/src/types/bridge.test.ts (or type-level test)
// ConnectionMode type should be importable
import type { ConnectionMode } from './bridge';
const mode: ConnectionMode = 'native';
const mode2: ConnectionMode = 'fallback';
const mode3: ConnectionMode = 'disconnected';
```

- [ ] **Step 2: Add ConnectionMode type to bridge.ts**

`packages/shared/src/types/bridge.ts` — Bridge interface 바로 위에 추가:

```typescript
/**
 * Bridge connection mode.
 * - 'native': connected to a real native host (RN WebView, iOS, Android)
 * - 'fallback': using fallback handlers (web-only development)
 * - 'disconnected': no native bridge, no fallback configured
 */
export type ConnectionMode = 'native' | 'fallback' | 'disconnected';
```

`Bridge` interface에 추가:

```typescript
export interface Bridge {
  // ... existing members ...

  /**
   * Current connection mode
   */
  connectionMode: ConnectionMode;
}
```

- [ ] **Step 3: Export from shared package barrel**

`packages/shared/src/types/index.ts`에서 `ConnectionMode`이 re-export 되는지 확인. `bridge.ts`에서 이미 `export type`으로 정의하면 barrel에서 자동으로 잡히는지 확인.

- [ ] **Step 4: Build shared package to verify**

Run: `npx turbo run build --filter=@webview-ts/shared --force`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/bridge.ts
git commit -m "feat: add ConnectionMode type to shared types"
```

### Task 2: NativeAdapter interface에 connectionMode 추가

**Files:**
- Modify: `packages/core/src/adapters/NativeAdapter.ts`
- Modify: `packages/core/src/adapters/FallbackAdapter.ts`
- Modify: `packages/core/src/adapters/IOSAdapter.ts`
- Modify: `packages/core/src/adapters/AndroidAdapter.ts`
- Modify: `packages/core/src/adapters/ReactNativeWebViewAdapter.ts`

- [ ] **Step 1: Update NativeAdapter interface**

```typescript
import type { ConnectionMode } from '@webview-ts/shared';

export interface NativeAdapter {
  send(message: BridgeMessage): void;
  isAvailable(): boolean;
  getPlatform(): Platform;
  connectionMode: ConnectionMode;  // NEW
}
```

- [ ] **Step 2: Update MockAdapter (in NativeAdapter.ts)**

```typescript
class MockAdapter implements NativeAdapter {
  // ... existing ...
  get connectionMode(): ConnectionMode {
    return 'disconnected';
  }
}
```

- [ ] **Step 3: Update FallbackAdapter**

```typescript
get connectionMode(): ConnectionMode {
  return 'fallback';
}
```

- [ ] **Step 4: Update IOSAdapter, AndroidAdapter, ReactNativeWebViewAdapter**

Each gets:
```typescript
get connectionMode(): ConnectionMode {
  return 'native';
}
```

- [ ] **Step 5: Build core to verify**

Run: `npx turbo run build --filter=@webview-ts/core --force`
Expected: SUCCESS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/adapters/
git commit -m "feat: add connectionMode to all adapters"
```

### Task 3: BridgeManager에 connectionMode 노출

**Files:**
- Modify: `packages/core/src/bridge/BridgeManager.ts`
- Test: `packages/core/src/bridge/BridgeManager.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// In BridgeManager.test.ts
describe('connectionMode', () => {
  it('should return "disconnected" when no native bridge and no fallback', () => {
    const bridge = createBridge();
    expect(bridge.connectionMode).toBe('disconnected');
  });

  it('should return "fallback" when fallback is configured', () => {
    const bridge = createBridge({ fallback: { 'test.action': async () => ({}) } });
    expect(bridge.connectionMode).toBe('fallback');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/src/bridge/BridgeManager.test.ts`
Expected: FAIL — `connectionMode` does not exist

- [ ] **Step 3: Implement connectionMode getter on BridgeManager**

```typescript
// In BridgeManager class
/**
 * Current connection mode
 */
get connectionMode(): ConnectionMode {
  return this.adapter.connectionMode;
}
```

Import `ConnectionMode` at the top:
```typescript
import type { ConnectionMode } from '@webview-ts/shared';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/src/bridge/BridgeManager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/bridge/BridgeManager.ts packages/core/src/bridge/BridgeManager.test.ts
git commit -m "feat: expose connectionMode on BridgeManager"
```

---

## Chunk 2: React layer & Example app

### Task 4: createBridgeReact에 connectionMode 노출

**Files:**
- Modify: `packages/clients/react/src/createBridgeReact.tsx`

- [ ] **Step 1: Update BridgeContextValue**

```typescript
import type { ConnectionMode } from '@webview-ts/shared';

interface BridgeContextValue<TActions extends Record<string, ActionDefinitionShape>> {
  bridge: BridgeManager<TActions>;
  isAvailable: boolean;
  connectionMode: ConnectionMode;
}
```

- [ ] **Step 2: Update BridgeProvider inside createBridgeReact**

```typescript
const [connectionMode, setConnectionMode] = useState(() => bridge.connectionMode);
useEffect(() => {
  setIsAvailable(bridge.isAvailable());
  setConnectionMode(bridge.connectionMode);
  return () => { bridge.destroy(); };
}, [bridge]);
const value = useMemo(
  () => ({ bridge, isAvailable, connectionMode }),
  [bridge, isAvailable, connectionMode]
);
```

- [ ] **Step 3: Update useBridge return**

```typescript
function useBridge() {
  const { bridge, isAvailable, connectionMode } = useTypedContext();
  // ... existing call/on/off ...
  return { call, on, off, isAvailable, connectionMode, bridge };
}
```

- [ ] **Step 4: Build react package**

Run: `npx turbo run build --filter=@webview-ts/react --force`
Expected: SUCCESS

- [ ] **Step 5: Commit**

```bash
git add packages/clients/react/src/createBridgeReact.tsx
git commit -m "feat: expose connectionMode in React hooks"
```

### Task 5: BridgeProvider (standalone) 업데이트

**Files:**
- Modify: `packages/clients/react/src/BridgeProvider.tsx`
- Modify: `packages/clients/react/src/BridgeContext.ts`

- [ ] **Step 1: Update BridgeContext type**

```typescript
import type { ConnectionMode } from '@webview-ts/shared';

export interface BridgeContextValue {
  bridge: BridgeManager;
  isAvailable: boolean;
  connectionMode: ConnectionMode;
}
```

- [ ] **Step 2: Update BridgeProvider**

Same pattern as Task 4 — add `connectionMode` to state and context value.

- [ ] **Step 3: Build and verify**

Run: `npx turbo run build --filter=@webview-ts/react --force`

- [ ] **Step 4: Commit**

```bash
git add packages/clients/react/src/BridgeProvider.tsx packages/clients/react/src/BridgeContext.ts
git commit -m "feat: add connectionMode to standalone BridgeProvider"
```

### Task 6: Example app에서 connectionMode 사용

**Files:**
- Modify: `examples/react/src/pages/HomePage.tsx`
- Modify: `examples/react/src/pages/ClipboardPage.tsx`
- Modify: `examples/react/src/pages/DevicePage.tsx`
- Modify: `examples/react/src/pages/SharePage.tsx`
- Modify: `examples/react/src/pages/CameraPage.tsx`
- Modify: `examples/react/src/pages/LocationPage.tsx`
- Modify: `examples/react/src/pages/StoragePage.tsx`
- Modify: `examples/react/src/pages/BiometricPage.tsx`

- [ ] **Step 1: Update HomePage**

```tsx
const { connectionMode } = useBridge();

// Replace the existing status display:
<span className={connectionMode === 'native' ? 'status-connected' : connectionMode === 'fallback' ? 'status-fallback' : 'status-disconnected'}>
  {connectionMode === 'native' ? 'Connected to Native' : connectionMode === 'fallback' ? 'Fallback Mode' : 'Disconnected'}
</span>
```

- [ ] **Step 2: Update all plugin pages**

Each page currently has:
```tsx
const { isAvailable } = useBridge();
<p className="mode-badge">{isAvailable ? 'Native Bridge' : 'Fallback (...)'}</p>
```

Replace with:
```tsx
const { connectionMode } = useBridge();

function modeBadgeText(mode: ConnectionMode, fallbackLabel: string): string {
  switch (mode) {
    case 'native': return 'Native Bridge';
    case 'fallback': return `Fallback (${fallbackLabel})`;
    case 'disconnected': return 'Disconnected';
  }
}

<p className="mode-badge">{modeBadgeText(connectionMode, 'Mock Data')}</p>
```

각 페이지별 fallbackLabel:
- Camera → `'Mock Data'`
- Location → `'Seoul, KR'`
- Storage → `'In-Memory'`
- Biometric → `'Mock'`
- Clipboard → `'In-Memory'`
- Device → `'Web'`
- Share → `'Web Share API'`

- [ ] **Step 3: Build example app**

Run: `npx turbo run build --force`
Expected: SUCCESS

- [ ] **Step 4: Visual verify with Playwright**

Run dev server and check:
- HomePage shows "Fallback Mode" (not "Connected to Native")
- Each plugin page shows "Fallback (...)" with correct label
- DevTools ts-bridge button visible

- [ ] **Step 5: Commit**

```bash
git add examples/react/src/pages/
git commit -m "feat: display connectionMode on all example pages"
```

---

## Chunk 3: Tests

### Task 7: Unit tests 업데이트

**Files:**
- Modify: `packages/clients/react/src/createBridgeReact.test.tsx`
- Modify: `packages/clients/react/src/BridgeProvider.test.tsx`

- [ ] **Step 1: Add connectionMode test to createBridgeReact**

```typescript
it('should expose connectionMode as disconnected when no native and no fallback', () => {
  // render BridgeProvider without fallback config
  // expect useBridge().connectionMode === 'disconnected'
});

it('should expose connectionMode as fallback when fallback configured', () => {
  // render BridgeProvider with fallback config
  // expect useBridge().connectionMode === 'fallback'
});
```

- [ ] **Step 2: Implement tests**

Follow existing test patterns in these files.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All pass (except pre-existing integration test failure)

- [ ] **Step 4: Full build**

Run: `npx turbo run build --force`
Expected: All 6 tasks successful

- [ ] **Step 5: Commit**

```bash
git add packages/clients/react/src/*.test.tsx
git commit -m "test: add connectionMode tests"
```
