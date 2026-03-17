import type { ActionDefinitionShape } from '../types/action-map';
import type { Middleware } from '../types/middleware';
import type { FallbackMap } from '../types/bridge';

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

// ─── event() type marker ───

/** Branded type marker — carries event payload type at type level */
export interface EventMarker<TPayload = void> {
  readonly __eventPayload: TPayload;
}

/** Zero-runtime type marker for defining plugin events */
export function event<TPayload = void>(): EventMarker<TPayload> {
  return {} as EventMarker<TPayload>;
}

/** A record of short-name event markers */
export type EventMarkerMap = Record<string, EventMarker<any>>;

/** Extract event payload type from an EventMarker */
export type ExtractEventPayload<T> = T extends EventMarker<infer P> ? P : never;

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

/** Runtime event name map: { updated: 'location.updated' } */
export type EventNameMap<TName extends string, TEvents extends EventMarkerMap> = {
  readonly [K in keyof TEvents & string]: `${TName}.${K}`;
};

/** Auto-generated client methods from markers */
export type AutoMethods<TMarkers extends ActionMarkerMap> = {
  [K in keyof TMarkers & string]: ExtractPayload<TMarkers[K]> extends void
    ? () => Promise<ExtractResponse<TMarkers[K]>>
    : undefined extends ExtractPayload<TMarkers[K]>
      ? (payload?: ExtractPayload<TMarkers[K]>) => Promise<ExtractResponse<TMarkers[K]>>
      : (payload: ExtractPayload<TMarkers[K]>) => Promise<ExtractResponse<TMarkers[K]>>;
};

/** Typed event subscriber from usePlugin().on */
export type TypedEventSubscriber<TEvents extends EventMarkerMap> = <
  K extends keyof TEvents & string,
>(
  event: K,
  handler: (payload: ExtractEventPayload<TEvents[K]>) => void
) => () => void;

/** Host handlers with short names — ctx includes emit when plugin has events */
export type ShortHostHandlers<
  TMarkers extends ActionMarkerMap,
  TEvents extends EventMarkerMap = Record<string, never>,
> = {
  [K in keyof TMarkers & string]: (
    payload: ExtractPayload<TMarkers[K]>,
    context: HostHandlerContext<TEvents>
  ) => Promise<ExtractResponse<TMarkers[K]>> | ExtractResponse<TMarkers[K]>;
};

/** Context passed to host handlers — includes emit when plugin defines events */
export type HostHandlerContext<TEvents extends EventMarkerMap = Record<string, never>> =
  RequestContext &
    ([keyof TEvents & string] extends [never]
      ? // eslint-disable-next-line @typescript-eslint/ban-types
        {}
      : {
          emit: <K extends keyof TEvents & string>(
            event: K,
            payload: ExtractEventPayload<TEvents[K]>
          ) => void;
        });

// ─── Plugin instance ───

/** Per-action interceptor map: { 'camera.takePhoto': Middleware[] } */
export type InterceptorMap = Record<string, Middleware[]>;

/** Per-action timeout map: { 'camera.takePhoto': 5000 } */
export type TimeoutMap = Record<string, number>;

/** Options for definePlugin */
export interface DefinePluginOptions<TEvents extends EventMarkerMap = Record<string, never>> {
  events?: TEvents;
}

/** Plugin instance returned by definePlugin */
export interface PluginInstance<
  TName extends string = string,
  TMarkers extends ActionMarkerMap = ActionMarkerMap,
  TEvents extends EventMarkerMap = Record<string, never>,
> {
  readonly name: TName;
  /** Type-only property. Empty at runtime. Used for TypeScript inference. */
  readonly _types: ExpandActions<TName, TMarkers>;
  /** Type-only property for event type inference */
  readonly _eventTypes: TEvents;
  readonly actions: ActionNameMap<TName, TMarkers>;
  readonly events: EventNameMap<TName, TEvents>;
  readonly interceptors: InterceptorMap;
  readonly timeouts: TimeoutMap;
  readonly fallback?: FallbackMap;
  readonly methods: (call: PluginCall<ExpandActions<TName, TMarkers>>) => AutoMethods<TMarkers>;
  readonly host: (handlers: ShortHostHandlers<TMarkers, TEvents>) => HostPluginResult;
  /** Attach fallback handlers to this plugin (chainable) */
  withFallback(handlers: ShortFallbackHandlers<TMarkers>): PluginInstance<TName, TMarkers, TEvents>;
}

/** Fallback handlers using short names — typed from action markers */
export type ShortFallbackHandlers<TMarkers extends ActionMarkerMap> = {
  [K in keyof TMarkers & string]: (
    payload: ExtractPayload<TMarkers[K]>
  ) => Promise<ExtractResponse<TMarkers[K]>> | ExtractResponse<TMarkers[K]>;
};

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
  eventNames: string[];
}

/** Merge ActionMaps from multiple plugins into an intersection */
export type MergePluginActions<T extends PluginInstance<any, any, any>[]> = T extends [
  infer First extends PluginInstance<any, any, any>,
  ...infer Rest extends PluginInstance<any, any, any>[],
]
  ? First['_types'] & MergePluginActions<Rest>
  : Record<string, never>;

/** Extract plugin from a plugins array by reference */
export type PluginFromArray<
  TPlugins extends PluginInstance<any, any, any>[],
  TPlugin extends PluginInstance<any, any, any>,
> = TPlugin extends TPlugins[number] ? TPlugin : never;
