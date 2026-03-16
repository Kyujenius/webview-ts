import type { ActionDefinitionShape } from '../types/action-map';
import type { Middleware } from '../types/middleware';

// ─── action() type marker ───

/** Options for action() marker */
export interface ActionOptions {
  /** Timeout in ms for this action. 0 or undefined = no timeout (default) */
  timeout?: number;
}

/** Branded type marker — carries Payload/Response at type level, empty at runtime */
export interface ActionMarker<TPayload = void, TResponse = void> {
  readonly __payload: TPayload;
  readonly __response: TResponse;
  /** Per-action interceptors (runtime) */
  readonly __interceptors?: Middleware[];
  /** Per-action timeout in ms (runtime) */
  readonly __timeout?: number;
  /** Chain an interceptor to this action */
  use(interceptor: Middleware): ActionMarker<TPayload, TResponse>;
}

/** Zero-runtime type marker for defining plugin actions */
export function action<TPayload = void, TResponse = void>(
  options?: ActionOptions
): ActionMarker<TPayload, TResponse> {
  const interceptors: Middleware[] = [];
  const marker: any = {
    __interceptors: interceptors,
    __timeout: options?.timeout,
    use(interceptor: Middleware) {
      interceptors.push(interceptor);
      return marker;
    },
  };
  return marker as ActionMarker<TPayload, TResponse>;
}

/** A record of short-name action markers */
export type ActionMarkerMap = Record<string, ActionMarker<any, any>>;

// ─── Type extraction utilities ───

export type ExtractPayload<T> = T extends ActionMarker<infer P, any> ? P : never;
export type ExtractResponse<T> = T extends ActionMarker<any, infer R> ? R : never;

/** Expand short-name markers to fully-qualified ActionDefinitionShape map.
 *  e.g. Name='camera', { takePhoto: ActionMarker<P,R> } → { 'camera.takePhoto': { payload: P; response: R } } */
export type ExpandActions<TName extends string, TMarkers extends ActionMarkerMap> = {
  [K in keyof TMarkers & string as `${TName}.${K}`]: {
    payload: ExtractPayload<TMarkers[K]>;
    response: ExtractResponse<TMarkers[K]>;
  };
};

/** Runtime action name map: { takePhoto: 'camera.takePhoto' } */
export type ActionNameMap<TName extends string, TMarkers extends ActionMarkerMap> = {
  readonly [K in keyof TMarkers & string]: `${TName}.${K}`;
};

/** Auto-generated client methods from markers */
export type AutoMethods<TMarkers extends ActionMarkerMap> = {
  [K in keyof TMarkers & string]: ExtractPayload<TMarkers[K]> extends void
    ? () => Promise<ExtractResponse<TMarkers[K]>>
    : undefined extends ExtractPayload<TMarkers[K]>
      ? (payload?: ExtractPayload<TMarkers[K]>) => Promise<ExtractResponse<TMarkers[K]>>
      : (payload: ExtractPayload<TMarkers[K]>) => Promise<ExtractResponse<TMarkers[K]>>;
};

/** Host handlers with short names */
export type ShortHostHandlers<TMarkers extends ActionMarkerMap> = {
  [K in keyof TMarkers & string]: (
    payload: ExtractPayload<TMarkers[K]>,
    context: RequestContext
  ) => Promise<ExtractResponse<TMarkers[K]>> | ExtractResponse<TMarkers[K]>;
};

// ─── Plugin instance ───

/** Per-action interceptor map: { 'camera.takePhoto': Middleware[] } */
export type InterceptorMap = Record<string, Middleware[]>;

/** Per-action timeout map: { 'camera.takePhoto': 5000 } */
export type TimeoutMap = Record<string, number>;

/** Plugin instance returned by definePlugin */
export interface PluginInstance<
  TName extends string = string,
  TMarkers extends ActionMarkerMap = ActionMarkerMap,
> {
  readonly name: TName;
  readonly _actionMap: ExpandActions<TName, TMarkers>;
  readonly actions: ActionNameMap<TName, TMarkers>;
  readonly interceptors: InterceptorMap;
  readonly timeouts: TimeoutMap;
  readonly methods: (call: PluginCall<ExpandActions<TName, TMarkers>>) => AutoMethods<TMarkers>;
  readonly host: (handlers: ShortHostHandlers<TMarkers>) => HostPluginResult;
}

// ─── Shared types ───

/** Typed call function — constrained to a plugin's actions */
export type PluginCall<TActions extends Record<string, ActionDefinitionShape>> = <
  K extends keyof TActions & string,
>(
  action: K,
  payload: TActions[K]['payload']
) => Promise<TActions[K]['response']>;

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
export type MergePluginActions<T extends PluginInstance<any, any>[]> = T extends [
  infer First extends PluginInstance<any, any>,
  ...infer Rest extends PluginInstance<any, any>[],
]
  ? First['_actionMap'] & MergePluginActions<Rest>
  : Record<string, never>;

/** Extract plugin from a plugins array by reference */
export type PluginFromArray<
  TPlugins extends PluginInstance<any, any>[],
  TPlugin extends PluginInstance<any, any>,
> = TPlugin extends TPlugins[number] ? TPlugin : never;
