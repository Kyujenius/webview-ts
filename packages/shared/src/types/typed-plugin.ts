import type { z } from 'zod';

export interface ActionSchema {
  payload: z.ZodType;
  response: z.ZodType;
}

export interface PluginDefinition<
  TActions extends Record<string, ActionSchema> = Record<string, ActionSchema>,
> {
  name: string;
  version: string;
  description?: string;
  permissions?: string[];
  actions: TActions;
}

export type InferPluginActions<T extends PluginDefinition> = {
  [K in keyof T['actions'] & string]: {
    payload: z.infer<T['actions'][K]['payload']>;
    response: z.infer<T['actions'][K]['response']>;
  };
};

export type MergePluginActions<T extends PluginDefinition[]> = T extends [
  infer First extends PluginDefinition,
  ...infer Rest extends PluginDefinition[],
]
  ? InferPluginActions<First> & MergePluginActions<Rest>
  : {};

export function defineBridgePlugin<TActions extends Record<string, ActionSchema>>(
  definition: PluginDefinition<TActions>,
): PluginDefinition<TActions> {
  return definition;
}
