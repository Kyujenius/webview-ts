interface NamedInterceptor<T> {
  name: string;
  fn: (value: T) => T | Promise<T>;
}

/**
 * Manages a chain of interceptors that transform a value sequentially.
 * Each interceptor receives the value and returns a (possibly modified) value.
 */
export class InterceptorManager<T> {
  private interceptors: NamedInterceptor<T>[] = [];

  /**
   * Register an interceptor. Returns an unsubscribe function.
   */
  use(interceptor: NamedInterceptor<T>): () => void {
    this.interceptors.push(interceptor);
    return () => {
      const index = this.interceptors.indexOf(interceptor);
      if (index !== -1) {
        this.interceptors.splice(index, 1);
      }
    };
  }

  /**
   * Execute all interceptors sequentially, passing the value through the chain.
   * Stops and throws on the first error.
   */
  async execute(value: T): Promise<T> {
    let result = value;
    for (const interceptor of this.interceptors) {
      result = await interceptor.fn(result);
    }
    return result;
  }

  /** Remove all interceptors */
  clear(): void {
    this.interceptors = [];
  }
}
