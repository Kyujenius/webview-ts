/**
 * Platform-neutral host factory — the host half of the "platform = one
 * adapter pair" principle. The transport is INJECTED, never constructed here:
 * the React Native package passes its WebView adapter, an iframe shell passes
 * IframeHostAdapter, a future platform passes its own.
 */
import type {
  ActionMapBase,
  HostAdapter,
  HostPluginResult,
  HostSendEvent,
  MergeHostPluginEvents,
  SendEventOptions,
  StrictKeyOf,
} from '@webview-ts/shared';

import type { ActionHandler, BridgeHostConfig } from './BridgeHost';
import { BridgeHost } from './BridgeHost';

// ---- Typed handler map ----

/**
 * Maps each action in the ActionMap to a handler with the correct
 * payload/response types. Ensures all actions are implemented.
 */
export type TypedHandlers<TActions extends ActionMapBase> = {
  [K in StrictKeyOf<TActions>]: ActionHandler<TActions[K]['payload'], TActions[K]['response']>;
};

/** Handler map carrying its ActionMap as a type-only phantom, so
 *  createBridgeHost can infer TActions from the value. */
export type DefinedHandlers<TActions extends ActionMapBase> = TypedHandlers<TActions> & {
  /** Type-only. Never set at runtime. */
  readonly __actions?: TActions;
};

/**
 * Identity helper that types direct handlers on the VALUE side.
 *
 * TypeScript type arguments are all-or-nothing: `createBridgeHost<MyActions>(...)`
 * disables inference of the plugins tuple, silently untyping sendEvent. Wrapping
 * the handlers with `defineHandlers<MyActions>(...)` instead lets BOTH the
 * handler types and the plugin event map infer together.
 */
export function defineHandlers<TActions extends ActionMapBase>(
  handlers: TypedHandlers<TActions>
): DefinedHandlers<TActions> {
  return handlers;
}

// ---- Neutral factory ----

export interface CreateBridgeHostOptions<
  TActions extends ActionMapBase = ActionMapBase,
  TPlugins extends readonly HostPluginResult<any>[] = readonly HostPluginResult<any>[],
> {
  /** Platform transport — the host half of the adapter pair. Injected, required. */
  adapter: HostAdapter;
  /** Action handlers — typed via an explicit generic or defineHandlers() */
  handlers?: DefinedHandlers<TActions>;
  /** Plugins that provide additional handlers (and typed events) */
  plugins?: TPlugins;
  /** Optional BridgeHost configuration */
  config?: BridgeHostConfig;
}

export interface CreateBridgeHostResult<TEvents = unknown> {
  bridgeHost: BridgeHost;
  /** Send an event to the embedded web content (typed from the plugin event map) */
  sendEvent: HostSendEvent<TEvents>;
  /** Detach the adapter (runtime cleanup; handlers survive for reattach) */
  detach: () => void;
}

/**
 * Create a BridgeHost wired to the given adapter, with handlers and plugins
 * registered. Pure function — usable from any JS host context (vanilla,
 * React, Vue, React Native, …).
 */
export function createBridgeHost<
  TActions extends ActionMapBase = ActionMapBase,
  const TPlugins extends readonly HostPluginResult<any>[] = readonly HostPluginResult<any>[],
>(
  options: CreateBridgeHostOptions<TActions, TPlugins>
): CreateBridgeHostResult<MergeHostPluginEvents<TPlugins>> {
  const { adapter, handlers, plugins, config } = options;

  const bridgeHost = new BridgeHost({ ...config });
  const detach = bridgeHost.attach(adapter);

  const registeredActions = new Set<string>();

  // Register direct handlers (cast strips the type-only __actions phantom,
  // which never exists at runtime)
  if (handlers) {
    for (const [action, handler] of Object.entries(handlers as TypedHandlers<TActions>)) {
      bridgeHost.registerHandler(action, handler);
      registeredActions.add(action);
    }
  }

  // Register plugin handlers — BridgeHost injects ctx.emit for plugins with events
  if (plugins) {
    for (const plugin of plugins) {
      for (const action of Object.keys(plugin.handlers)) {
        if (registeredActions.has(action)) {
          throw new Error(`Duplicate action name '${action}' from plugin '${plugin.pluginName}'`);
        }
        registeredActions.add(action);
      }
      bridgeHost.registerPlugin(plugin);
    }
  }

  const sendEvent = ((event: string, payload: unknown, sendOptions?: SendEventOptions) => {
    bridgeHost.sendEvent(event, payload, sendOptions);
  }) as HostSendEvent<MergeHostPluginEvents<TPlugins>>;

  return { bridgeHost, sendEvent, detach };
}
