import { BiometricActions } from './plugin';

export const biometricFallback = {
  [BiometricActions.checkAvailability]: async () => ({
    available: true,
    biometricTypes: ['fingerprint', 'face'],
  }),
  [BiometricActions.authenticate]: async () => ({
    success: true,
  }),
};
