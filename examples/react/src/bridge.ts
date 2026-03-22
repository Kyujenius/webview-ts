import { createBridgeReact } from '@webview-ts/react';
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

export const { BridgeProvider, useBridge, useAction, useEvent, usePlugin } = createBridgeReact({
  plugins: [camera, location, biometric, haptics, phone, calendar, device, share],
  middleware: [createLogger({ includePayload: true, includeResponse: true })],
});
