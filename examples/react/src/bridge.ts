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
  cameraFallback,
  locationFallback,
  biometricFallback,
  hapticsFallback,
  phoneFallback,
  calendarFallback,
  deviceFallback,
  shareFallback,
} from '@example/plugins';

export const { BridgeProvider, useBridge, useAction, useEvent, usePlugin } = createBridgeReact({
  plugins: [camera, location, biometric, haptics, phone, calendar, device, share],
  config: {
    fallback: {
      ...cameraFallback,
      ...locationFallback,
      ...biometricFallback,
      ...hapticsFallback,
      ...phoneFallback,
      ...calendarFallback,
      ...deviceFallback,
      ...shareFallback,
    },
  },
});
