import {
  biometric,
  calendar,
  camera,
  device,
  haptics,
  location,
  phone,
  share,
} from '@example/plugins';
import { createBridgeReact } from '@webview-ts/react';
import type { RequestInterceptor } from '@webview-ts/shared';

const logger: RequestInterceptor = {
  name: 'logger',
  fn: (request) => {
    console.log(`[→] ${request.action}`, request.payload);
    return request;
  },
};

export const { BridgeProvider, useBridge, useAction, useEvent, usePlugin } = createBridgeReact({
  plugins: [camera, location, biometric, haptics, phone, calendar, device, share],
  interceptors: {
    request: [logger],
  },
});
