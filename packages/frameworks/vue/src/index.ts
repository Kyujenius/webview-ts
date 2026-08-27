export type { BridgeContext } from './bridgeKey';
export { BRIDGE_KEY } from './bridgeKey';
export { useAction } from './composables/useAction';
export { useBridge } from './composables/useBridge';
export { usePlugin } from './composables/usePlugin';
export type { CreateBridgeVueOptions } from './createBridgeVue';
export { createBridgeVue } from './createBridgeVue';

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

// ─── Host role (a Vue web page can be the host — e.g. an iframe shell) ───
export type { UseBridgeHostOptions, UseBridgeHostReturn } from './composables/useBridgeHost';
export { useBridgeHost } from './composables/useBridgeHost';
export type { DefinedHandlers, TypedHandlers } from '@webview-ts/core';
export { defineHandlers, IframeClientAdapter, IframeHostAdapter } from '@webview-ts/core';
