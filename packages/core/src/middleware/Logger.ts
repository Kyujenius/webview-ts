/**
 * Logger middleware for debugging bridge communication
 */

import type { Middleware, MiddlewareContext, LoggerMiddlewareOptions } from '@ts-bridge/shared';

/**
 * Logger middleware
 */
export class LoggerMiddleware implements Middleware {
  name = 'logger';

  private options: Required<LoggerMiddlewareOptions>;

  constructor(options: LoggerMiddlewareOptions = {}) {
    this.options = {
      level: options.level ?? 'info',
      includePayload: options.includePayload ?? true,
      includeResponse: options.includeResponse ?? true,
      logger: options.logger ?? this.defaultLogger,
    };
  }

  /**
   * Log request
   */
  async onRequest(context: MiddlewareContext): Promise<void> {
    const { request } = context;
    const data: Record<string, unknown> = {
      id: request.id,
      action: request.action,
    };

    if (this.options.includePayload) {
      data.payload = request.payload;
    }

    this.options.logger(
      this.options.level,
      `[Bridge Request] ${request.action}`,
      data
    );
  }

  /**
   * Log response
   */
  async onResponse(context: MiddlewareContext): Promise<void> {
    if (!context.response) {
      return;
    }

    const { request, response, startTime } = context;
    const duration = Date.now() - startTime;

    const data: Record<string, unknown> = {
      id: response.id,
      action: request.action,
      success: response.success,
      duration: `${duration}ms`,
    };

    if (this.options.includeResponse && response.data) {
      data.data = response.data;
    }

    if (!response.success && response.error) {
      data.error = response.error;
    }

    const level = response.success ? this.options.level : 'error';
    this.options.logger(
      level,
      `[Bridge Response] ${request.action} (${duration}ms)`,
      data
    );
  }

  /**
   * Log error
   */
  async onError(context: MiddlewareContext, error: Error): Promise<void> {
    const { request } = context;
    this.options.logger('error', `[Bridge Error] ${request.action}`, {
      id: request.id,
      action: request.action,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  }

  /**
   * Default logger implementation
   */
  private defaultLogger(level: string, message: string, data?: unknown): void {
    const prefix = `[ts-bridge]`;
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
  }
}
