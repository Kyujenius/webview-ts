/**
 * Middleware pipeline for request/response processing
 */

import type { Middleware, MiddlewareContext } from '@ts-bridge/shared';

/**
 * Middleware pipeline executor
 */
export class MiddlewarePipeline {
  private middleware: Middleware[] = [];

  /**
   * Add middleware to pipeline
   */
  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Remove middleware from pipeline
   */
  remove(middlewareName: string): boolean {
    const index = this.middleware.findIndex((m) => m.name === middlewareName);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Execute request middleware
   */
  async executeRequest(context: MiddlewareContext): Promise<void> {
    for (const middleware of this.middleware) {
      if (middleware.onRequest) {
        try {
          await middleware.onRequest(context);
        } catch (error) {
          console.error(`[ts-bridge] Middleware error (${middleware.name}):`, error);
          if (middleware.onError) {
            await middleware.onError(context, error as Error);
          }
          throw error;
        }
      }
    }
  }

  /**
   * Execute response middleware
   */
  async executeResponse(context: MiddlewareContext): Promise<void> {
    // Execute in reverse order for response
    for (let i = this.middleware.length - 1; i >= 0; i--) {
      const middleware = this.middleware[i];
      if (middleware.onResponse) {
        try {
          await middleware.onResponse(context);
        } catch (error) {
          console.error(`[ts-bridge] Middleware error (${middleware.name}):`, error);
          if (middleware.onError) {
            await middleware.onError(context, error as Error);
          }
        }
      }
    }
  }

  /**
   * Execute error middleware
   */
  async executeError(context: MiddlewareContext, error: Error): Promise<void> {
    for (const middleware of this.middleware) {
      if (middleware.onError) {
        try {
          await middleware.onError(context, error);
        } catch (middlewareError) {
          console.error(
            `[ts-bridge] Middleware error handler failed (${middleware.name}):`,
            middlewareError
          );
        }
      }
    }
  }

  /**
   * Get all middleware
   */
  getAll(): Middleware[] {
    return [...this.middleware];
  }

  /**
   * Clear all middleware
   */
  clear(): void {
    this.middleware = [];
  }
}
