import { describe, it, expect, vi, afterEach } from 'vitest';
import { BridgeClient } from './BridgeClient';

describe('BridgeClient - connect/disconnect lifecycle (Strict Mode)', () => {
  let bridge: BridgeClient;

  afterEach(() => {
    bridge?.dispose();
  });

  it('connect() adds a message listener', () => {
    const spy = vi.spyOn(window, 'addEventListener');
    bridge = new BridgeClient({ fallback: true });

    // Constructor should NOT add listener
    const beforeConnect = spy.mock.calls.filter((c) => c[0] === 'message');
    expect(beforeConnect).toHaveLength(0);

    bridge.connect();
    const afterConnect = spy.mock.calls.filter((c) => c[0] === 'message');
    expect(afterConnect).toHaveLength(1);

    spy.mockRestore();
  });

  it('disconnect() removes the message listener', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    bridge = new BridgeClient({ fallback: true });
    bridge.connect();
    bridge.disconnect();

    const removeCalls = removeSpy.mock.calls.filter((c) => c[0] === 'message');
    expect(removeCalls).toHaveLength(1);
    removeSpy.mockRestore();
  });

  it('connect() is idempotent — calling twice adds only one listener', () => {
    const spy = vi.spyOn(window, 'addEventListener');
    bridge = new BridgeClient({ fallback: true });

    bridge.connect();
    bridge.connect();
    bridge.connect();

    const messageCalls = spy.mock.calls.filter((c) => c[0] === 'message');
    expect(messageCalls).toHaveLength(1);
    spy.mockRestore();
  });

  it('disconnect() is idempotent — safe to call without connect', () => {
    bridge = new BridgeClient({ fallback: true });
    expect(() => bridge.disconnect()).not.toThrow();
    expect(() => bridge.disconnect()).not.toThrow();
  });

  it('Strict Mode cycle: connect → destroy → connect leaves exactly one listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    bridge = new BridgeClient({ fallback: true });

    // Simulate useEffect mount
    bridge.connect();
    // Simulate Strict Mode cleanup
    bridge.destroy();
    // Simulate useEffect re-mount
    bridge.connect();

    const addCalls = addSpy.mock.calls.filter((c) => c[0] === 'message');
    const removeCalls = removeSpy.mock.calls.filter((c) => c[0] === 'message');
    // Added twice, removed once → net 1 active listener
    expect(addCalls).toHaveLength(2);
    expect(removeCalls).toHaveLength(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('configuration survives connect/disconnect cycles', () => {
    bridge = new BridgeClient({ fallback: true });
    const mw = { name: 'test', fn: async (_ctx: any, next: any) => next() };
    bridge.use(mw);
    bridge['registerInterceptors']({ 'test.action': [mw] });
    bridge['registerTimeouts']({ 'test.action': 5000 });
    bridge.on('testEvent', vi.fn());

    // Full Strict Mode cycle
    bridge.connect();
    bridge.destroy();
    bridge.connect();

    expect(bridge['middleware'].getAll()).toHaveLength(1);
    expect(bridge['actionInterceptors'].size).toBe(1);
    expect(bridge['actionTimeouts'].size).toBe(1);
    expect(bridge['eventHandlers'].size).toBe(1);
  });

  it('no duplicate events after connect/disconnect cycle', () => {
    bridge = new BridgeClient({ fallback: true });
    const handler = vi.fn();
    bridge.on('test.updated', handler);

    bridge.connect();
    bridge.destroy();
    bridge.connect();

    // Simulate receiving a single event via postMessage
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ event: 'test.updated', payload: { x: 1 }, timestamp: Date.now() }),
      })
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ x: 1 });
  });

  it('no events received after final disconnect', () => {
    bridge = new BridgeClient({ fallback: true });
    const handler = vi.fn();
    bridge.on('test.updated', handler);

    bridge.connect();
    bridge.disconnect();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ event: 'test.updated', payload: { x: 1 }, timestamp: Date.now() }),
      })
    );

    expect(handler).not.toHaveBeenCalled();
  });

  it('multiple Strict Mode cycles — no listener accumulation', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    bridge = new BridgeClient({ fallback: true });

    // Simulate 3 consecutive Strict Mode mount/unmount cycles
    for (let i = 0; i < 3; i++) {
      bridge.connect();
      bridge.destroy();
    }
    // Final mount
    bridge.connect();

    const addCalls = addSpy.mock.calls.filter((c) => c[0] === 'message');
    const removeCalls = removeSpy.mock.calls.filter((c) => c[0] === 'message');
    // 4 adds, 3 removes → 1 active listener
    expect(addCalls.length - removeCalls.length).toBe(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('call() works after connect/disconnect cycle (fallback mode)', async () => {
    bridge = new BridgeClient({
      fallback: {
        'test.echo': async (payload: any) => ({ echoed: payload.msg }),
      },
    });

    bridge.connect();
    bridge.destroy();
    bridge.connect();

    const result = await bridge.call('test.echo' as any, { msg: 'hello' } as any);
    expect(result).toEqual({ echoed: 'hello' });
  });
});
