import { clipboard } from '@example/plugins';

// In-memory clipboard mock — swap for Clipboard API (expo-clipboard) in production
let clipboardText: string | null = null;

export const clipboardHost = clipboard.host({
  getText: async () => ({ text: clipboardText }),
  setText: async (payload) => {
    clipboardText = payload.text;
    return {};
  },
});
