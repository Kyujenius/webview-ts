/**
 * Internal adapter factory — auto-detects platform and returns the appropriate adapter.
 * Not exported publicly; used only by BridgeClient constructor.
 */

import type { ClientAdapter } from '@webview-ts/shared';

import { DisconnectedAdapter } from './DisconnectedAdapter';
import { isReactNativeWebView, ReactNativeWebViewAdapter } from './ReactNativeWebViewAdapter';

export function createClientAdapter(): ClientAdapter {
  if (isReactNativeWebView()) {
    return new ReactNativeWebViewAdapter();
  }
  return new DisconnectedAdapter();
}
