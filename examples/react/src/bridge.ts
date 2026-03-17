import { createBridgeReact } from '@webview-ts/react';
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

export const { BridgeProvider, useBridge, useAction, useEvent, usePlugin } = createBridgeReact({
  plugins: [camera, location, biometric, haptics, phone, calendar, device, share],
});
