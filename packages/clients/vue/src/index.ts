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
export { action, definePlugin, event } from '@webview-ts/shared';
