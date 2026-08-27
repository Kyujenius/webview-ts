import { phone } from '@example/plugins';
import { Linking } from 'react-native';

export const phoneHost = phone.host({
  call: async (payload) => {
    const url = `tel:${payload.number}`;
    await Linking.openURL(url);
    return { success: true };
  },
});
