export type { CreateBridgeReactOptions, TypedBridgeProviderProps } from './createBridgeReact';
export { createBridgeReact } from './createBridgeReact';

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
