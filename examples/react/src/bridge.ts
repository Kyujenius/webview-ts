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
import type { Middleware } from '@webview-ts/shared';

const logger: Middleware = {
  name: 'logger',
  fn: async (ctx, next) => {
    console.log(`[→] ${ctx.request.action}`, ctx.request.payload);
    await next();
    if (ctx.response?.success) {
      console.log(`[←] ${ctx.request.action} (${Date.now() - ctx.startTime}ms)`, ctx.response.data);
    } else if (ctx.response) {
      console.error(`[✗] ${ctx.request.action}`, ctx.response.error);
    }
  },
};

export const { BridgeProvider, useBridge, useAction, useEvent, usePlugin } = createBridgeReact({
  plugins: [camera, location, biometric, haptics, phone, calendar, device, share],
  middleware: [logger],
});
