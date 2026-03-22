import { action, definePlugin } from '@webview-ts/shared';

import type { AuthenticatePayload, AuthenticateResponse, CheckAvailabilityResponse } from './types';

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
