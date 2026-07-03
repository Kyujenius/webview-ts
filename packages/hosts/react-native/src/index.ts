/**
 * @webview-ts/react-native
 * React Native host implementation for webview-ts
 */

// Adapter
export type { WebViewMessageEvent } from './adapters/ReactNativeHostAdapter';
export { ReactNativeHostAdapter } from './adapters/ReactNativeHostAdapter';

// Hooks
export type {
  SimpleBridgeHostOptions,
  SimpleBridgeHostResult,
  TypedHandlers,
  UseBridgeHostReturn,
} from './hooks/useBridgeHost';
export { createSimpleBridgeHost, useBridgeHost } from './hooks/useBridgeHost';
