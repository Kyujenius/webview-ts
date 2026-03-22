import { describe, it, expect, vi } from 'vitest';
import { MiddlewarePipeline } from './MiddlewarePipeline';
import type { Middleware, MiddlewareContext } from '../types/middleware';
import { MetadataMap } from '../metadata/MetadataMap';

function createCtx(action = 'test.action'): MiddlewareContext {
  return {
    request: {
      id: '1',
      action,
      payload: {},
      timestamp: Date.now(),
      sourceId: 'src',
      targetId: 'host',
    },
    startTime: Date.now(),
    metadata: new MetadataMap(),
  };
}

function createMw(name: string, fn: Middleware['fn']): Middleware {
  return { name, fn };
}

describe('MiddlewarePipeline', () => {
  it('executes core when no middleware registered', async () => {
    const pipeline = new MiddlewarePipeline();
    const core = vi.fn();
    await pipeline.execute(createCtx(), core);
    expect(core).toHaveBeenCalledOnce();
  });

  it('executes middleware in onion order (use)', async () => {
    const pipeline = new MiddlewarePipeline();
    const order: string[] = [];
    pipeline.use(
      createMw('a', async (_ctx, next) => {
        order.push('a-in');
        await next();
        order.push('a-out');
      })
    );
    pipeline.use(
      createMw('b', async (_ctx, next) => {
        order.push('b-in');
        await next();
        order.push('b-out');
      })
    );
    await pipeline.execute(createCtx(), async () => {
      order.push('core');
    });
    expect(order).toEqual(['a-in', 'b-in', 'core', 'b-out', 'a-out']);
  });

  it('prepend adds middleware as outermost layer', async () => {
    const pipeline = new MiddlewarePipeline();
    const order: string[] = [];
    pipeline.use(
      createMw('inner', async (_ctx, next) => {
        order.push('inner');
        await next();
      })
    );
    pipeline.prepend(
      createMw('outer', async (_ctx, next) => {
        order.push('outer');
        await next();
      })
    );
    await pipeline.execute(createCtx(), async () => {
      order.push('core');
    });
    expect(order).toEqual(['outer', 'inner', 'core']);
  });

  it('remove returns true and removes middleware by name', async () => {
    const pipeline = new MiddlewarePipeline();
    const order: string[] = [];
    pipeline.use(
      createMw('a', async (_ctx, next) => {
        order.push('a');
        await next();
      })
    );
    pipeline.use(
      createMw('b', async (_ctx, next) => {
        order.push('b');
        await next();
      })
    );
    expect(pipeline.remove('a')).toBe(true);
    await pipeline.execute(createCtx(), async () => {});
    expect(order).toEqual(['b']);
  });

  it('remove returns false for non-existent middleware', () => {
    const pipeline = new MiddlewarePipeline();
    expect(pipeline.remove('nope')).toBe(false);
  });

  it('short-circuits when next() is not called', async () => {
    const pipeline = new MiddlewarePipeline();
    const core = vi.fn();
    pipeline.use(createMw('blocker', async () => {}));
    await pipeline.execute(createCtx(), core);
    expect(core).not.toHaveBeenCalled();
  });

  it('rejects if next() called multiple times', async () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.use(
      createMw('bad', async (_ctx, next) => {
        await next();
        await next();
      })
    );
    await expect(pipeline.execute(createCtx(), async () => {})).rejects.toThrow(
      'next() called multiple times'
    );
  });

  it('propagates middleware errors', async () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.use(
      createMw('fail', async () => {
        throw new Error('boom');
      })
    );
    await expect(pipeline.execute(createCtx(), async () => {})).rejects.toThrow('boom');
  });

  it('middleware can mutate context', async () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.use(
      createMw('mutator', async (ctx, next) => {
        ctx.request.payload = { injected: true };
        await next();
      })
    );
    const ctx = createCtx();
    await pipeline.execute(ctx, async () => {});
    expect(ctx.request.payload).toEqual({ injected: true });
  });

  it('getAll returns copy of middleware array', () => {
    const pipeline = new MiddlewarePipeline();
    const mw = createMw('a', async (_ctx, next) => next());
    pipeline.use(mw);
    const all = pipeline.getAll();
    expect(all).toHaveLength(1);
    all.push(createMw('b', async (_ctx, next) => next()));
    expect(pipeline.getAll()).toHaveLength(1);
  });

  it('clear removes all middleware', () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.use(createMw('a', async (_ctx, next) => next()));
    pipeline.clear();
    expect(pipeline.getAll()).toHaveLength(0);
  });
});
