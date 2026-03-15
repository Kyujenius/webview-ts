import { createBridgeReact } from '@webview-ts/react';
import {
  camera,
  storage,
  location,
  biometric,
  haptics,
  cameraFallback,
  storageFallback,
  locationFallback,
  biometricFallback,
  hapticsFallback,
} from '@example/plugins';

export const { BridgeProvider, useBridge, useAction, useEvent, usePlugin } = createBridgeReact({
  plugins: [camera, storage, location, biometric, haptics],
  config: {
    timeout: 5000,
    fallback: {
      ...cameraFallback,
      ...storageFallback,
      ...locationFallback,
      ...biometricFallback,
      ...hapticsFallback,
    },
  },
});
