import type { FallbackMap, RetryConfig } from '../types/bridge';
import type { RequestInterceptor, ResponseInterceptor } from '../types/interceptor';
import type { StandardSchemaV1 } from '../types/standard-schema';
import type { StrictKeyOf } from '../types/utils';

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
}

/** Schema-mode options — payload/response are Standard Schema objects */
export interface SchemaFields {
  payload?: StandardSchemaV1;
  response?: StandardSchemaV1;
}

/** Branded type marker — carries Payload/Response at type level.
 *  TPayload/TResponse: what the RECEIVER sees (schema output).
 *  TPayloadIn/TResponseIn: what the SENDER provides (schema input).
 *  Without schemas the pairs are identical. */
export interface ActionMarker<
  TPayload = void,
  TResponse = void,
  TPayloadIn = TPayload,
  TResponseIn = TResponse,
> {
  readonly __payload: TPayload;
  readonly __response: TResponse;
  readonly __payloadIn: TPayloadIn;
  readonly __responseIn: TResponseIn;
  readonly __payloadSchema?: StandardSchemaV1;
  readonly __responseSchema?: StandardSchemaV1;
  readonly __requestInterceptors?: RequestInterceptor[];
  readonly __responseInterceptors?: ResponseInterceptor[];
  /** Per-action timeout in ms (runtime) */
  readonly __timeout?: number;
  /** Per-action retry config (runtime) */
  readonly __retry?: RetryConfig;
  /** Per-action cache TTL (runtime) */
  readonly __cache?: number | boolean;
  readonly interceptors: {
    readonly request: {
      use(
        interceptor: RequestInterceptor
      ): ActionMarker<TPayload, TResponse, TPayloadIn, TResponseIn>;
    };
    readonly response: {
      use(
        interceptor: ResponseInterceptor
      ): ActionMarker<TPayload, TResponse, TPayloadIn, TResponseIn>;
    };
  };
}

// Schema mode: both payload and response
export function action<PS extends StandardSchemaV1, RS extends StandardSchemaV1>(
  options: ActionOptions & { payload: PS; response: RS }
): ActionMarker<
  StandardSchemaV1.InferOutput<PS>,
  StandardSchemaV1.InferOutput<RS>,
  StandardSchemaV1.InferInput<PS>,
  StandardSchemaV1.InferInput<RS>
>;
// Schema mode: payload only
export function action<PS extends StandardSchemaV1>(
  options: ActionOptions & { payload: PS; response?: undefined }
): ActionMarker<StandardSchemaV1.InferOutput<PS>, void, StandardSchemaV1.InferInput<PS>, void>;
// Schema mode: response only
export function action<RS extends StandardSchemaV1>(
  options: ActionOptions & { payload?: undefined; response: RS }
): ActionMarker<void, StandardSchemaV1.InferOutput<RS>, void, StandardSchemaV1.InferInput<RS>>;
// Phantom mode: unchanged public signature
export function action<TPayload = void, TResponse = void>(
  options?: ActionOptions
): ActionMarker<TPayload, TResponse>;
// Implementation
export function action(options?: ActionOptions & SchemaFields): ActionMarker<any, any, any, any> {
  const requestInterceptors: RequestInterceptor[] = [];
  const responseInterceptors: ResponseInterceptor[] = [];
  const marker: any = {
    __requestInterceptors: requestInterceptors,
    __responseInterceptors: responseInterceptors,
    __timeout: options?.timeout,
    __retry: options?.retry,
    __cache: options?.cache,
    __payloadSchema: options?.payload,
    __responseSchema: options?.response,
    interceptors: {
      request: {
        use(interceptor: RequestInterceptor) {
          requestInterceptors.push(interceptor);
          return marker;
        },
      },
      response: {
        use(interceptor: ResponseInterceptor) {
          responseInterceptors.push(interceptor);
          return marker;
        },
      },
    },
  };
  return marker as ActionMarker<any, any, any, any>;
}

/** A record of short-name action markers */
export type ActionMarkerMap = Record<string, ActionMarker<any, any, any, any>>;

// ─── event() type marker ───

/** Branded type marker — carries event payload type at type level */
export interface EventMarker<TPayload = void, TPayloadIn = TPayload> {
  readonly __eventPayload: TPayload;
  readonly __eventPayloadIn: TPayloadIn;
  readonly __schema?: StandardSchemaV1;
}

export function event<S extends StandardSchemaV1>(
  schema: S
): EventMarker<StandardSchemaV1.InferOutput<S>, StandardSchemaV1.InferInput<S>>;
export function event<TPayload = void>(): EventMarker<TPayload>;
export function event(schema?: StandardSchemaV1): EventMarker<any, any> {
  return { __schema: schema } as EventMarker<any, any>;
}

/** A record of short-name event markers */
export type EventMarkerMap = Record<string, EventMarker<any, any>>;

/** Extract event payload type from an EventMarker */
export type ExtractEventPayload<T> = T extends EventMarker<infer P, any> ? P : never;

// ─── Type extraction utilities ───

export type ExtractPayload<T> = T extends ActionMarker<infer P, any, any, any> ? P : never;
export type ExtractResponse<T> = T extends ActionMarker<any, infer R, any, any> ? R : never;
export type ExtractPayloadIn<T> = T extends ActionMarker<any, any, infer PIn, any> ? PIn : never;
export type ExtractResponseIn<T> = T extends ActionMarker<any, any, any, infer RIn> ? RIn : never;
export type ExtractEventPayloadIn<T> = T extends EventMarker<any, infer PIn> ? PIn : never;

/** Expand short-name markers to fully-qualified ActionDefinitionShape map.
 *  e.g. Name='camera', { takePhoto: ActionMarker<P,R> } → { 'camera.takePhoto': { payload: PIn; response: R } } */
export type ExpandActions<TName extends string, TMarkers extends ActionMarkerMap> = {
  [K in StrictKeyOf<TMarkers> as `${TName}.${K}`]: {
    payload: ExtractPayloadIn<TMarkers[K]>;
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
  ) => Promise<ExtractResponseIn<TMarkers[K]>> | ExtractResponseIn<TMarkers[K]>;
};

/** Context passed to host handlers — includes emit when plugin defines events */
export type HostHandlerContext<TEvents extends EventMarkerMap = EmptyEventMap> = RequestContext &
  ([StrictKeyOf<TEvents>] extends [never]
    ? // eslint-disable-next-line @typescript-eslint/ban-types
      {}
    : {
        emit: <K extends StrictKeyOf<TEvents>>(
          event: K,
          payload: ExtractEventPayloadIn<TEvents[K]>
        ) => void;
      });

// ─── Utility aliases ───

/** Empty event map — default for plugins that declare no events */
export type EmptyEventMap = Record<string, never>;

// ─── Plugin instance ───

export type RequestInterceptorMap = Record<string, RequestInterceptor[]>;
export type ResponseInterceptorMap = Record<string, ResponseInterceptor[]>;

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
  readonly requestInterceptors: RequestInterceptorMap;
  readonly responseInterceptors: ResponseInterceptorMap;
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
    payload: ExtractPayloadIn<TMarkers[K]>
  ) => Promise<ExtractResponseIn<TMarkers[K]>> | ExtractResponseIn<TMarkers[K]>;
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
