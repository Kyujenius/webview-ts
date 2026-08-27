/**
 * Host-side Vue composable — a Vue web page CAN be the host (an iframe shell
 * embedding micro-frontends, for example). The transport is whatever
 * HostAdapter you inject (IframeHostAdapter from @webview-ts/core, or your own).
 */
import type { BridgeHost, BridgeHostConfig, DefinedHandlers } from '@webview-ts/core';
import { createBridgeHost } from '@webview-ts/core';
import type { ActionMapBase, ConnectionRegistry, HostAdapter } from '@webview-ts/shared';
import type { HostPluginResult, HostSendEvent, MergeHostPluginEvents } from '@webview-ts/shared';
import { generateSourceId } from '@webview-ts/shared';
import { onScopeDispose } from 'vue';

export interface UseBridgeHostOptions<
  TActions extends ActionMapBase = ActionMapBase,
  TPlugins extends readonly HostPluginResult<any>[] = readonly HostPluginResult<any>[],
> {
  /** Platform transport — the host half of the adapter pair. Required. */
  adapter: HostAdapter;
  /** Action handlers — typed via an explicit generic or defineHandlers() */
  handlers?: DefinedHandlers<TActions>;
  /** Plugins that provide additional handlers (and typed events) */
  plugins?: TPlugins;
  /** Optional BridgeHost configuration */
  config?: BridgeHostConfig;
  /** Shared ConnectionRegistry for multi-frame routing */
  registry?: ConnectionRegistry;
  /** Name for this host instance (used in sourceId) */
  name?: string;
}

export interface UseBridgeHostReturn<TEvents = unknown> {
  /** Send an event to the embedded web content */
  sendEvent: HostSendEvent<TEvents>;
  /** Direct access to BridgeHost (advanced usage) */
  bridgeHost: BridgeHost;
  /** Unique source ID for this host instance */
  sourceId: string;
}

/**
 * Vue composable around the neutral core factory. The host attaches
 * immediately and tears down on scope dispose.
 */
export function useBridgeHost<
  TActions extends ActionMapBase = ActionMapBase,
  const TPlugins extends readonly HostPluginResult<any>[] = readonly HostPluginResult<any>[],
>(
  options: UseBridgeHostOptions<TActions, TPlugins>
): UseBridgeHostReturn<MergeHostPluginEvents<TPlugins>> {
  const { registry, name } = options;
  const sourceId = generateSourceId(name);
  const result = createBridgeHost(options);

  if (registry) {
    registry.register(sourceId, (message) => options.adapter.send(message));
  }

  onScopeDispose(() => {
    registry?.unregister(sourceId);
    result.bridgeHost.destroy();
  });

  return {
    sendEvent: result.sendEvent,
    bridgeHost: result.bridgeHost,
    sourceId,
  };
}
