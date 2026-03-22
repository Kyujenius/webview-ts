import type { ActionStatus } from '../plugins/types';
import type { BridgeCallOptions } from '../types/bridge';
import { BridgeCallError } from '../types/errors';

export interface ActionState<TData> {
  status: ActionStatus;
  data: TData | null;
  error: BridgeCallError | null;
  isLoading: boolean;
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

  constructor(
    private readonly callFn: (payload: TPayload, options?: BridgeCallOptions) => Promise<TData>
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
    this.setState({ status: 'loading', data: this.state.data, error: null, isLoading: true });
    try {
      const result = await this.callFn(payload, options);
      this.setState({ status: 'success', data: result, error: null, isLoading: false });
      return result;
    } catch (err) {
      const error =
        err instanceof BridgeCallError
          ? err
          : new BridgeCallError(err instanceof Error ? err.message : String(err), 'UNKNOWN_ERROR');
      // preserve previous data on error (matches current useActionCore behavior)
      this.setState({ status: 'error', data: this.state.data, error, isLoading: false });
      throw error;
    }
  };

  reset = (): void => {
    this.setState({ status: 'idle', data: null, error: null, isLoading: false });
  };

  private setState(next: ActionState<TData>): void {
    this.state = next;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
