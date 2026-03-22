/**
 * @webview-ts/react-native
 * React Native host implementation for webview-ts
 */

// Adapter
export { ReactNativeHostAdapter } from './adapters/ReactNativeHostAdapter';
export type { WebViewMessageEvent } from './adapters/ReactNativeHostAdapter';

// Permissions
export { PermissionManager } from './permissions/PermissionManager';
export type {
  PermissionManagerConfig,
  PermissionResult,
  PermissionHandler,
} from './permissions/PermissionManager';

// Hooks
export { createSimpleBridgeHost, useBridgeHost } from './hooks/useBridgeHost';
export type {
  SimpleBridgeHostOptions,
  SimpleBridgeHostResult,
  UseBridgeHostReturn,
  TypedHandlers,
} from './hooks/useBridgeHost';

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
