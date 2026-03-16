import { createBridgeReact } from '@webview-ts/react';
import {
  camera,
  storage,
  location,
  biometric,
  haptics,
  clipboard,
  device,
  share,
  cameraFallback,
  storageFallback,
  locationFallback,
  biometricFallback,
  hapticsFallback,
  clipboardFallback,
  deviceFallback,
  shareFallback,
} from '@example/plugins';

export const { BridgeProvider, useBridge, useAction, useEvent, usePlugin } = createBridgeReact({
  plugins: [camera, storage, location, biometric, haptics, clipboard, device, share],
  config: {
    timeout: 5000,
    fallback: {
      ...cameraFallback,
      ...storageFallback,
      ...locationFallback,
      ...biometricFallback,
      ...hapticsFallback,
      ...clipboardFallback,
      ...deviceFallback,
      ...shareFallback,
    },
  },
});
