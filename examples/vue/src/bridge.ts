import { createBridgeVue } from '@webview-ts/vue';
import { createLogger } from '@webview-ts/core';
import {
  camera,
  location,
  biometric,
  haptics,
  phone,
  calendar,
  device,
  share,
} from '@example/plugins';

export const bridge = createBridgeVue({
  plugins: [camera, location, biometric, haptics, phone, calendar, device, share],
  middleware: [createLogger({ includePayload: true, includeResponse: true })],
});

export const { useBridge, useAction, usePlugin, useEvent } = bridge;
