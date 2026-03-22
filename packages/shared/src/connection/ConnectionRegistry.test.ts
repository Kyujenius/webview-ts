import { describe, expect, it, vi } from 'vitest';

import { ConnectionRegistry } from './ConnectionRegistry';

describe('ConnectionRegistry', () => {
  it('registers and retrieves a connection', () => {
    const registry = new ConnectionRegistry();
    const sender = vi.fn();
    registry.register('checkout-abc', sender);
    expect(registry.get('checkout-abc')).toBeDefined();
  });

  it('unregisters a connection', () => {
    const registry = new ConnectionRegistry();
    registry.register('checkout-abc', vi.fn());
    registry.unregister('checkout-abc');
    expect(registry.get('checkout-abc')).toBeUndefined();
  });

  it('routes to specific target', () => {
    const registry = new ConnectionRegistry();
    const senderA = vi.fn();
    const senderB = vi.fn();
    registry.register('webview-a', senderA);
    registry.register('webview-b', senderB);

    registry.sendTo('webview-b', '{"test":true}');
    expect(senderA).not.toHaveBeenCalled();
    expect(senderB).toHaveBeenCalledWith('{"test":true}');
  });

  it('broadcasts to all connections', () => {
    const registry = new ConnectionRegistry();
    const senderA = vi.fn();
    const senderB = vi.fn();
    registry.register('webview-a', senderA);
    registry.register('webview-b', senderB);

    registry.broadcast('{"event":"update"}');
    expect(senderA).toHaveBeenCalledWith('{"event":"update"}');
    expect(senderB).toHaveBeenCalledWith('{"event":"update"}');
  });

  it('broadcasts excluding a source', () => {
    const registry = new ConnectionRegistry();
    const senderA = vi.fn();
    const senderB = vi.fn();
    registry.register('webview-a', senderA);
    registry.register('webview-b', senderB);

    registry.broadcast('{"event":"update"}', 'webview-a');
    expect(senderA).not.toHaveBeenCalled();
    expect(senderB).toHaveBeenCalledWith('{"event":"update"}');
  });

  it('throws when sending to unregistered target', () => {
    const registry = new ConnectionRegistry();
    expect(() => registry.sendTo('unknown', 'msg')).toThrow(
      '[webview-ts] No connection found for targetId: unknown'
    );
  });

  it('returns all registered connections', () => {
    const registry = new ConnectionRegistry();
    registry.register('a', vi.fn());
    registry.register('b', vi.fn());
    expect(registry.getAll()).toHaveLength(2);
  });
});
