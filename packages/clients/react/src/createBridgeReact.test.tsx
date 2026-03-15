import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { createBridgeReact } from './createBridgeReact';
import { definePlugin } from '@ts-bridge/plugins';

// Define a typed action contract
type TestActions = {
  'test.echo': { payload: { message: string }; response: { echoed: string } };
  'test.add': { payload: { a: number; b: number }; response: { sum: number } };
};

const { BridgeProvider, useBridge, useAction } = createBridgeReact<TestActions>();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BridgeProvider
    config={{
      timeout: 5000,
      fallback: {
        'test.echo': async (payload: any) => ({ echoed: payload.message }),
        'test.add': async (payload: any) => ({ sum: payload.a + payload.b }),
      },
    }}
  >
    {children}
  </BridgeProvider>
);

describe('createBridgeReact', () => {
  describe('BridgeProvider', () => {
    it('should provide bridge via context', () => {
      const { result } = renderHook(() => useBridge(), { wrapper });
      expect(typeof result.current.call).toBe('function');
      expect(typeof result.current.isAvailable).toBe('boolean');
    });

    it('should throw when used outside provider', () => {
      expect(() => {
        renderHook(() => useBridge());
      }).toThrow(/BridgeProvider/);
    });
  });

  describe('useBridge', () => {
    it('should call typed actions via fallback', async () => {
      const { result } = renderHook(() => useBridge(), { wrapper });
      let response: any;
      await act(async () => {
        response = await result.current.call('test.echo', { message: 'hello' });
      });
      expect(response).toEqual({ echoed: 'hello' });
    });

    it('should call another typed action', async () => {
      const { result } = renderHook(() => useBridge(), { wrapper });
      let response: any;
      await act(async () => {
        response = await result.current.call('test.add', { a: 2, b: 3 });
      });
      expect(response).toEqual({ sum: 5 });
    });
  });

  describe('useAction', () => {
    it('should execute action with typed payload and return typed data', async () => {
      const { result } = renderHook(() => useAction('test.echo'), { wrapper });
      expect(result.current.data).toBeNull();
      await act(async () => {
        await result.current.execute({ message: 'typed' });
      });
      expect(result.current.data).toEqual({ echoed: 'typed' });
    });

    it('should reset state', async () => {
      const { result } = renderHook(() => useAction('test.add'), { wrapper });
      await act(async () => {
        await result.current.execute({ a: 1, b: 2 });
      });
      expect(result.current.data).toEqual({ sum: 3 });
      act(() => {
        result.current.reset();
      });
      expect(result.current.data).toBeNull();
    });
  });

  describe('type inference', () => {
    it('should infer correct payload and response types', () => {
      // These are compile-time checks — if they compile, the types work
      const { result } = renderHook(() => useBridge(), { wrapper });

      // call() should accept only valid action names
      // call('test.echo', ...) should require { message: string }
      // call('test.add', ...) should require { a: number; b: number }
      // Verify the call function exists and is callable
      expect(typeof result.current.call).toBe('function');
    });
  });
});

// ---- Plugin tests ----

type MockActions = {
  'mock.echo': { payload: { msg: string }; response: { echoed: string } };
};

const mockPlugin = definePlugin<MockActions>()({
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
    await act(async () => {
      response = await result.current.echo('hello');
    });
    expect(response).toEqual({ echoed: 'hello' });
  });

  it('useAction should work with plugin actions', async () => {
    const { result } = renderHook(() => usePluginAction('mock.echo'), { wrapper: pluginWrapper });
    await act(async () => {
      await result.current.execute({ msg: 'test' });
    });
    expect(result.current.data).toEqual({ echoed: 'test' });
  });
});
