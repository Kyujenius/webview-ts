import type { InjectionKey } from 'vue';
import type { BridgeClient } from '@webview-ts/core';
import type { ConnectionMode } from '@webview-ts/shared';

export interface BridgeContext {
  bridge: BridgeClient<any>;
  isAvailable: boolean;
  connectionMode: ConnectionMode;
}

export const BRIDGE_KEY: InjectionKey<BridgeContext> = Symbol('webview-ts-bridge');
