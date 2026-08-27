/**
 * CLIENT HANDLE surface — what usePlugin() returns to components.
 * Open this file when changing the per-action handle shape or the typed
 * event subscriber.
 */
import type { ActionState } from '../state/ActionStateManager';
import type { BridgeCallOptions } from '../types/bridge';
import type { StrictKeyOf } from '../types/utils';
import type { AnyPlugin } from './instance';
import type { EventMarkerMap, ExtractEventPayload } from './markers';

/** Typed event subscriber from usePlugin().on */
export type TypedEventSubscriber<TEvents extends EventMarkerMap> = <K extends StrictKeyOf<TEvents>>(
  event: K,
  handler: (payload: ExtractEventPayload<TEvents[K]>) => void
) => () => void;

/** execute() signature for a plugin action — payload argument drops out when void */
export type PluginActionExecute<TPayloadIn, TResponse> = [TPayloadIn] extends [void]
  ? (payload?: undefined, options?: BridgeCallOptions) => Promise<TResponse>
  : (payload: TPayloadIn, options?: BridgeCallOptions) => Promise<TResponse>;

/** Full { payload; response } definition of a plugin action, looked up by short name */
type PluginActionDef<
  TPlugin extends AnyPlugin,
  K extends StrictKeyOf<TPlugin['actions']>,
> = TPlugin['actions'][K] extends keyof TPlugin['_types']
  ? TPlugin['_types'][TPlugin['actions'][K]] extends { payload: infer P; response: infer R }
    ? { payload: P; response: R }
    : never
  : never;

/** Sender payload type of a plugin action, looked up by short name */
export type PluginActionPayloadIn<
  TPlugin extends AnyPlugin,
  K extends StrictKeyOf<TPlugin['actions']>,
> = PluginActionDef<TPlugin, K>['payload'];

/** Receiver response type of a plugin action, looked up by short name */
export type PluginActionResponse<
  TPlugin extends AnyPlugin,
  K extends StrictKeyOf<TPlugin['actions']>,
> = PluginActionDef<TPlugin, K>['response'];

/** Live state + controls for one action, as returned by usePlugin.
 *  State fields come from ActionState — the single definition of the shape. */
export interface PluginActionHandle<TPayloadIn, TResponse> extends ActionState<TResponse> {
  execute: PluginActionExecute<TPayloadIn, TResponse>;
  reset: () => void;
}

/** Full result of usePlugin: one typed handle per action + typed event subscriber */
export type UsePluginResult<TPlugin extends AnyPlugin> = {
  [K in StrictKeyOf<TPlugin['actions']>]: PluginActionHandle<
    PluginActionPayloadIn<TPlugin, K>,
    PluginActionResponse<TPlugin, K>
  >;
} & { on: TypedEventSubscriber<TPlugin['_eventTypes']> };
