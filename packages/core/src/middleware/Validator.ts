/**
 * Validator middleware — validates request before send, response after receive.
 */

import type {
  Middleware,
  MiddlewareFn,
  MiddlewareContext,
  ValidatorMiddlewareOptions,
} from '@ts-bridge/shared';
import { isBridgeMessage, isBridgeResponse } from '@ts-bridge/shared';

function handleValidationError(
  message: string,
  onError: 'throw' | 'warn' | 'ignore',
  ctx: MiddlewareContext
): void {
  const error = new Error(`[Validation Error] ${message}`);

  switch (onError) {
    case 'throw':
      throw error;
    case 'warn':
      console.warn(error.message, ctx);
      break;
    case 'ignore':
      break;
  }
}

export function createValidator(options: ValidatorMiddlewareOptions = {}): Middleware {
  const validateRequests = options.validateRequests ?? true;
  const validateResponses = options.validateResponses ?? true;
  const onValidationError = options.onValidationError ?? 'throw';

  const fn: MiddlewareFn = async (ctx, next) => {
    // Request phase — validate before sending
    if (validateRequests) {
      if (!isBridgeMessage(ctx.request)) {
        handleValidationError('Invalid bridge message format', onValidationError, ctx);
      }
      if (!ctx.request.id || !ctx.request.action) {
        handleValidationError(
          'Message missing required fields (id, action)',
          onValidationError,
          ctx
        );
      }
    }

    await next();

    // Response phase — validate after receiving
    if (validateResponses && ctx.response) {
      if (!isBridgeResponse(ctx.response)) {
        handleValidationError('Invalid bridge response format', onValidationError, ctx);
      }
      if (!ctx.response.id || typeof ctx.response.success !== 'boolean') {
        handleValidationError(
          'Response missing required fields (id, success)',
          onValidationError,
          ctx
        );
      }
      if (!ctx.response.success && !ctx.response.error) {
        handleValidationError(
          'Failed response must include error information',
          onValidationError,
          ctx
        );
      }
    }
  };

  return { name: 'validator', fn };
}

/**
 * @deprecated Use createValidator() instead
 */
export class ValidatorMiddleware {
  private middleware: Middleware;

  constructor(options: ValidatorMiddlewareOptions = {}) {
    this.middleware = createValidator(options);
  }

  get name() {
    return this.middleware.name;
  }
  get fn() {
    return this.middleware.fn;
  }
}
