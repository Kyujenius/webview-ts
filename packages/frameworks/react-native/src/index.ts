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
  DefinedHandlers,
  TypedHandlers,
  UseBridgeHostReturn,
} from './hooks/useBridgeHost';
export { createBridgeHost, defineHandlers, useBridgeHost } from './hooks/useBridgeHost';

// ─── Plugin contract API (re-exported from @webview-ts/shared) ───
// App code only needs this package: define plugins and use hooks from one import.
export type {
  CallEndEvent,
  CallErrorEvent,
  CallStartEvent,
  RequestInterceptor,
  ResponseInterceptor,
} from '@webview-ts/shared';
export { action, definePlugin, ERROR_CODE, event } from '@webview-ts/shared';
