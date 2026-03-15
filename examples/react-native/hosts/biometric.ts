import { biometric } from '@example/plugins';

export const biometricHost = biometric.host({
  checkAvailability: async () => {
    // TODO: replace with expo-local-authentication
    return { available: true, biometricTypes: ['fingerprint'] };
  },
  authenticate: async (payload) => {
    console.log('[Host] biometric.authenticate', payload.reason);
    return { success: true };
  },
});
