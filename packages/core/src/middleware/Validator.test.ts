import type { MiddlewareContext } from '@webview-ts/shared';
import { MetadataMap } from '@webview-ts/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createValidator } from './Validator';

function createValidRequest() {
  return {
    id: 'msg-1',
    action: 'test',
    payload: null,
    timestamp: Date.now(),
    sourceId: 'src',
    targetId: 'host',
  };
}

function createValidResponse() {
  return {
    id: 'msg-1',
    success: true as const,
    data: null,
    timestamp: Date.now(),
    sourceId: 'host',
    targetId: 'src',
  };
}

function createCtx(overrides?: Partial<MiddlewareContext>): MiddlewareContext {
  return {
    request: createValidRequest(),
    startTime: Date.now(),
    metadata: new MetadataMap(),
    ...overrides,
  };
}

const noop = async () => {};

describe('createValidator', () => {
  it('returns a middleware named "validator"', () => {
    const mw = createValidator();
    expect(mw.name).toBe('validator');
    expect(typeof mw.fn).toBe('function');
  });

  describe('valid request and response', () => {
    it('passes valid request without error', async () => {
      const mw = createValidator();
      const ctx = createCtx();
      await expect(mw.fn(ctx, noop)).resolves.toBeUndefined();
    });

    it('passes valid request and response without error', async () => {
      const mw = createValidator();
      const ctx = createCtx();
      const next = async () => {
        ctx.response = createValidResponse();
      };
      await expect(mw.fn(ctx, next)).resolves.toBeUndefined();
    });
  });

  describe('request validation — onValidationError: "throw" (default)', () => {
    it('throws on invalid request (missing id)', async () => {
      const mw = createValidator();
      const ctx = createCtx({
        request: { ...createValidRequest(), id: '' },
      });
      await expect(mw.fn(ctx, noop)).rejects.toThrow('[Validation Error]');
    });

    it('throws on request that fails isBridgeMessage (missing action)', async () => {
      const mw = createValidator();
      const ctx = createCtx({
        // @ts-expect-error intentionally invalid
        request: {
          id: 'msg-1',
          payload: null,
          timestamp: Date.now(),
          sourceId: 'src',
          targetId: 'host',
        },
      });
      await expect(mw.fn(ctx, noop)).rejects.toThrow('[Validation Error]');
    });
  });

  describe('response validation — onValidationError: "throw" (default)', () => {
    it('throws on invalid response (missing success field)', async () => {
      const mw = createValidator();
      const ctx = createCtx();
      const next = async () => {
        // @ts-expect-error intentionally invalid
        ctx.response = { id: 'msg-1', timestamp: Date.now(), sourceId: 'host', targetId: 'src' };
      };
      await expect(mw.fn(ctx, next)).rejects.toThrow('[Validation Error]');
    });

    it('throws on invalid response (missing id)', async () => {
      const mw = createValidator();
      const ctx = createCtx();
      const next = async () => {
        // @ts-expect-error intentionally invalid
        ctx.response = {
          success: true,
          data: null,
          timestamp: Date.now(),
          sourceId: 'host',
          targetId: 'src',
        };
      };
      await expect(mw.fn(ctx, next)).rejects.toThrow('[Validation Error]');
    });
  });

  describe('onValidationError: "warn"', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('warns instead of throwing on invalid request', async () => {
      const mw = createValidator({ onValidationError: 'warn' });
      const ctx = createCtx({
        request: { ...createValidRequest(), id: '' },
      });
      await expect(mw.fn(ctx, noop)).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[Validation Error]'), ctx);
    });

    it('warns instead of throwing on invalid response', async () => {
      const mw = createValidator({ onValidationError: 'warn' });
      const ctx = createCtx();
      const next = async () => {
        // @ts-expect-error intentionally invalid
        ctx.response = { id: 'msg-1', timestamp: Date.now(), sourceId: 'host', targetId: 'src' };
      };
      await expect(mw.fn(ctx, next)).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[Validation Error]'), ctx);
    });
  });

  describe('onValidationError: "ignore"', () => {
    it('ignores invalid request without throwing or warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mw = createValidator({ onValidationError: 'ignore' });
      const ctx = createCtx({
        request: { ...createValidRequest(), id: '' },
      });
      await expect(mw.fn(ctx, noop)).resolves.toBeUndefined();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('ignores invalid response without throwing or warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mw = createValidator({ onValidationError: 'ignore' });
      const ctx = createCtx();
      const next = async () => {
        // @ts-expect-error intentionally invalid
        ctx.response = { id: 'msg-1', timestamp: Date.now(), sourceId: 'host', targetId: 'src' };
      };
      await expect(mw.fn(ctx, next)).resolves.toBeUndefined();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('validateRequests: false', () => {
    it('skips request validation even for invalid request', async () => {
      const mw = createValidator({ validateRequests: false });
      const ctx = createCtx({
        request: { ...createValidRequest(), id: '' },
      });
      await expect(mw.fn(ctx, noop)).resolves.toBeUndefined();
    });
  });

  describe('validateResponses: false', () => {
    it('skips response validation even for invalid response', async () => {
      const mw = createValidator({ validateResponses: false });
      const ctx = createCtx();
      const next = async () => {
        // @ts-expect-error intentionally invalid
        ctx.response = { id: 'msg-1', timestamp: Date.now(), sourceId: 'host', targetId: 'src' };
      };
      await expect(mw.fn(ctx, next)).resolves.toBeUndefined();
    });
  });

  describe('no response set', () => {
    it('skips response validation when ctx.response is undefined', async () => {
      const mw = createValidator();
      const ctx = createCtx();
      // next() does not set ctx.response
      await expect(mw.fn(ctx, noop)).resolves.toBeUndefined();
    });
  });
});
