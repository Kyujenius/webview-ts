/**
 * @webview-ts/react-native
 * React Native host implementation for webview-ts
 */

// Adapter
export type { WebViewMessageEvent } from './adapters/ReactNativeHostAdapter';
export { ReactNativeHostAdapter } from './adapters/ReactNativeHostAdapter';

// Hooks
export type {
  CreateBridgeHostOptions,
  CreateBridgeHostResult,
  TypedHandlers,
  UseBridgeHostReturn,
} from './hooks/useBridgeHost';
export { createBridgeHost, useBridgeHost } from './hooks/useBridgeHost';

// ─── Plugin contract API (re-exported from @webview-ts/shared) ───
// App code only needs this package: define plugins and use hooks from one import.
export type {
  CallEndEvent,
  CallErrorEvent,
  CallStartEvent,
  RequestInterceptor,
  ResponseInterceptor,
} from '@webview-ts/shared';
export { action, definePlugin, event } from '@webview-ts/shared';
