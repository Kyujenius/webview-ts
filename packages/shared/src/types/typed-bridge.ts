import type { ActionDefinitionShape, ActionNames, InferPayload, InferResponse } from './action-map';
import type { EventNames } from './event-map';
import type { BridgeConfig, BridgeCallOptions } from './bridge';

export interface TypedBridge<
  TActions extends Record<string, ActionDefinitionShape>,
  TEvents extends Record<string, unknown> = Record<string, unknown>,
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
