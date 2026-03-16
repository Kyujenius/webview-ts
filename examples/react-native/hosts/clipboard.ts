import * as Clipboard from 'expo-clipboard';
import { clipboard } from '@example/plugins';

export const clipboardHost = clipboard.host({
  getText: async () => {
    const text = await Clipboard.getStringAsync();
    return { text: text || null };
  },
  setText: async (payload) => {
    await Clipboard.setStringAsync(payload.text);
    return {};
  },
});
