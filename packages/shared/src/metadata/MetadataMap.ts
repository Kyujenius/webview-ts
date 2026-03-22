/**
 * Phantom-typed metadata key.
 * The generic parameter T is erased at runtime — it only exists for the compiler.
 */
export interface MetadataKey<T> {
  readonly key: string;
  /** @internal phantom field — never assigned at runtime */
  readonly __type?: T;
}

/** Create a type-safe metadata key. */
export function createMetadataKey<T>(key: string): MetadataKey<T> {
  return { key } as MetadataKey<T>;
}

/**
 * Type-safe metadata store for middleware communication.
 *
 * Typed keys (MetadataKey<T>) give compile-time safety.
 * Plain string keys are also supported for backward compatibility and dynamic
 * prefix-based keys (e.g. `__mwLog:myMiddleware`).
 */
export class MetadataMap {
  private readonly map = new Map<string, unknown>();

  /** Set a typed value. */
  set<T>(key: MetadataKey<T>, value: T): void;
  /** Set an untyped value (for dynamic/prefix keys). */
  set(key: string, value: unknown): void;
  set(key: MetadataKey<any> | string, value: unknown): void {
    this.map.set(typeof key === 'string' ? key : key.key, value);
  }

  /** Get a typed value. */
  get<T>(key: MetadataKey<T>): T | undefined;
  /** Get an untyped value (for dynamic/prefix keys). */
  get(key: string): unknown;
  get(key: MetadataKey<any> | string): unknown {
    return this.map.get(typeof key === 'string' ? key : key.key);
  }

  has(key: MetadataKey<any> | string): boolean {
    return this.map.has(typeof key === 'string' ? key : key.key);
  }

  delete(key: MetadataKey<any> | string): boolean {
    return this.map.delete(typeof key === 'string' ? key : key.key);
  }

  get size(): number {
    return this.map.size;
  }

  keys(): IterableIterator<string> {
    return this.map.keys();
  }

  /** Iterate over all entries (untyped — for serialization/debugging). */
  entries(): IterableIterator<[string, unknown]> {
    return this.map.entries();
  }

  forEach(fn: (value: unknown, key: string) => void): void {
    this.map.forEach(fn);
  }
}
