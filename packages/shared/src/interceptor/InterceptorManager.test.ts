import { describe, expect, it } from 'vite-plus/test';

import { InterceptorManager } from './InterceptorManager';

describe('InterceptorManager', () => {
  it('returns value unchanged when no interceptors registered', async () => {
    const manager = new InterceptorManager<string>();
    const result = await manager.execute('hello');
    expect(result).toBe('hello');
  });

  it('executes interceptors in registration order', async () => {
    const manager = new InterceptorManager<string>();
    manager.use({ name: 'a', fn: (v) => v + '-a' });
    manager.use({ name: 'b', fn: (v) => v + '-b' });
    const result = await manager.execute('start');
    expect(result).toBe('start-a-b');
  });

  it('use() returns an unsubscribe function', async () => {
    const manager = new InterceptorManager<string>();
    const unsub = manager.use({ name: 'a', fn: (v) => v + '-a' });
    unsub();
    const result = await manager.execute('start');
    expect(result).toBe('start');
  });

  it('handles async interceptors', async () => {
    const manager = new InterceptorManager<number>();
    manager.use({
      name: 'double',
      fn: async (v) => {
        await new Promise((r) => setTimeout(r, 1));
        return v * 2;
      },
    });
    const result = await manager.execute(5);
    expect(result).toBe(10);
  });

  it('stops chain and throws when interceptor throws', async () => {
    const manager = new InterceptorManager<string>();
    const order: string[] = [];
    manager.use({
      name: 'bomb',
      fn: () => {
        throw new Error('boom');
      },
    });
    manager.use({
      name: 'never',
      fn: (v) => {
        order.push('never');
        return v;
      },
    });
    await expect(manager.execute('start')).rejects.toThrow('boom');
    expect(order).toEqual([]);
  });

  it('clear removes all interceptors', async () => {
    const manager = new InterceptorManager<string>();
    manager.use({ name: 'upper', fn: (v) => v.toUpperCase() });
    manager.clear();
    await expect(manager.execute('start')).resolves.toBe('start');
  });
});
