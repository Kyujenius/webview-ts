import { definePlugin } from '../define';

export type BiometricActions = {
  'biometric.checkAvailability': {
    payload: {};
    response: { available: boolean; biometricTypes: string[] };
  };
  'biometric.authenticate': {
    payload: { promptMessage?: string };
    response: { success: boolean; error?: string };
  };
};

export const biometric = definePlugin<BiometricActions>({
  name: 'biometric',
  methods: (call) => ({
    checkAvailability: () => call('biometric.checkAvailability', {}),
    authenticate: (promptMessage?: string) =>
      call('biometric.authenticate', { promptMessage }),
  }),
});
