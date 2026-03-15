/**
 * Base class for web-side plugins
 */

import { BridgeManager } from '@ts-bridge/core';
import type { WebPlugin, PluginConfig } from '../types/plugin';
import type { BridgeMessage, BridgeResponse } from '@ts-bridge/shared';

export abstract class BaseWebPlugin<
  TActions extends string = string,
> implements WebPlugin<TActions> {
  protected bridge: BridgeManager;
  public readonly config: PluginConfig;

  constructor(bridge: BridgeManager, config: PluginConfig) {
    this.bridge = bridge;
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

  isAvailable(): boolean {
    return this.bridge.isAvailable();
  }

  createMessage<TPayload = unknown>(action: TActions, payload: TPayload): BridgeMessage {
    return {
      id: this.generateMessageId(),
      action: `${this.config.name}.${action}`,
      payload,
      timestamp: Date.now(),
    };
  }

  parseResponse<TResult = unknown>(response: BridgeResponse): TResult {
    if (!response.success) {
      throw new Error(response.error?.message ?? 'Unknown error occurred');
    }
    return response.data as TResult;
  }

  /**
   * Send message to native side
   */
  protected async sendToNative<TPayload = unknown, TResult = unknown>(
    action: TActions | string,
    payload: TPayload
  ): Promise<TResult> {
    const fullAction = `${this.config.name}.${action}`;
    return await this.bridge.call<TPayload, TResult>(fullAction, payload);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${this.config.name}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
