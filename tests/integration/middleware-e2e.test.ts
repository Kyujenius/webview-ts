import type { Middleware } from '@webview-ts/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { createLoopbackPair } from './helpers/create-loopback-pair';

function createLogMiddleware(name: string, log: string[]): Middleware {
  return {
    name,
    fn: async (ctx, next) => {
      log.push(`${name}:before`);
      await next();
      log.push(`${name}:after`);
    },
  };
}

describe('Middleware end-to-end', () => {
  let pair: ReturnType<typeof createLoopbackPair>;

  afterEach(() => pair?.destroy());

  it('client middleware wraps the call in onion order', async () => {
    const log: string[] = [];
    pair = createLoopbackPair({
      clientMiddleware: [createLogMiddleware('outer', log), createLogMiddleware('inner', log)],
    });
    pair.registerHostHandler('test', async () => {
      log.push('handler');
      return {};
    });

    await pair.bridge.call('test', {});

    expect(log).toEqual(['outer:before', 'inner:before', 'handler', 'inner:after', 'outer:after']);
  });

  it('host middleware wraps handler execution', async () => {
    const log: string[] = [];
    pair = createLoopbackPair({
      hostMiddleware: [
        createLogMiddleware('host-outer', log),
        createLogMiddleware('host-inner', log),
      ],
    });
    pair.registerHostHandler('test', async () => {
      log.push('handler');
      return {};
    });

    // Call directly via host to test host-side middleware
    const response = await pair.host.handleMessage({
      id: 'mw-test-1',
      sourceId: 'client-1',
      targetId: 'host',
      action: 'test',
      payload: {},
      timestamp: Date.now(),
    });

    expect(response.success).toBe(true);
    expect(log).toEqual([
      'host-outer:before',
      'host-inner:before',
      'handler',
      'host-inner:after',
      'host-outer:after',
    ]);
  });

  it('middleware can read and write metadata', async () => {
    const captured: Map<string, unknown> = new Map();

    const setter: Middleware = {
      name: 'setter',
      fn: async (ctx, next) => {
        ctx.metadata.set('requestedAt', ctx.startTime);
        ctx.metadata.set('custom', 'value');
        await next();
      },
    };

    const reader: Middleware = {
      name: 'reader',
      fn: async (ctx, next) => {
        await next();
        for (const [k, v] of ctx.metadata) captured.set(k, v);
      },
    };

    pair = createLoopbackPair({ clientMiddleware: [reader, setter] });
    pair.registerHostHandler('test', async () => ({}));

    await pair.bridge.call('test', {});

    expect(captured.get('custom')).toBe('value');
    expect(captured.get('requestedAt')).toBeTypeOf('number');
  });

  it('short-circuiting middleware prevents handler execution', async () => {
    let handlerCalled = false;

    const cacheHit: Middleware = {
      name: 'cache',
      fn: async (ctx) => {
        // Don't call next() — short-circuit with cached response
        ctx.response = {
          id: ctx.request.id,
          sourceId: 'host',
          targetId: ctx.request.sourceId,
          success: true,
          data: { cached: true },
          timestamp: Date.now(),
        };
      },
    };

    pair = createLoopbackPair({ clientMiddleware: [cacheHit] });
    pair.registerHostHandler('test', async () => {
      handlerCalled = true;
      return { cached: false };
    });

    const result = await pair.bridge.call('test', {});
    expect(result).toEqual({ cached: true });
    expect(handlerCalled).toBe(false);
  });

  it('middleware error propagates to caller', async () => {
    const failing: Middleware = {
      name: 'bomb',
      fn: async () => {
        throw new Error('middleware exploded');
      },
    };

    pair = createLoopbackPair({ clientMiddleware: [failing] });
    pair.registerHostHandler('test', async () => ({}));

    await expect(pair.bridge.call('test', {})).rejects.toThrow('middleware exploded');
  });
});
