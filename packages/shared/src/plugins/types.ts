import type { ActionDefinitionShape } from '../types/action-map';

/** Typed call function — constrained to THIS plugin's actions only */
export type PluginCall<TActions extends Record<string, ActionDefinitionShape>> = <
  K extends keyof TActions & string,
>(
  action: K,
  payload: TActions[K]['payload']
) => Promise<TActions[K]['response']>;

/** Plugin definition input */
export interface PluginInput<
  TName extends string,
  TActions extends Record<string, ActionDefinitionShape>,
  TMethods,
> {
  name: TName;
  methods?: (call: PluginCall<TActions>) => TMethods;
}

/** Return type of definePlugin — the plugin instance */
export interface PluginInstance<
  TName extends string,
  TActions extends Record<string, ActionDefinitionShape>,
  TMethods,
> {
  readonly name: TName;
  readonly _actionMap: TActions;
  readonly methods: (call: PluginCall<TActions>) => TMethods;
  readonly host: (handlers: HostHandlers<TActions>) => HostPluginResult;
}

/** Host handlers — keyed by full action name, typed payload/response */
export type HostHandlers<TActions extends Record<string, ActionDefinitionShape>> = {
  [K in keyof TActions & string]: (
    payload: TActions[K]['payload'],
    context: RequestContext
  ) => Promise<TActions[K]['response']> | TActions[K]['response'];
};

/** Request context passed to host handlers */
export interface RequestContext {
  messageId: string;
  timestamp: number;
}

/** What .host() returns — consumed by useBridgeHost */
export interface HostPluginResult {
  handlers: Record<string, (payload: any, context: any) => Promise<any>>;
  pluginName: string;
}

/** Merge ActionMaps from multiple plugins into an intersection */
export type MergePluginActions<T extends PluginInstance<any, any, any>[]> = T extends [
  infer First extends PluginInstance<any, any, any>,
  ...infer Rest extends PluginInstance<any, any, any>[],
]
  ? First['_actionMap'] & MergePluginActions<Rest>
  : Record<string, never>;

/** Extract plugin from a plugins array by reference */
export type PluginFromArray<
  TPlugins extends PluginInstance<any, any, any>[],
  TPlugin extends PluginInstance<any, any, any>,
> = TPlugin extends TPlugins[number] ? TPlugin : never;
