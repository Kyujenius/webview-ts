import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { BridgeProvider, useAction } from './index';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BridgeProvider
    config={{
      timeout: 5000,
      fallback: { 'test.echo': async (payload: any) => ({ echoed: payload.message }) },
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
    const { result } = renderHook(() => useAction('nonexistent.action'), { wrapper: errorWrapper });
    await act(async () => {
      try {
        await result.current.execute({});
      } catch {
        /* expected */
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
