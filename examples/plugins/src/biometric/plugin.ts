import { definePlugin, action } from '@webview-ts/shared';
import type { CheckAvailabilityResponse, AuthenticatePayload, AuthenticateResponse } from './types';

export const biometric = definePlugin('biometric', {
  checkAvailability: action<void, CheckAvailabilityResponse>(),
  authenticate: action<AuthenticatePayload, AuthenticateResponse>(),
}).withFallback({
  checkAvailability: async () => ({
    available: true,
    biometricTypes: ['fingerprint', 'face'],
  }),
  authenticate: async () => ({
    success: true,
  }),
});
