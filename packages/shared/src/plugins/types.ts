import type { Middleware } from '../types/middleware';
import type { BridgeCallOptions, FallbackMap, RetryConfig } from '../types/bridge';
import type { StrictKeyOf } from '../types/utils';
import type { RoutingStrategy } from '../types/routing';

export type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

// ─── action() type marker ───

/** Options for action() marker */
export interface ActionOptions {
  /** Timeout in ms for this action. 0 or undefined = no timeout (default) */
  timeout?: number;
  /** Retry configuration for this action */
  retry?: RetryConfig;
  /**
   * Cache TTL for this action.
   * - `number`: TTL in milliseconds
   * - `true`: cache indefinitely
   */
  cache?: number | boolean;
  /** Routing strategy for this action */
  routing?: RoutingStrategy;
}

/** Branded type marker — carries Payload/Response at type level, empty at runtime */
export interface ActionMarker<TPayload = void, TResponse = void> {
  readonly __payload: TPayload;
  readonly __response: TResponse;
  /** Per-action interceptors (runtime) */
  readonly __interceptors?: Middleware[];
  /** Per-action timeout in ms (runtime) */
  readonly __timeout?: number;
  /** Per-action retry config (runtime) */
  readonly __retry?: RetryConfig;
  /** Per-action cache TTL (runtime) */
  readonly __cache?: number | boolean;
  /** Per-action routing strategy (runtime) */
  readonly __routing?: RoutingStrategy;
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
    __retry: options?.retry,
    __cache: options?.cache,
    __routing: options?.routing,
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

/** Options for event() marker */
export interface EventOptions {
  /** Routing strategy for this event */
  routing?: RoutingStrategy;
}

/** Branded type marker — carries event payload type at type level */
export interface EventMarker<TPayload = void> {
  readonly __eventPayload: TPayload;
  readonly __routing?: RoutingStrategy;
}

/** Zero-runtime type marker for defining plugin events */
export function event<TPayload = void>(options?: EventOptions): EventMarker<TPayload> {
  return { __routing: options?.routing } as EventMarker<TPayload>;
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
  [K in StrictKeyOf<TMarkers> as `${TName}.${K}`]: {
    payload: ExtractPayload<TMarkers[K]>;
    response: ExtractResponse<TMarkers[K]>;
  };
};

/** Runtime action name map: { takePhoto: 'camera.takePhoto' } */
export type ActionNameMap<TName extends string, TMarkers extends ActionMarkerMap> = {
  readonly [K in StrictKeyOf<TMarkers>]: `${TName}.${K}`;
};

/** Runtime event name map: { updated: 'location.updated' } */
export type EventNameMap<TName extends string, TEvents extends EventMarkerMap> = {
  readonly [K in StrictKeyOf<TEvents>]: `${TName}.${K}`;
};

/** Auto-generated client methods from markers — returns action state objects */
export type AutoMethods<TMarkers extends ActionMarkerMap> = {
  [K in StrictKeyOf<TMarkers>]: {
    execute: (
      payload: ExtractPayload<TMarkers[K]>,
      options?: BridgeCallOptions
    ) => Promise<ExtractResponse<TMarkers[K]>>;
    data: ExtractResponse<TMarkers[K]> | null;
    error: Error | null;
    isLoading: boolean;
    status: ActionStatus;
    reset: () => void;
  };
};

/** Typed event subscriber from usePlugin().on */
export type TypedEventSubscriber<TEvents extends EventMarkerMap> = <K extends StrictKeyOf<TEvents>>(
  event: K,
  handler: (payload: ExtractEventPayload<TEvents[K]>) => void
) => () => void;

/** Host handlers with short names — ctx includes emit when plugin has events */
export type ShortHostHandlers<
  TMarkers extends ActionMarkerMap,
  TEvents extends EventMarkerMap = EmptyEventMap,
> = {
  [K in StrictKeyOf<TMarkers>]: (
    payload: ExtractPayload<TMarkers[K]>,
    context: HostHandlerContext<TEvents>
  ) => Promise<ExtractResponse<TMarkers[K]>> | ExtractResponse<TMarkers[K]>;
};

/** Context passed to host handlers — includes emit when plugin defines events */
export type HostHandlerContext<TEvents extends EventMarkerMap = EmptyEventMap> = RequestContext &
  ([StrictKeyOf<TEvents>] extends [never]
    ? // eslint-disable-next-line @typescript-eslint/ban-types
      {}
    : {
        emit: <K extends StrictKeyOf<TEvents>>(
          event: K,
          payload: ExtractEventPayload<TEvents[K]>
        ) => void;
      });

// ─── Utility aliases ───

/** Empty event map — default for plugins that declare no events */
export type EmptyEventMap = Record<string, never>;

// ─── Plugin instance ───

/** Per-action interceptor map: { 'camera.takePhoto': Middleware[] } */
export type InterceptorMap = Record<string, Middleware[]>;

/** Per-action timeout map: { 'camera.takePhoto': 5000 } */
export type TimeoutMap = Record<string, number>;

/** Per-action retry map: { 'camera.takePhoto': RetryConfig } */
export type RetryMap = Record<string, RetryConfig>;

/** Per-action cache map: { 'camera.takePhoto': 5000 | true } */
export type CacheMap = Record<string, number | boolean>;

/** Options for definePlugin */
export interface DefinePluginOptions<TEvents extends EventMarkerMap = EmptyEventMap> {
  events?: TEvents;
}

/** Plugin instance returned by definePlugin */
export interface PluginInstance<
  TName extends string = string,
  TMarkers extends ActionMarkerMap = ActionMarkerMap,
  TEvents extends EventMarkerMap = EmptyEventMap,
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
  readonly retries: RetryMap;
  readonly caches: CacheMap;
  readonly fallback?: FallbackMap;
  readonly host: (handlers: ShortHostHandlers<TMarkers, TEvents>) => HostPluginResult;
  /** Attach fallback handlers to this plugin (chainable) */
  withFallback(handlers: ShortFallbackHandlers<TMarkers>): PluginInstance<TName, TMarkers, TEvents>;
}

/** Single plugin — shorthand for `PluginInstance<any, any, any>` */
export type AnyPlugin = PluginInstance<any, any, any>;

/** Plugin array — shorthand for the repeated constraint */
export type AnyPluginList = AnyPlugin[];

/** Fallback handlers using short names — typed from action markers */
export type ShortFallbackHandlers<TMarkers extends ActionMarkerMap> = {
  [K in StrictKeyOf<TMarkers>]: (
    payload: ExtractPayload<TMarkers[K]>
  ) => Promise<ExtractResponse<TMarkers[K]>> | ExtractResponse<TMarkers[K]>;
};

// ─── Shared types ───

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
export type MergePluginActions<T extends AnyPluginList> = T extends [
  infer First extends AnyPlugin,
  ...infer Rest extends AnyPluginList,
]
  ? First['_types'] & MergePluginActions<Rest>
  : Record<string, never>;

/** Extract plugin from a plugins array by reference */
export type PluginFromArray<
  TPlugins extends AnyPluginList,
  TPlugin extends AnyPlugin,
> = TPlugin extends TPlugins[number] ? TPlugin : never;

/** Expand short-name event markers to fully-qualified event map.
 *  e.g. Name='location', { updated: EventMarker<Position> }
 *     → { 'location.updated': Position } */
export type ExpandEvents<TName extends string, TEvents extends EventMarkerMap> = {
  [K in StrictKeyOf<TEvents> as `${TName}.${K}`]: ExtractEventPayload<TEvents[K]>;
};

/** Merge event maps from multiple plugins into an intersection */
export type MergePluginEvents<T extends AnyPluginList> = T extends [
  infer First extends AnyPlugin,
  ...infer Rest extends AnyPluginList,
]
  ? ExpandEvents<First['name'], First['_eventTypes']> & MergePluginEvents<Rest>
  : Record<string, never>;
