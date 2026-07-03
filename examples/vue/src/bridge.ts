import {
  biometric,
  calendar,
  camera,
  clipboard,
  device,
  haptics,
  location,
  phone,
  share,
  storage,
  validationDemo,
} from '@example/plugins';
import type { RequestInterceptor } from '@webview-ts/shared';
import { createBridgeVue } from '@webview-ts/vue';

const logger: RequestInterceptor = {
  name: 'logger',
  fn: (request) => {
    console.log(`[→] ${request.action}`, request.payload);
    return request;
  },
};

export const bridge = createBridgeVue({
  plugins: [
    camera,
    location,
    biometric,
    haptics,
    phone,
    calendar,
    device,
    share,
    clipboard,
    storage,
    validationDemo,
  ],
  interceptors: {
    request: [logger],
  },
});

export const { useBridge, useAction, usePlugin, useEvent } = bridge;
