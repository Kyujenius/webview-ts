/**
 * @webview-ts/react-native
 * React Native host implementation for webview-ts
 */

// Re-export BridgeHost from core for convenience
export {
  BridgeHost,
  type BridgeHostConfig,
  type ActionHandler,
  type RequestContext,
} from '@webview-ts/core';

// Adapter
export { ReactNativeHostAdapter } from './adapters/ReactNativeHostAdapter';
export type { WebViewMessageEvent } from './adapters/ReactNativeHostAdapter';

// Permissions
export { createPermissionManager } from './permissions/PermissionManager';
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

// Components
export { useBridgeWebView } from './components/BridgeWebView';
export type { BridgeWebViewProps } from './components/BridgeWebView';

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
