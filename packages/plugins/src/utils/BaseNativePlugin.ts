/**
 * Base class for native-side plugins
 */

import type { NativePlugin, PluginConfig, PermissionResult } from '../types/plugin';
import type { BridgeMessage, BridgeResponse } from '@ts-bridge/shared';

export abstract class BaseNativePlugin<
  TActions extends string = string,
> implements NativePlugin<TActions> {
  public readonly config: PluginConfig;

  constructor(config: PluginConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Override in subclass if needed
  }

  abstract handleAction<TPayload = unknown, TResult = unknown>(
    action: TActions,
    payload: TPayload
  ): Promise<TResult>;

  async dispose(): Promise<void> {
    // Override in subclass if needed
  }

  abstract checkPermission(permission: string): Promise<boolean>;

  abstract requestPermission(permission: string): Promise<boolean>;

  async handleMessage(message: BridgeMessage): Promise<BridgeResponse> {
    try {
      // Extract action name (remove plugin prefix)
      const actionParts = message.action.split('.');
      const action = actionParts[actionParts.length - 1] as TActions;

      // Handle action
      const result = await this.handleAction(action, message.payload);

      // Return success response
      return {
        id: message.id,
        success: true,
        data: result,
        timestamp: Date.now(),
      };
    } catch (error) {
      // Return error response
      return {
        id: message.id,
        success: false,
        error: {
          code: 'PLUGIN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Create success response
   */
  protected createSuccessResponse<TData = unknown>(messageId: string, data: TData): BridgeResponse {
    return {
      id: messageId,
      success: true,
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * Create error response
   */
  protected createErrorResponse(messageId: string, code: string, message: string): BridgeResponse {
    return {
      id: messageId,
      success: false,
      error: {
        code,
        message,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Convert permission status to boolean
   */
  protected isPermissionGranted(result: PermissionResult): boolean {
    return result.status === 'granted';
  }
}
