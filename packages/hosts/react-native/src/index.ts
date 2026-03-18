/**
 * @webview-ts/native
 * React Native host implementation for webview-ts
 */

// Bridge
export { BridgeHost } from './bridge/BridgeHost';
export type { BridgeHostConfig, ActionHandler, RequestContext } from './bridge/BridgeHost';

export { createMessageHandler } from './bridge/MessageHandler';
export type { MessageHandlerConfig, WebViewMessageEvent } from './bridge/MessageHandler';

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

// Convenience factory
import { BridgeHost, type BridgeHostConfig } from './bridge/BridgeHost';
import { MessageHandler, type MessageHandlerConfig } from './bridge/MessageHandler';
import { PermissionManager, type PermissionManagerConfig } from './permissions/PermissionManager';

export interface CreateBridgeHostOptions {
  bridge?: BridgeHostConfig;
  messageHandler?: MessageHandlerConfig;
  permissionManager?: PermissionManagerConfig;
}

export interface BridgeHostBundle {
  bridgeHost: BridgeHost;
  messageHandler: MessageHandler;
  permissionManager: PermissionManager;
}

export function createBridgeHost(options: CreateBridgeHostOptions = {}): BridgeHostBundle {
  const bridgeHost = new BridgeHost(options.bridge);
  const messageHandler = new MessageHandler(bridgeHost, options.messageHandler);
  const permissionManager = new PermissionManager(options.permissionManager);

  return {
    bridgeHost,
    messageHandler,
    permissionManager,
  };
}
