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
