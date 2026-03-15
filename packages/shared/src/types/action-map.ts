export interface ActionDefinitionShape {
  payload: unknown;
  response: unknown;
}

export type InferPayload<
  TMap extends Record<string, ActionDefinitionShape>,
  TAction extends keyof TMap,
> = TMap[TAction]['payload'];

export type InferResponse<
  TMap extends Record<string, ActionDefinitionShape>,
  TAction extends keyof TMap,
> = TMap[TAction]['response'];

export type ActionNames<TMap extends Record<string, ActionDefinitionShape>> = keyof TMap & string;

export type ActionMap<T extends Record<string, ActionDefinitionShape>> = T;
