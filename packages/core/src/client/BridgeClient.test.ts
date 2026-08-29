import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

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

describe('custom adapter injection (BridgeConfig.adapter)', () => {
  it('uses the injected adapter for send and receive', async () => {
    const sent: string[] = [];
    let deliver: (raw: string) => void = () => {};
    const adapter = {
      send: (m: unknown) => sent.push(JSON.stringify(m)),
      onMessage: (cb: (raw: string) => void) => {
        deliver = cb;
        return () => {};
      },
      isAvailable: () => true,
      connectionMode: 'native' as const,
    };

    const bridge = new BridgeClient({ adapter });
    bridge.connect();

    const promise = bridge.call('shell.getUser');
    await new Promise((r) => setTimeout(r, 0)); // send happens after the interceptor chain
    const message = JSON.parse(sent[0]);

    deliver(
      JSON.stringify({
        id: message.id,
        success: true,
        data: { name: 'A' },
        timestamp: Date.now(),
        sourceId: 'host',
        targetId: message.sourceId,
      })
    );

    await expect(promise).resolves.toEqual({ name: 'A' });
    bridge.destroy();
  });

  it('falls back when the injected adapter is unavailable and fallback is enabled', async () => {
    const adapter = {
      send: () => {},
      isAvailable: () => false,
      connectionMode: 'disconnected' as const,
    };
    const bridge = new BridgeClient({
      adapter,
      fallback: { 'shell.getUser': async () => ({ name: 'mock' }) },
    });
    expect(bridge.connectionMode).toBe('fallback');
    await expect(bridge.call('shell.getUser')).resolves.toEqual({ name: 'mock' });
  });
});
