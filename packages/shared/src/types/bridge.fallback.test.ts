import { describe, it, expect, expectTypeOf } from 'vitest';
import type { BridgeConfig, FallbackHandler } from './bridge';

describe('Fallback config types', () => {
  it('should accept fallback handlers map', () => {
    const config: BridgeConfig = {
      fallback: {
        'camera.take': async (_payload) => ({ uri: '/mock.jpg' }),
        'storage.get': async (_payload) => ({ value: 'mock' }),
      },
    };
    expect(config.fallback).toBeDefined();
  });

  it('should accept fallback as boolean', () => {
    const config: BridgeConfig = { fallback: true };
    expect(config.fallback).toBe(true);
  });

  it('should type FallbackHandler correctly', () => {
    const handler: FallbackHandler = async (_payload) => ({ result: 'ok' });
    expectTypeOf(handler).toMatchTypeOf<(payload: unknown) => Promise<unknown> | unknown>();
  });
});
