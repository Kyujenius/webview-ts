/**
 * Koa-style onion middleware pipeline.
 *
 * Each middleware wraps the next, forming concentric layers:
 *   trace → circuitBreaker → encrypt → [core send/receive] → encrypt → circuitBreaker → trace
 *
 * A single MiddlewareContext flows through the entire lifecycle,
 * so metadata set in the request phase is available in the response phase.
 */

import type { Middleware, MiddlewareContext } from '@ts-bridge/shared';

export class MiddlewarePipeline {
  private middlewares: Middleware[] = [];

  /** Add a named middleware */
  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /** Remove middleware by name */
  remove(name: string): boolean {
    const index = this.middlewares.findIndex((m) => m.name === name);
    if (index !== -1) {
      this.middlewares.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Execute the full middleware pipeline around a core function.
   *
   * @param ctx    - The shared context for this call's entire lifecycle
   * @param core   - The innermost function (send message, wait for response, set ctx.response)
   */
  async execute(ctx: MiddlewareContext, core: () => Promise<void>): Promise<void> {
    const fns = this.middlewares.map((m) => m.fn);

    let index = -1;

    const dispatch = (i: number): Promise<void> => {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'));
      }
      index = i;

      if (i === fns.length) {
        return core();
      }

      return fns[i](ctx, () => dispatch(i + 1));
    };

    await dispatch(0);
  }

  /** Get all registered middleware */
  getAll(): Middleware[] {
    return [...this.middlewares];
  }

  /** Clear all middleware */
  clear(): void {
    this.middlewares = [];
  }
}
