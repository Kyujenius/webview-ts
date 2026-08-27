/**
 * PLUGIN INSTANCE — what definePlugin() produces and how plugin lists merge.
 * Open this file when changing what a plugin carries (runtime maps, fallback,
 * name expansion) or how multiple plugins combine into one typed map.
 */
import type { FallbackMap, RetryConfig } from '../types/bridge';
import type { RequestInterceptorMap, ResponseInterceptorMap } from '../types/interceptor';
import type { StandardSchemaV1 } from '../types/standard-schema';
import type { StrictKeyOf } from '../types/utils';
import type { HostPluginResult, ShortHostHandlers } from './host';
import type {
  ActionMarkerMap,
  EmptyEventMap,
  EventMarkerMap,
  ExtractEventPayload,
  ExtractPayloadIn,
  ExtractResponse,
  ExtractResponseIn,
} from './markers';

export type { RequestInterceptorMap, ResponseInterceptorMap } from '../types/interceptor';

// ─── Name expansion (short → namespaced) ───

/** Expand short-name markers to fully-qualified ActionDefinitionShape map.
 *  e.g. Name='camera', { takePhoto: ActionMarker<P,R> } → { 'camera.takePhoto': { payload: PIn; response: R } } */
export type ExpandActions<TName extends string, TMarkers extends ActionMarkerMap> = {
  [K in StrictKeyOf<TMarkers> as `${TName}.${K}`]: {
    payload: ExtractPayloadIn<TMarkers[K]>;
    response: ExtractResponse<TMarkers[K]>;
  };
};

/** Expand short-name event markers to fully-qualified event map.
 *  e.g. Name='location', { updated: EventMarker<Position> }
 *     → { 'location.updated': Position } */
export type ExpandEvents<TName extends string, TEvents extends EventMarkerMap> = {
  [K in StrictKeyOf<TEvents> as `${TName}.${K}`]: ExtractEventPayload<TEvents[K]>;
};

/** Runtime action name map: { takePhoto: 'camera.takePhoto' } */
export type ActionNameMap<TName extends string, TMarkers extends ActionMarkerMap> = {
  readonly [K in StrictKeyOf<TMarkers>]: `${TName}.${K}`;
};

/** Runtime event name map: { updated: 'location.updated' } */
export type EventNameMap<TName extends string, TEvents extends EventMarkerMap> = {
  readonly [K in StrictKeyOf<TEvents>]: `${TName}.${K}`;
};

// ─── Per-action runtime maps (extracted from markers by definePlugin) ───

/** Per-action timeout map: { 'camera.takePhoto': 5000 } */
export type TimeoutMap = Record<string, number>;

/** Per-action retry map: { 'camera.takePhoto': RetryConfig } */
export type RetryMap = Record<string, RetryConfig>;

/** Per-action cache map: { 'camera.takePhoto': 5000 | true } */
export type CacheMap = Record<string, number | boolean>;

export interface ActionSchemaEntry {
  payload?: StandardSchemaV1;
  response?: StandardSchemaV1;
}
/** Per-action schemas: { 'camera.takePhoto': { payload, response } } */
export type ActionSchemaMap = Record<string, ActionSchemaEntry>;
/** Per-event schemas: { 'location.updated': schema } */
export type EventSchemaMap = Record<string, StandardSchemaV1>;

// ─── The instance itself ───

/** Options for definePlugin */
export interface DefinePluginOptions<TEvents extends EventMarkerMap = EmptyEventMap> {
  events?: TEvents;
}

/** Fallback handlers using short names — typed from action markers */
export type ShortFallbackHandlers<TMarkers extends ActionMarkerMap> = {
  [K in StrictKeyOf<TMarkers>]: (
    payload: ExtractPayloadIn<TMarkers[K]>
  ) => Promise<ExtractResponseIn<TMarkers[K]>> | ExtractResponseIn<TMarkers[K]>;
};

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
  readonly actionSchemas: ActionSchemaMap;
  readonly eventSchemas: EventSchemaMap;
  readonly fallback?: FallbackMap;
  readonly host: (
    handlers: ShortHostHandlers<TMarkers, TEvents>
  ) => HostPluginResult<ExpandEvents<TName, TEvents>>;
  /** Attach fallback handlers to this plugin (chainable) */
  withFallback(handlers: ShortFallbackHandlers<TMarkers>): PluginInstance<TName, TMarkers, TEvents>;
}

/** Single plugin — shorthand for `PluginInstance<any, any, any>` */
export type AnyPlugin = PluginInstance<any, any, any>;

/** Plugin array — shorthand for the repeated constraint */
export type AnyPluginList = AnyPlugin[];

// ─── Client-side merging (plugin list → one typed map) ───

/** Merge ActionMaps from multiple plugins into an intersection.
 *  Terminal is `unknown` — `Record<string, never>` would widen `keyof` of the
 *  intersection to `string` and silently accept undeclared action names. */
export type MergePluginActions<T extends AnyPluginList> = T extends [
  infer First extends AnyPlugin,
  ...infer Rest extends AnyPluginList,
]
  ? First['_types'] & MergePluginActions<Rest>
  : unknown;

/** Merge event maps from multiple plugins into an intersection.
 *  Terminal is `unknown` for the same keyof-widening reason as MergePluginActions. */
export type MergePluginEvents<T extends AnyPluginList> = T extends [
  infer First extends AnyPlugin,
  ...infer Rest extends AnyPluginList,
]
  ? ExpandEvents<First['name'], First['_eventTypes']> & MergePluginEvents<Rest>
  : unknown;
