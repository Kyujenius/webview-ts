import { describe, it, expect, vi } from 'vitest';
import { createBridge } from '../index';

describe('Fallback mode', () => {
  it('should use fallback handlers when native is unavailable', async () => {
    const bridge = createBridge({
      fallback: {
        'camera.take': async (_payload: any) => ({
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
    const bridge = createBridge({ fallback: {}, timeout: 50 });
    await expect(bridge.call('missing.action', {})).rejects.toThrow();
  });

  it('should log to console when fallback is true', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bridge = createBridge({ fallback: true, timeout: 50 });
    await expect(bridge.call('any.action', {})).rejects.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ts-bridge fallback]'),
      expect.anything()
    );
    consoleSpy.mockRestore();
  });

  it('should not use fallback when native IS available', async () => {
    const win = globalThis as any;
    win.webkit = { messageHandlers: { tsBridge: { postMessage: vi.fn() } } };
    const fallbackFn = vi.fn();
    const bridge = createBridge({ fallback: { 'test.action': fallbackFn }, timeout: 50 });
    try {
      await bridge.call('test.action', {});
    } catch {
      /* timeout expected */
    }
    expect(fallbackFn).not.toHaveBeenCalled();
    delete win.webkit;
  });
});
