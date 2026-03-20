import type { ActionMapBase, ActionNames, InferPayload, InferResponse } from './action-map';
import type { EventMapBase, EventNames } from './event-map';
import type { BridgeConfig, BridgeCallOptions } from './bridge';

export interface TypedBridge<
  TActions extends ActionMapBase,
  TEvents extends EventMapBase = EventMapBase,
> {
  call<TAction extends ActionNames<TActions>>(
    action: TAction,
    payload: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions
  ): Promise<InferResponse<TActions, TAction>>;

  on<K extends EventNames<TEvents>>(event: K, handler: (payload: TEvents[K]) => void): () => void;

  off<K extends EventNames<TEvents>>(event: K, handler?: (payload: TEvents[K]) => void): void;

  isAvailable(): boolean;

  getConfig(): BridgeConfig;

  destroy(): void;
}
