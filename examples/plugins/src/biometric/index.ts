import { definePlugin, action } from '@webview-ts/shared';
import type { CheckAvailabilityResponse, AuthenticatePayload, AuthenticateResponse } from './types';

export const biometric = definePlugin('biometric', {
  checkAvailability: action<void, CheckAvailabilityResponse>(),
  authenticate: action<AuthenticatePayload, AuthenticateResponse>(),
});

export const BiometricActions = biometric.actions;
export { biometricFallback } from './fallback';

export type { CheckAvailabilityResponse, AuthenticatePayload, AuthenticateResponse } from './types';
