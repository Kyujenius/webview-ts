/**
 * @webview-ts/react-native
 * React Native host implementation for webview-ts
 */

// Adapter
export type { WebViewMessageEvent } from './adapters/ReactNativeHostAdapter';
export { ReactNativeHostAdapter } from './adapters/ReactNativeHostAdapter';

// Permissions
export type {
  PermissionHandler,
  PermissionManagerConfig,
  PermissionResult,
} from './permissions/PermissionManager';
export { PermissionManager } from './permissions/PermissionManager';

// Hooks
export type {
  SimpleBridgeHostOptions,
  SimpleBridgeHostResult,
  TypedHandlers,
  UseBridgeHostReturn,
} from './hooks/useBridgeHost';
export { createSimpleBridgeHost, useBridgeHost } from './hooks/useBridgeHost';

// Convenience factory
import { BridgeHost, type BridgeHostConfig } from '@webview-ts/core';

import { ReactNativeHostAdapter } from './adapters/ReactNativeHostAdapter';
import { PermissionManager, type PermissionManagerConfig } from './permissions/PermissionManager';

export interface CreateBridgeHostOptions {
  bridge?: BridgeHostConfig;
  permissionManager?: PermissionManagerConfig;
}

export interface BridgeHostBundle {
  bridgeHost: BridgeHost;
  adapter: ReactNativeHostAdapter;
  permissionManager: PermissionManager;
}

export function createBridgeHost(options: CreateBridgeHostOptions = {}): BridgeHostBundle {
  const bridgeHost = new BridgeHost(options.bridge);
  const adapter = new ReactNativeHostAdapter();
  bridgeHost.attach(adapter);
  const permissionManager = new PermissionManager(options.permissionManager);

  return {
    bridgeHost,
    adapter,
    permissionManager,
  };
}
