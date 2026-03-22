/**
 * @webview-ts/core
 *
 * Core bridge engine for web-side WebView-Native communication.
 * Provides the main bridge API, middleware pipeline, and platform adapters.
 */

export * from './client';
export * from './host';
export * from './utils';

import type { ActionMapBase, BridgeConfig, EventMapBase } from '@webview-ts/shared';

import { BridgeClient } from './client/BridgeClient';

/**
 * Create and initialize a new bridge instance.
 * Calls connect() automatically so it's ready to use immediately.
 */
export function createClient<
  TActions extends ActionMapBase = ActionMapBase,
  TEvents extends EventMapBase = EventMapBase,
>(config?: BridgeConfig): BridgeClient<TActions, TEvents> {
  const bridge = new BridgeClient<TActions, TEvents>(config);
  bridge.connect();
  return bridge;
}

/**
 * Default export - convenient for simple usage
 */
export default createClient;
