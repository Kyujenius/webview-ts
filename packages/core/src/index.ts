/**
 * @ts-bridge/core
 *
 * Core bridge engine for web-side WebView-Native communication.
 * Provides the main bridge API, middleware pipeline, and platform adapters.
 */

export * from './bridge';
export * from './adapters';
export * from './middleware';
export * from './plugins';
export * from './utils';

import { BridgeManager } from './bridge/BridgeManager';
import type { BridgeConfig } from '@ts-bridge/shared';

/**
 * Create and initialize a new bridge instance
 */
export function createBridge(config?: BridgeConfig): BridgeManager {
  return new BridgeManager(config);
}

/**
 * Default export - convenient for simple usage
 */
export default createBridge;
