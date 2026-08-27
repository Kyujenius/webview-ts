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
export { action, definePlugin, ERROR_CODE, event } from '@webview-ts/shared';

// ─── Host role (a React web page can be the host — e.g. an iframe shell) ───
export type { UseBridgeHostOptions, UseBridgeHostReturn } from './useBridgeHost';
export { useBridgeHost } from './useBridgeHost';
export type { DefinedHandlers, TypedHandlers } from '@webview-ts/core';
export { defineHandlers, IframeClientAdapter, IframeHostAdapter } from '@webview-ts/core';
