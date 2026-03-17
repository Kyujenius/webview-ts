import { describe, it, expect } from 'vitest';
import { executeOnionPipeline } from './executeOnionPipeline';

describe('executeOnionPipeline', () => {
  it('should execute middlewares in onion order', async () => {
    const order: string[] = [];
    const middlewares = [
      {
        name: 'a',
        fn: async (ctx: any, next: any) => {
          order.push('a-in');
          await next();
          order.push('a-out');
        },
      },
      {
        name: 'b',
        fn: async (ctx: any, next: any) => {
          order.push('b-in');
          await next();
          order.push('b-out');
        },
      },
    ];
    const ctx = { action: 'test', payload: {}, metadata: new Map(), response: undefined };
    await executeOnionPipeline(middlewares, ctx as any, async () => {
      order.push('core');
    });
    expect(order).toEqual(['a-in', 'b-in', 'core', 'b-out', 'a-out']);
  });

  it('should record traces when tracing enabled', async () => {
    const middlewares = [
      {
        name: 'slow',
        fn: async (ctx: any, next: any) => {
          await next();
        },
      },
    ];
    const ctx = { action: 'test', payload: {}, metadata: new Map(), response: undefined };
    const traces = await executeOnionPipeline(middlewares, ctx as any, async () => {}, {
      tracing: true,
    });
    expect(traces).toHaveLength(1);
    expect(traces[0].name).toBe('slow');
    expect(traces[0].layer).toBe('global');
    expect(traces[0].enterMs).toBeGreaterThanOrEqual(0);
    expect(traces[0].shortCircuit).toBe(false);
  });

  it('should detect short-circuit when next is not called', async () => {
    const middlewares = [
      {
        name: 'blocker',
        fn: async (_ctx: any, _next: any) => {
          /* no next() */
        },
      },
    ];
    const ctx = { action: 'test', payload: {}, metadata: new Map(), response: undefined };
    const traces = await executeOnionPipeline(middlewares, ctx as any, async () => {}, {
      tracing: true,
    });
    expect(traces[0].shortCircuit).toBe(true);
  });

  it('should skip tracing for __skipTrace middlewares', async () => {
    const middlewares = [
      {
        name: 'traced',
        fn: async (ctx: any, next: any) => {
          await next();
        },
      },
      {
        name: 'skipped',
        fn: async (ctx: any, next: any) => {
          await next();
        },
        __skipTrace: true,
      },
    ];
    const ctx = { action: 'test', payload: {}, metadata: new Map(), response: undefined };
    const traces = await executeOnionPipeline(middlewares, ctx as any, async () => {}, {
      tracing: true,
    });
    expect(traces).toHaveLength(1);
    expect(traces[0].name).toBe('traced');
  });

  it('should skip tracing for middlewares in skipTraceFor set', async () => {
    const middlewares = [
      {
        name: 'traced',
        fn: async (ctx: any, next: any) => {
          await next();
        },
      },
      {
        name: 'skipped',
        fn: async (ctx: any, next: any) => {
          await next();
        },
      },
    ];
    const ctx = { action: 'test', payload: {}, metadata: new Map(), response: undefined };
    const traces = await executeOnionPipeline(middlewares, ctx as any, async () => {}, {
      tracing: true,
      skipTraceFor: new Set(['skipped']),
    });
    expect(traces).toHaveLength(1);
    expect(traces[0].name).toBe('traced');
  });

  it('should capture errors in trace', async () => {
    const middlewares = [
      {
        name: 'failing',
        fn: async (_ctx: any, _next: any) => {
          throw new Error('boom');
        },
      },
    ];
    const ctx = { action: 'test', payload: {}, metadata: new Map(), response: undefined };
    await expect(
      executeOnionPipeline(middlewares, ctx as any, async () => {}, { tracing: true })
    ).rejects.toThrow('boom');
  });

  it('should return empty traces when no middlewares', async () => {
    const ctx = { action: 'test', payload: {}, metadata: new Map(), response: undefined };
    const traces = await executeOnionPipeline([], ctx as any, async () => {});
    expect(traces).toEqual([]);
  });

  it('should set plugin and layer in traces', async () => {
    const middlewares = [
      {
        name: 'interceptor',
        fn: async (ctx: any, next: any) => {
          await next();
        },
      },
    ];
    const ctx = { action: 'test', payload: {}, metadata: new Map(), response: undefined };
    const traces = await executeOnionPipeline(middlewares, ctx as any, async () => {}, {
      tracing: true,
      layer: 'plugin',
      plugin: 'camera',
    });
    expect(traces[0].layer).toBe('plugin');
    expect(traces[0].plugin).toBe('camera');
  });

  it('should detect metadata changes', async () => {
    const middlewares = [
      {
        name: 'setter',
        fn: async (ctx: any, next: any) => {
          ctx.metadata.set('custom', 42);
          await next();
        },
      },
    ];
    const ctx = { action: 'test', payload: {}, metadata: new Map(), response: undefined };
    const traces = await executeOnionPipeline(middlewares, ctx as any, async () => {}, {
      tracing: true,
    });
    expect(traces[0].metadataChanges).toEqual({ custom: 42 });
  });

  it('should reject if next() called multiple times', async () => {
    const middlewares = [
      {
        name: 'bad',
        fn: async (ctx: any, next: any) => {
          await next();
          await next();
        },
      },
    ];
    const ctx = { action: 'test', payload: {}, metadata: new Map(), response: undefined };
    await expect(executeOnionPipeline(middlewares, ctx as any, async () => {})).rejects.toThrow(
      'next() called multiple times'
    );
  });
});
