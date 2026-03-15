import { definePlugin } from '@ts-bridge/shared';

export type BiometricActions = {
  'biometric.checkAvailability': {
    payload: undefined;
    response: { available: boolean; biometricTypes: string[] };
  };
  'biometric.authenticate': {
    payload: { reason?: string };
    response: { success: boolean };
  };
};

export const biometric = definePlugin<BiometricActions>()({
  name: 'biometric',
  methods: (call) => ({
    checkAvailability: () => call('biometric.checkAvailability', undefined),
    authenticate: (reason?: string) => call('biometric.authenticate', { reason }),
  }),
});
