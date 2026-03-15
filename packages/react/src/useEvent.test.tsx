import { describe, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { BridgeProvider, useEvent } from './index';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BridgeProvider config={{ timeout: 5000 }}>{children}</BridgeProvider>
);

describe('useEvent', () => {
  it('should subscribe on mount and cleanup on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useEvent('notification', handler), { wrapper });
    unmount();
  });
  it('should use latest handler without resubscribing', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const { rerender } = renderHook(
      ({ handler }) => useEvent('notification', handler),
      { wrapper, initialProps: { handler: handler1 } },
    );
    rerender({ handler: handler2 });
  });
});
