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
import type { Middleware } from '@webview-ts/shared';
import { createBridgeVue } from '@webview-ts/vue';

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

export const bridge = createBridgeVue({
  plugins: [camera, location, biometric, haptics, phone, calendar, device, share],
  middleware: [logger],
});

export const { useBridge, useAction, usePlugin, useEvent } = bridge;
