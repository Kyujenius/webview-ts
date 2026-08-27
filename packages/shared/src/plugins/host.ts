/**
 * HOST contract surface — what a host binding consumes.
 * Open this file when changing handler contexts, `plugin.host()`'s output,
 * or host-side sendEvent typing.
 */
import type { SendEventOptions } from '../types/routing';
import type { StrictKeyOf } from '../types/utils';
import type {
  ActionMarkerMap,
  EmptyEventMap,
  EventMarkerMap,
  ExtractEventPayloadIn,
  ExtractPayload,
  ExtractResponseIn,
} from './markers';

/** Request context passed to host handlers */
export interface RequestContext {
  messageId: string;
  timestamp: number;
}

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

/** What .host() returns — consumed by host bindings.
 *  TEventMap is a type-only phantom carrying the plugin's expanded event map
 *  (e.g. { 'location.updated': Position }) so host-side sendEvent stays typed. */
export interface HostPluginResult<TEventMap = Record<string, unknown>> {
  handlers: Record<string, (payload: any, context: any) => Promise<any>>;
  pluginName: string;
  eventNames: string[];
  /** Type-only. Never set at runtime. */
  readonly _eventTypes?: TEventMap;
}

/**
 * Host-side sendEvent typed against the merged plugin event map: contract
 * events get payload checking and autocomplete, arbitrary event names stay
 * allowed (the host may emit custom events the client subscribes to via its
 * own map). Platform-agnostic — every host package types its sendEvent with this.
 */
export type HostSendEvent<TEvents> = <
  K extends StrictKeyOf<TEvents> | (string & Record<never, never>),
>(
  event: K,
  payload: K extends StrictKeyOf<TEvents> ? TEvents[K] : unknown,
  options?: SendEventOptions
) => void;

/** Merge event maps from a list of host plugin results into an intersection.
 *  Terminal is `unknown` (identity for `&`) so contract keys stay exact. */
export type MergeHostPluginEvents<T extends readonly HostPluginResult<any>[]> = T extends readonly [
  infer First,
  ...infer Rest extends readonly HostPluginResult<any>[],
]
  ? (First extends HostPluginResult<infer E> ? E : unknown) & MergeHostPluginEvents<Rest>
  : unknown;
