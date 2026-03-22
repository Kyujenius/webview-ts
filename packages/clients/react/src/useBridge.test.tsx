import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { BridgeProvider, useBridge } from './index';

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
  it('should provide on/off', () => {
    const { result } = renderHook(() => useBridge(), { wrapper });
    expect(typeof result.current.on).toBe('function');
    expect(typeof result.current.off).toBe('function');
  });
});
