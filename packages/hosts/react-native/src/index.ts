/**
 * @ts-bridge/native
 * React Native host implementation for ts-bridge
 */

// Bridge
export { BridgeHost } from './bridge/BridgeHost';
export type { BridgeHostConfig, ActionHandler, RequestContext } from './bridge/BridgeHost';

export { MessageHandler, createMessageHandler } from './bridge/MessageHandler';
export type { MessageHandlerConfig, WebViewMessageEvent } from './bridge/MessageHandler';

// Plugins
export { PluginHost, PluginState, createPluginHost } from './plugins/PluginHost';
export type { PluginHostConfig } from './plugins/PluginHost';

// Permissions
export { PermissionManager, createPermissionManager } from './permissions/PermissionManager';
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
import { PluginHost, type PluginHostConfig } from './plugins/PluginHost';
import { PermissionManager, type PermissionManagerConfig } from './permissions/PermissionManager';

/**
 * Configuration for creating bridge host
 */
export interface CreateBridgeHostOptions {
  /**
   * BridgeHost configuration
   */
  bridge?: BridgeHostConfig;

  /**
   * MessageHandler configuration
   */
  messageHandler?: MessageHandlerConfig;

  /**
   * PluginHost configuration
   */
  pluginHost?: PluginHostConfig;

  /**
   * PermissionManager configuration
   */
  permissionManager?: PermissionManagerConfig;
}

/**
 * Bridge host bundle with all components
 */
export interface BridgeHostBundle {
  /**
   * Bridge host instance
   */
  bridgeHost: BridgeHost;

  /**
   * Message handler instance
   */
  messageHandler: MessageHandler;

  /**
   * Plugin host instance
   */
  pluginHost: PluginHost;

  /**
   * Permission manager instance
   */
  permissionManager: PermissionManager;
}

/**
 * Create a complete bridge host bundle with all components
 */
export function createBridgeHost(options: CreateBridgeHostOptions = {}): BridgeHostBundle {
  // Create bridge host
  const bridgeHost = new BridgeHost(options.bridge);

  // Create message handler
  const messageHandler = new MessageHandler(bridgeHost, options.messageHandler);

  // Create plugin host
  const pluginHost = new PluginHost(bridgeHost, options.pluginHost);

  // Create permission manager
  const permissionManager = new PermissionManager(options.permissionManager);

  return {
    bridgeHost,
    messageHandler,
    pluginHost,
    permissionManager,
  };
}
