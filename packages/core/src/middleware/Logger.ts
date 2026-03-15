/**
 * Logger middleware — logs request, response, and errors in a single onion layer.
 */

import type { Middleware, MiddlewareFn, LoggerMiddlewareOptions } from '@ts-bridge/shared';

type LoggerFn = (level: string, message: string, data?: unknown) => void;

const defaultLogger: LoggerFn = (level, message, data) => {
  const prefix = '[ts-bridge]';
  const logData = data ? [message, data] : [message];

  switch (level) {
    case 'error':
      console.error(prefix, ...logData);
      break;
    case 'warn':
      console.warn(prefix, ...logData);
      break;
    case 'debug':
      console.debug(prefix, ...logData);
      break;
    default:
      console.log(prefix, ...logData);
  }
};

export function createLogger(options: LoggerMiddlewareOptions = {}): Middleware {
  const level = options.level ?? 'info';
  const includePayload = options.includePayload ?? true;
  const includeResponse = options.includeResponse ?? true;
  const logger = options.logger ?? defaultLogger;

  const fn: MiddlewareFn = async (ctx, next) => {
    const { request } = ctx;
    const data: Record<string, unknown> = {
      id: request.id,
      action: request.action,
    };

    if (includePayload) {
      data.payload = request.payload;
    }

    logger(level, `[Bridge Request] ${request.action}`, data);

    try {
      await next();

      // After next() — response phase
      if (ctx.response) {
        const duration = Date.now() - ctx.startTime;
        const resData: Record<string, unknown> = {
          id: ctx.response.id,
          action: request.action,
          success: ctx.response.success,
          duration: `${duration}ms`,
        };

        if (includeResponse && ctx.response.data) {
          resData.data = ctx.response.data;
        }

        if (!ctx.response.success && ctx.response.error) {
          resData.error = ctx.response.error;
        }

        const resLevel = ctx.response.success ? level : 'error';
        logger(resLevel, `[Bridge Response] ${request.action} (${duration}ms)`, resData);
      }
    } catch (error) {
      logger('error', `[Bridge Error] ${request.action}`, {
        id: request.id,
        action: request.action,
        error: {
          message: (error as Error).message,
          stack: (error as Error).stack,
        },
      });
      throw error;
    }
  };

  return { name: 'logger', fn };
}

/**
 * @deprecated Use createLogger() instead
 */
export class LoggerMiddleware {
  private middleware: Middleware;

  constructor(options: LoggerMiddlewareOptions = {}) {
    this.middleware = createLogger(options);
  }

  get name() {
    return this.middleware.name;
  }
  get fn() {
    return this.middleware.fn;
  }
}
