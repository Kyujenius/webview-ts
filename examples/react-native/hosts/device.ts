import type { AppStateStatus } from '@example/plugins';
import { device } from '@example/plugins';
import * as Device from 'expo-device';
import type { NativeEventSubscription } from 'react-native';
import { AppState, Platform } from 'react-native';

let appStateSubscription: NativeEventSubscription | null = null;

export const deviceHost = device.host({
  getInfo: async (_payload, ctx) => {
    // Subscribe to AppState on first call (lazy init)
    if (!appStateSubscription) {
      appStateSubscription = AppState.addEventListener('change', (state) => {
        ctx.emit('appStateChanged', state as AppStateStatus);
      });
    }

    return {
      name: Device.deviceName,
      brand: Device.brand,
      model: Device.modelName,
      osName: Platform.OS,
      osVersion: Platform.Version.toString(),
    };
  },
});
