import { Linking } from 'react-native';
import { phone } from '@example/plugins';

export const phoneHost = phone.host({
  call: async (payload) => {
    const url = `tel:${payload.number}`;
    await Linking.openURL(url);
    return { success: true };
  },
});
