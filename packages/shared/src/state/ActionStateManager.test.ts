import { describe, it, expect, vi } from 'vitest';
import { ActionStateManager } from './ActionStateManager';

describe('ActionStateManager', () => {
  function makeManager(result: unknown = { ok: true }) {
    const callFn = vi.fn().mockResolvedValue(result);
    const manager = new ActionStateManager(callFn);
    return { manager, callFn };
  }

  it('initial state is idle with null data and error', () => {
    const { manager } = makeManager();
    const state = manager.getSnapshot();
    expect(state.status).toBe('idle');
    expect(state.data).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('status is loading while execute is in flight', async () => {
    let resolveCall!: (v: unknown) => void;
    const callFn = vi.fn().mockReturnValue(
      new Promise((r) => {
        resolveCall = r;
      })
    );
    const manager = new ActionStateManager(callFn);

    const promise = manager.execute({ foo: 1 });
    expect(manager.getSnapshot().status).toBe('loading');
    expect(manager.getSnapshot().isLoading).toBe(true);

    resolveCall({ ok: true });
    await promise;
    expect(manager.getSnapshot().status).toBe('success');
  });

  it('populates data on successful execute', async () => {
    const { manager } = makeManager({ name: 'Alice' });
    await manager.execute({ id: 1 });
    const state = manager.getSnapshot();
    expect(state.data).toEqual({ name: 'Alice' });
    expect(state.error).toBeNull();
  });

  it('sets error on failure and preserves previous data', async () => {
    // first failure: data starts as null
    const failFn = vi.fn().mockRejectedValue(new Error('network error'));
    const manager2 = new ActionStateManager(failFn);
    await expect(manager2.execute({})).rejects.toThrow('network error');
    expect(manager2.getSnapshot().status).toBe('error');
    expect(manager2.getSnapshot().error?.message).toBe('network error');
    expect(manager2.getSnapshot().data).toBeNull();

    // success then failure: previous data is preserved
    const manager3 = new ActionStateManager(
      vi.fn().mockResolvedValueOnce({ name: 'Alice' }).mockRejectedValueOnce(new Error('fail'))
    );
    await manager3.execute({});
    expect(manager3.getSnapshot().data).toEqual({ name: 'Alice' });
    await expect(manager3.execute({})).rejects.toThrow('fail');
    expect(manager3.getSnapshot().data).toEqual({ name: 'Alice' }); // previous data preserved
  });

  it('reset() returns state to idle', async () => {
    const { manager } = makeManager({ ok: true });
    await manager.execute({});
    expect(manager.getSnapshot().status).toBe('success');
    manager.reset();
    const state = manager.getSnapshot();
    expect(state.status).toBe('idle');
    expect(state.data).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('subscribe: listener is called on state change', async () => {
    const { manager } = makeManager({ ok: true });
    const listener = vi.fn();
    manager.subscribe(listener);
    await manager.execute({});
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('subscribe: listener is not called after unsubscribe', async () => {
    const { manager } = makeManager({ ok: true });
    const listener = vi.fn();
    const unsub = manager.subscribe(listener);
    unsub();
    await manager.execute({});
    expect(listener).not.toHaveBeenCalled();
  });

  it('watch: listener is called with new state on change', async () => {
    const { manager } = makeManager({ result: 42 });
    const states: string[] = [];
    manager.watch((s) => states.push(s.status));
    await manager.execute({});
    expect(states).toContain('loading');
    expect(states).toContain('success');
  });

  it('watch: listener is not called after unsubscribe', async () => {
    const { manager } = makeManager({ ok: true });
    const listener = vi.fn();
    const unsub = manager.watch(listener);
    unsub();
    await manager.execute({});
    expect(listener).not.toHaveBeenCalled();
  });

  it('getSnapshot: returns same reference when state has not changed', () => {
    const { manager } = makeManager();
    const a = manager.getSnapshot();
    const b = manager.getSnapshot();
    expect(a).toBe(b);
  });

  it('getSnapshot: returns new reference after execute', async () => {
    const { manager } = makeManager({ ok: true });
    const before = manager.getSnapshot();
    await manager.execute({});
    const after = manager.getSnapshot();
    expect(after).not.toBe(before);
  });
});

describe('ActionStateManager cache', () => {
  it('returns cached result on second execute with same payload (cache: true)', async () => {
    const callFn = vi.fn().mockResolvedValue({ value: 1 });
    const manager = new ActionStateManager(callFn, true);

    await manager.execute({ id: 1 });
    await manager.execute({ id: 1 });

    expect(callFn).toHaveBeenCalledTimes(1);
    expect(manager.getSnapshot().data).toEqual({ value: 1 });
  });

  it('does not cache when cache is disabled (no cache arg)', async () => {
    const callFn = vi.fn().mockResolvedValue({ value: 1 });
    const manager = new ActionStateManager(callFn);

    await manager.execute({ id: 1 });
    await manager.execute({ id: 1 });

    expect(callFn).toHaveBeenCalledTimes(2);
  });

  it('caches different payloads separately', async () => {
    const callFn = vi
      .fn()
      .mockImplementation((payload: { id: number }) => Promise.resolve({ value: payload.id }));
    const manager = new ActionStateManager(callFn, true);

    await manager.execute({ id: 1 });
    await manager.execute({ id: 2 });
    await manager.execute({ id: 1 });
    await manager.execute({ id: 2 });

    expect(callFn).toHaveBeenCalledTimes(2);
  });

  it('expires cache after TTL', async () => {
    const callFn = vi.fn().mockResolvedValue({ value: 1 });
    const manager = new ActionStateManager(callFn, 50);

    await manager.execute({ id: 1 });
    expect(callFn).toHaveBeenCalledTimes(1);

    await new Promise((r) => setTimeout(r, 60));

    await manager.execute({ id: 1 });
    expect(callFn).toHaveBeenCalledTimes(2);
  });

  it('invalidateCache clears cache but keeps state', async () => {
    const callFn = vi.fn().mockResolvedValue({ value: 1 });
    const manager = new ActionStateManager(callFn, true);

    await manager.execute({ id: 1 });
    expect(manager.getSnapshot().status).toBe('success');
    expect(manager.getSnapshot().data).toEqual({ value: 1 });

    manager.invalidateCache();

    expect(manager.getSnapshot().status).toBe('success');
    expect(manager.getSnapshot().data).toEqual({ value: 1 });

    await manager.execute({ id: 1 });
    expect(callFn).toHaveBeenCalledTimes(2);
  });

  it('reset clears both cache and state', async () => {
    const callFn = vi.fn().mockResolvedValue({ value: 1 });
    const manager = new ActionStateManager(callFn, true);

    await manager.execute({ id: 1 });
    expect(manager.getSnapshot().status).toBe('success');

    manager.reset();

    expect(manager.getSnapshot().status).toBe('idle');
    expect(manager.getSnapshot().data).toBeNull();

    await manager.execute({ id: 1 });
    expect(callFn).toHaveBeenCalledTimes(2);
  });
});
