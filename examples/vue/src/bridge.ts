import { createBridgeVue } from '@webview-ts/vue';
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
});

export const { useBridge, useAction, usePlugin, useEvent } = bridge;
