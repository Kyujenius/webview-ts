import type { ActionDefinitionShape, ActionNames, InferPayload, InferResponse } from './action-map';
import type { BridgeConfig, BridgeCallOptions } from './bridge';

export interface TypedBridge<TActions extends Record<string, ActionDefinitionShape>> {
  call<TAction extends ActionNames<TActions>>(
    action: TAction,
    payload: InferPayload<TActions, TAction>,
    options?: BridgeCallOptions,
  ): Promise<InferResponse<TActions, TAction>>;

  on<TPayload = unknown>(
    event: string,
    handler: (payload: TPayload) => void,
  ): () => void;

  off(event: string, handler?: (payload: unknown) => void): void;

  isAvailable(): boolean;

  getConfig(): BridgeConfig;

  destroy(): void;
}
