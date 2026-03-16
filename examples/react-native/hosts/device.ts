import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { device } from '@example/plugins';

export const deviceHost = device.host({
  getInfo: async () => {
    return {
      name: Device.deviceName,
      brand: Device.brand,
      model: Device.modelName,
      osName: Platform.OS,
      osVersion: Platform.Version.toString(),
    };
  },
});
