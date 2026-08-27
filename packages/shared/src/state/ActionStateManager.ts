import type { BridgeCallOptions } from '../types/bridge';

/** Lifecycle of one action's async state */
export type ActionStatus = 'idle' | 'loading' | 'success' | 'error';
import { BridgeCallError } from '../types/errors';

export interface ActionState<TData> {
  status: ActionStatus;
  data: TData | null;
  error: BridgeCallError | null;
  isLoading: boolean;
}

export interface CacheEntry<TData> {
  data: TData;
  timestamp: number;
}

/**
 * Owns the cache for one action — TTL policy and entries in one place.
 * Created by BridgeClient (one per action) and shared by every
 * ActionStateManager of that action, so components caching the same action
 * hit the cache instead of each calling native independently.
 */
export class ActionCache<TData = unknown> {
  private readonly entries = new Map<string, CacheEntry<TData>>();

  /** @param ttl - milliseconds; Infinity = cache forever */
  constructor(readonly ttl: number) {}

  /** Normalize the contract's cache option (`number` TTL | `true` forever) into a cache, or undefined when disabled. */
  static from<TData = unknown>(
    cache: number | boolean | undefined
  ): ActionCache<TData> | undefined {
    const ttl = cache === true ? Infinity : typeof cache === 'number' && cache > 0 ? cache : 0;
    return ttl > 0 ? new ActionCache<TData>(ttl) : undefined;
  }

  get(key: string): CacheEntry<TData> | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (this.ttl !== Infinity && Date.now() - entry.timestamp >= this.ttl) {
      // Evict on access — expired entries must not accumulate for the client's lifetime
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, data: TData): void {
    this.entries.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.entries.clear();
  }
}

/**
 * Framework-agnostic async state machine for a single bridge action.
 *
 * Provides two subscription models:
 * - Pull (React useSyncExternalStore): subscribe() + getSnapshot()
 * - Push (Vue/Svelte/Solid): watch()
 */
export class ActionStateManager<TData, TPayload = unknown> {
  private state: ActionState<TData> = {
    status: 'idle',
    data: null,
    error: null,
    isLoading: false,
  };

  private readonly listeners = new Set<() => void>();
  /** Monotonic token — only the LATEST execute() may write state (stale
   *  responses racing back out of order must not overwrite newer results). */
  private latestExecution = 0;

  constructor(
    private readonly callFn: (payload: TPayload, options?: BridgeCallOptions) => Promise<TData>,
    /** Shared per-action cache (owns TTL + entries). Omit to disable caching. */
    private readonly cache?: ActionCache<TData>
  ) {}

  /** Returns current state snapshot. Reference is stable — replaced only when state changes. */
  getSnapshot = (): ActionState<TData> => {
    return this.state;
  };

  /** Pull model: compatible with React useSyncExternalStore */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Push model helper: for Vue/Svelte/Solid adapters */
  watch = (listener: (state: ActionState<TData>) => void): (() => void) => {
    return this.subscribe(() => listener(this.getSnapshot()));
  };

  execute = async (payload: TPayload, options?: BridgeCallOptions): Promise<TData> => {
    const token = ++this.latestExecution;

    // Check cache
    if (this.cache) {
      const entry = this.cache.get(cacheKey(payload));
      if (entry) {
        this.setState({ status: 'success', data: entry.data, error: null, isLoading: false });
        return entry.data;
      }
    }

    this.setState({ status: 'loading', data: this.state.data, error: null, isLoading: true });
    try {
      const result = await this.callFn(payload, options);
      // Latest-wins: a stale response must not overwrite a newer one's state.
      // The caller still receives ITS result either way.
      if (token === this.latestExecution) {
        this.setState({ status: 'success', data: result, error: null, isLoading: false });
      }

      this.cache?.set(cacheKey(payload), result);

      return result;
    } catch (err) {
      const error =
        err instanceof BridgeCallError
          ? err
          : new BridgeCallError(err instanceof Error ? err.message : String(err), 'UNKNOWN_ERROR');
      if (token === this.latestExecution) {
        // preserve previous data on error (matches current useActionCore behavior)
        this.setState({ status: 'error', data: this.state.data, error, isLoading: false });
      }
      throw error;
    }
  };

  reset = (): void => {
    // Invalidate in-flight executions too — a completion arriving after
    // reset() must not resurrect the state it reset.
    this.latestExecution++;
    // Cache is shared per action — reset invalidates it for every component
    // using this action ("cache until reset").
    this.cache?.clear();
    this.setState({ status: 'idle', data: null, error: null, isLoading: false });
  };

  /** Invalidate cached entries (for all managers of this action) without resetting state. */
  invalidateCache = (): void => {
    this.cache?.clear();
  };

  private setState(next: ActionState<TData>): void {
    this.state = next;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function cacheKey(payload: unknown): string {
  try {
    return JSON.stringify(payload) ?? '__void__';
  } catch {
    return '__unstringifiable__';
  }
}
