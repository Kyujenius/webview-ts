import { biometric } from '@example/plugins';
import * as LocalAuthentication from 'expo-local-authentication';

export const biometricHost = biometric.host({
  checkAvailability: async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();

    const typeMap: Record<number, string> = {
      [LocalAuthentication.AuthenticationType.FINGERPRINT]: 'fingerprint',
      [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]: 'face',
      [LocalAuthentication.AuthenticationType.IRIS]: 'iris',
    };

    return {
      available: hasHardware && isEnrolled,
      biometricTypes: supported.map((t) => typeMap[t] ?? 'unknown'),
    };
  },

  authenticate: async (payload) => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: payload.reason ?? 'Authenticate',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return { success: result.success };
  },
});
