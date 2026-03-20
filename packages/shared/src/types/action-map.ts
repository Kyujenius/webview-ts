export interface ActionDefinitionShape {
  payload: unknown;
  response: unknown;
}

export type ActionMapBase = Record<string, ActionDefinitionShape>;

export type InferPayload<
  TMap extends ActionMapBase,
  TAction extends keyof TMap,
> = TMap[TAction]['payload'];

export type InferResponse<
  TMap extends ActionMapBase,
  TAction extends keyof TMap,
> = TMap[TAction]['response'];

export type ActionNames<TMap extends ActionMapBase> = keyof TMap & string;

export type ActionMap<T extends ActionMapBase> = T;
