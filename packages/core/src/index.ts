/**
 * @webview-ts/core
 *
 * Core bridge engine for web-side WebView-Native communication.
 * Provides the main bridge API, middleware pipeline, and platform adapters.
 */

export * from './bridge';
export * from './adapters';
export * from './middleware';
export * from './utils';

import { BridgeManager } from './bridge/BridgeManager';
import type { BridgeConfig, ActionMapBase, EventMapBase } from '@webview-ts/shared';

/**
 * Create and initialize a new bridge instance.
 * Calls connect() automatically so it's ready to use immediately.
 */
export function createBridge<
  TActions extends ActionMapBase = ActionMapBase,
  TEvents extends EventMapBase = EventMapBase,
>(config?: BridgeConfig): BridgeManager<TActions, TEvents> {
  const bridge = new BridgeManager<TActions, TEvents>(config);
  bridge.connect();
  return bridge;
}

/**
 * Default export - convenient for simple usage
 */
export default createBridge;
