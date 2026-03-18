import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { createBridgeReact } from './createBridgeReact';
import { definePlugin, action, event } from '@webview-ts/shared';

// --- Plugin with events ---
const testPlugin = definePlugin(
  'test',
  {
    echo: action<{ msg: string }, { echoed: string }>(),
    greet: action<{ name: string }, { greeting: string }>(),
  },
  { events: { updated: event<{ value: number }>() } }
).withFallback({
  echo: async (payload) => ({ echoed: payload.msg }),
  greet: async (payload) => ({ greeting: `Hello ${payload.name}` }),
});

const { BridgeProvider, useBridge, usePlugin, useAction } = createBridgeReact({
  plugins: [testPlugin],
});

// --- Wrapper with React.StrictMode ---
const strictWrapper = ({ children }: { children: React.ReactNode }) => (
  <React.StrictMode>
    <BridgeProvider>{children}</BridgeProvider>
  </React.StrictMode>
);

const normalWrapper = ({ children }: { children: React.ReactNode }) => (
  <BridgeProvider>{children}</BridgeProvider>
);

describe('React.StrictMode integration', () => {
  describe('BridgeProvider', () => {
    it('renders without errors in StrictMode', () => {
      const { result } = renderHook(() => useBridge(), { wrapper: strictWrapper });
      expect(result.current.bridge).toBeDefined();
      expect(typeof result.current.call).toBe('function');
    });

    it('exposes correct connectionMode in StrictMode', () => {
      const { result } = renderHook(() => useBridge(), { wrapper: strictWrapper });
      expect(['native', 'fallback', 'disconnected']).toContain(result.current.connectionMode);
    });
  });

  describe('useBridge — call actions', () => {
    it('call() works in StrictMode via fallback', async () => {
      const { result } = renderHook(() => useBridge(), { wrapper: strictWrapper });
      let response: any;
      await act(async () => {
        response = await result.current.call('test.echo', { msg: 'strict' });
      });
      expect(response).toEqual({ echoed: 'strict' });
    });

    it('multiple calls work sequentially in StrictMode', async () => {
      const { result } = renderHook(() => useBridge(), { wrapper: strictWrapper });
      let r1: any, r2: any;
      await act(async () => {
        r1 = await result.current.call('test.echo', { msg: 'first' });
        r2 = await result.current.call('test.greet', { name: 'World' });
      });
      expect(r1).toEqual({ echoed: 'first' });
      expect(r2).toEqual({ greeting: 'Hello World' });
    });
  });

  describe('usePlugin', () => {
    it('returns typed action state objects in StrictMode', () => {
      const { result } = renderHook(() => usePlugin(testPlugin), { wrapper: strictWrapper });
      expect(typeof result.current.echo).toBe('object');
      expect(typeof result.current.echo.execute).toBe('function');
      expect(typeof result.current.greet).toBe('object');
      expect(typeof result.current.greet.execute).toBe('function');
      expect(typeof result.current.on).toBe('function');
    });

    it('plugin methods work via fallback in StrictMode', async () => {
      const { result } = renderHook(() => usePlugin(testPlugin), { wrapper: strictWrapper });
      await act(async () => {
        await result.current.echo.execute({ msg: 'plugin-strict' });
      });
      expect(result.current.echo.data).toEqual({ echoed: 'plugin-strict' });
    });

    it('on() returns an unsubscribe function', () => {
      const { result } = renderHook(() => usePlugin(testPlugin), { wrapper: strictWrapper });
      const handler = vi.fn();
      const unsub = result.current.on('updated', handler);
      expect(typeof unsub).toBe('function');
      unsub();
    });
  });

  describe('useAction', () => {
    it('execute works in StrictMode', async () => {
      const { result } = renderHook(() => useAction('test.echo'), { wrapper: strictWrapper });
      expect(result.current.data).toBeNull();
      await act(async () => {
        await result.current.execute({ msg: 'action-strict' });
      });
      expect(result.current.data).toEqual({ echoed: 'action-strict' });
    });

    it('reset works in StrictMode', async () => {
      const { result } = renderHook(() => useAction('test.greet'), { wrapper: strictWrapper });
      await act(async () => {
        await result.current.execute({ name: 'Test' });
      });
      expect(result.current.data).toEqual({ greeting: 'Hello Test' });
      act(() => result.current.reset());
      expect(result.current.data).toBeNull();
    });
  });

  describe('unmount → remount cycle', () => {
    it('useBridge survives unmount/remount', async () => {
      // First mount
      const { unmount } = renderHook(() => useBridge(), { wrapper: normalWrapper });
      unmount();

      // Re-mount — new provider
      const { result } = renderHook(() => useBridge(), { wrapper: normalWrapper });
      let response: any;
      await act(async () => {
        response = await result.current.call('test.echo', { msg: 'remounted' });
      });
      expect(response).toEqual({ echoed: 'remounted' });
    });

    it('usePlugin survives unmount/remount', async () => {
      const { unmount } = renderHook(() => usePlugin(testPlugin), { wrapper: normalWrapper });
      unmount();

      const { result } = renderHook(() => usePlugin(testPlugin), { wrapper: normalWrapper });
      await act(async () => {
        await result.current.greet.execute({ name: 'Remount' });
      });
      expect(result.current.greet.data).toEqual({ greeting: 'Hello Remount' });
    });

    it('event subscription works after remount', () => {
      const { unmount: unmount1 } = renderHook(() => usePlugin(testPlugin), {
        wrapper: normalWrapper,
      });
      unmount1();

      const { result } = renderHook(() => usePlugin(testPlugin), { wrapper: normalWrapper });
      const handler = vi.fn();
      const unsub = result.current.on('updated', handler);

      // Verify subscription is functional
      expect(typeof unsub).toBe('function');
      unsub();
    });
  });

  describe('no leaked state between cycles', () => {
    it('action state (loading, data, error) starts fresh on remount', async () => {
      // First mount — execute action
      const { result: r1, unmount } = renderHook(() => useAction('test.echo'), {
        wrapper: normalWrapper,
      });
      await act(async () => {
        await r1.current.execute({ msg: 'first' });
      });
      expect(r1.current.data).toEqual({ echoed: 'first' });
      unmount();

      // Re-mount — state should be fresh
      const { result: r2 } = renderHook(() => useAction('test.echo'), {
        wrapper: normalWrapper,
      });
      expect(r2.current.data).toBeNull();
      expect(r2.current.isLoading).toBe(false);
      expect(r2.current.error).toBeNull();
    });
  });
});
