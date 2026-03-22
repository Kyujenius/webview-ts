import { describe, it, expect, vi } from 'vitest';
import { MetadataMap } from '@webview-ts/shared';
import type { MiddlewareContext } from '@webview-ts/shared';
import { createLogger, LoggerMiddleware } from './Logger';

function makeCtx(overrides?: Partial<MiddlewareContext>): MiddlewareContext {
  return {
    request: {
      id: 'req-1',
      action: 'testAction',
      payload: { key: 'value' },
      timestamp: 1000,
      sourceId: 'web',
      targetId: 'native',
    },
    startTime: Date.now(),
    metadata: new MetadataMap(),
    ...overrides,
  };
}

describe('createLogger', () => {
  it('returns a middleware named "logger"', () => {
    const mw = createLogger();
    expect(mw.name).toBe('logger');
    expect(typeof mw.fn).toBe('function');
  });

  it('logs request and successful response with custom logger', async () => {
    const logger = vi.fn();
    const mw = createLogger({ logger });
    const ctx = makeCtx();

    const next = vi.fn(async () => {
      ctx.response = {
        id: 'req-1',
        success: true,
        data: { result: 42 },
        timestamp: 2000,
        sourceId: 'native',
        targetId: 'web',
      };
    });

    await mw.fn(ctx, next);

    expect(logger).toHaveBeenCalledTimes(2);

    const [reqLevel, reqMsg, reqData] = logger.mock.calls[0];
    expect(reqLevel).toBe('info');
    expect(reqMsg).toContain('[Bridge Request]');
    expect(reqMsg).toContain('testAction');
    expect(reqData).toMatchObject({ id: 'req-1', action: 'testAction', payload: { key: 'value' } });

    const [resLevel, resMsg, resData] = logger.mock.calls[1];
    expect(resLevel).toBe('info');
    expect(resMsg).toContain('[Bridge Response]');
    expect(resMsg).toContain('testAction');
    expect(resData).toMatchObject({
      id: 'req-1',
      action: 'testAction',
      success: true,
      data: { result: 42 },
    });
  });

  it('logs error response with "error" level', async () => {
    const logger = vi.fn();
    const mw = createLogger({ logger });
    const ctx = makeCtx();

    const next = vi.fn(async () => {
      ctx.response = {
        id: 'req-1',
        success: false,
        error: { code: 'HANDLER_ERROR', message: 'something failed' },
        timestamp: 2000,
        sourceId: 'native',
        targetId: 'web',
      };
    });

    await mw.fn(ctx, next);

    expect(logger).toHaveBeenCalledTimes(2);

    const [resLevel, resMsg, resData] = logger.mock.calls[1];
    expect(resLevel).toBe('error');
    expect(resMsg).toContain('[Bridge Response]');
    expect(resData).toMatchObject({
      success: false,
      error: { code: 'HANDLER_ERROR', message: 'something failed' },
    });
  });

  it('logs middleware error and rethrows', async () => {
    const logger = vi.fn();
    const mw = createLogger({ logger });
    const ctx = makeCtx();
    const boom = new Error('pipeline exploded');

    const next = vi.fn(async () => {
      throw boom;
    });

    await expect(mw.fn(ctx, next)).rejects.toThrow('pipeline exploded');

    const errorCalls = logger.mock.calls.filter(([level]) => level === 'error');
    expect(errorCalls).toHaveLength(1);

    const [, errMsg, errData] = errorCalls[0];
    expect(errMsg).toContain('[Bridge Error]');
    expect(errMsg).toContain('testAction');
    expect(errData).toMatchObject({
      id: 'req-1',
      action: 'testAction',
      error: { message: 'pipeline exploded' },
    });
  });

  it('omits payload when includePayload is false', async () => {
    const logger = vi.fn();
    const mw = createLogger({ logger, includePayload: false });
    const ctx = makeCtx();

    await mw.fn(ctx, vi.fn());

    const [, , reqData] = logger.mock.calls[0];
    expect(reqData).not.toHaveProperty('payload');
  });

  it('omits response data when includeResponse is false', async () => {
    const logger = vi.fn();
    const mw = createLogger({ logger, includeResponse: false });
    const ctx = makeCtx();

    const next = vi.fn(async () => {
      ctx.response = {
        id: 'req-1',
        success: true,
        data: { secret: 'hidden' },
        timestamp: 2000,
        sourceId: 'native',
        targetId: 'web',
      };
    });

    await mw.fn(ctx, next);

    const [, , resData] = logger.mock.calls[1];
    expect(resData).not.toHaveProperty('data');
  });

  it('uses custom log level for request and success response', async () => {
    const logger = vi.fn();
    const mw = createLogger({ logger, level: 'debug' });
    const ctx = makeCtx();

    const next = vi.fn(async () => {
      ctx.response = {
        id: 'req-1',
        success: true,
        data: null,
        timestamp: 2000,
        sourceId: 'native',
        targetId: 'web',
      };
    });

    await mw.fn(ctx, next);

    expect(logger.mock.calls[0][0]).toBe('debug');
    expect(logger.mock.calls[1][0]).toBe('debug');
  });
});

describe('LoggerMiddleware (deprecated)', () => {
  it('wraps createLogger and exposes name and fn', () => {
    const mw = new LoggerMiddleware();
    expect(mw.name).toBe('logger');
    expect(typeof mw.fn).toBe('function');
  });
});
