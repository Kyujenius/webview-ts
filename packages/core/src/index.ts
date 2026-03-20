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
import type { BridgeConfig, ActionDefinitionShape } from '@webview-ts/shared';

/**
 * Create and initialize a new bridge instance.
 * Calls connect() automatically so it's ready to use immediately.
 */
export function createBridge<
  TActions extends Record<string, ActionDefinitionShape> = Record<string, ActionDefinitionShape>,
  TEvents extends Record<string, unknown> = Record<string, unknown>,
>(config?: BridgeConfig): BridgeManager<TActions, TEvents> {
  const bridge = new BridgeManager<TActions, TEvents>(config);
  bridge.connect();
  return bridge;
}

/**
 * Default export - convenient for simple usage
 */
export default createBridge;
