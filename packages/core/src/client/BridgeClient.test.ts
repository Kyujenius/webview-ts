import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BridgeClient } from './BridgeClient';

describe('BridgeClient', () => {
  let bridge: BridgeClient;

  beforeEach(() => {
    bridge = new BridgeClient({
      timeout: 5000,
    });
  });

  describe('event handling', () => {
    it('should unsubscribe from events', () => {
      const handler = vi.fn();
      const unsubscribe = bridge.on('testEvent', handler);

      unsubscribe();

      // Simulate event dispatch and verify handler is NOT called
      bridge['eventHandlers'].get('testEvent')?.forEach((h) => h({}));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bridge.on('testEvent', handler1);
      bridge.on('testEvent', handler2);

      // Simulate event dispatch and verify both handlers are called
      const payload = { data: 'test' };
      bridge['eventHandlers'].get('testEvent')?.forEach((h) => h(payload));
      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
    });
  });

  describe('fallback normalization', () => {
    it('should treat true as enabled with no handlers', () => {
      const b = new BridgeClient({ fallback: true });
      expect(b.connectionMode).toBe('fallback');
    });

    it('should treat false as disabled', () => {
      const b = new BridgeClient({ fallback: false });
      expect(b.connectionMode).toBe('disconnected');
    });

    it('should treat undefined as disabled', () => {
      const b = new BridgeClient({});
      expect(b.connectionMode).toBe('disconnected');
    });

    it('should accept FallbackMap directly', () => {
      const b = new BridgeClient({
        fallback: { 'test.action': async () => 'ok' },
      });
      expect(b.connectionMode).toBe('fallback');
    });
  });

  describe('destroy', () => {
    it('should preserve event handlers (only clears runtime state)', () => {
      const handler = vi.fn();
      bridge.on('testEvent', handler);

      bridge.destroy();

      // After destroy, event handlers should be preserved
      expect(bridge['eventHandlers'].size).toBe(1);
    });
  });
});
