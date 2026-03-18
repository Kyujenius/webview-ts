import type { BridgeCallOptions } from '@webview-ts/shared';

export type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ActionState<TData> {
  status: ActionStatus;
  data: TData | null;
  error: Error | null;
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

  /** 현재 상태 스냅샷 반환 (참조 안정적 — 변경 시에만 새 객체로 교체) */
  getSnapshot = (): ActionState<TData> => {
    return this.state;
  };

  /** Pull model: React useSyncExternalStore 호환 */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Push model helper: Vue/Svelte/Solid 어댑터용 */
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
      const error = err instanceof Error ? err : new Error(String(err));
      // 에러 시 이전 data 유지 (현재 useActionCore 동작과 일치)
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
