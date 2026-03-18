import { describe, it, expect, vi } from 'vitest';
import { ActionStateManager } from './ActionStateManager';

describe('ActionStateManager', () => {
  function makeManager(result: unknown = { ok: true }) {
    const callFn = vi.fn().mockResolvedValue(result);
    const manager = new ActionStateManager(callFn);
    return { manager, callFn };
  }

  it('초기 상태는 idle이고 data/error는 null', () => {
    const { manager } = makeManager();
    const state = manager.getSnapshot();
    expect(state.status).toBe('idle');
    expect(state.data).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('execute 중에는 loading 상태', async () => {
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

  it('execute 성공 시 data가 채워진다', async () => {
    const { manager } = makeManager({ name: 'Alice' });
    await manager.execute({ id: 1 });
    const state = manager.getSnapshot();
    expect(state.data).toEqual({ name: 'Alice' });
    expect(state.error).toBeNull();
  });

  it('execute 실패 시 error가 채워지고 이전 data는 유지된다', async () => {
    // 첫 실패: data는 null
    const failFn = vi.fn().mockRejectedValue(new Error('network error'));
    const manager2 = new ActionStateManager(failFn);
    await expect(manager2.execute({})).rejects.toThrow('network error');
    expect(manager2.getSnapshot().status).toBe('error');
    expect(manager2.getSnapshot().error?.message).toBe('network error');
    expect(manager2.getSnapshot().data).toBeNull();

    // 성공 후 실패: 이전 data 유지
    const manager3 = new ActionStateManager(
      vi.fn().mockResolvedValueOnce({ name: 'Alice' }).mockRejectedValueOnce(new Error('fail'))
    );
    await manager3.execute({});
    expect(manager3.getSnapshot().data).toEqual({ name: 'Alice' });
    await expect(manager3.execute({})).rejects.toThrow('fail');
    expect(manager3.getSnapshot().data).toEqual({ name: 'Alice' }); // 이전 data 유지
  });

  it('reset() 호출 시 idle 상태로 돌아간다', async () => {
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

  it('subscribe: 상태 변화 시 listener가 호출된다', async () => {
    const { manager } = makeManager({ ok: true });
    const listener = vi.fn();
    manager.subscribe(listener);
    await manager.execute({});
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('subscribe: unsubscribe 후에는 listener가 호출되지 않는다', async () => {
    const { manager } = makeManager({ ok: true });
    const listener = vi.fn();
    const unsub = manager.subscribe(listener);
    unsub();
    await manager.execute({});
    expect(listener).not.toHaveBeenCalled();
  });

  it('watch: 상태 변화 시 새 state와 함께 listener가 호출된다', async () => {
    const { manager } = makeManager({ result: 42 });
    const states: string[] = [];
    manager.watch((s) => states.push(s.status));
    await manager.execute({});
    expect(states).toContain('loading');
    expect(states).toContain('success');
  });

  it('watch: unsubscribe 후에는 listener가 호출되지 않는다', async () => {
    const { manager } = makeManager({ ok: true });
    const listener = vi.fn();
    const unsub = manager.watch(listener);
    unsub();
    await manager.execute({});
    expect(listener).not.toHaveBeenCalled();
  });

  it('getSnapshot: 상태 변화 전까지 같은 참조를 반환한다', () => {
    const { manager } = makeManager();
    const a = manager.getSnapshot();
    const b = manager.getSnapshot();
    expect(a).toBe(b);
  });

  it('getSnapshot: execute 후에는 새 참조를 반환한다', async () => {
    const { manager } = makeManager({ ok: true });
    const before = manager.getSnapshot();
    await manager.execute({});
    const after = manager.getSnapshot();
    expect(after).not.toBe(before);
  });
});
