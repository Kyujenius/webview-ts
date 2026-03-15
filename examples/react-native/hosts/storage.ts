import { storage } from '@example/plugins';

// TODO: replace with AsyncStorage or expo-secure-store
const memoryStore = new Map<string, string>();

export const storageHost = storage.host({
  getItem: async (payload) => {
    return { value: memoryStore.get(payload.key) ?? null };
  },
  setItem: async (payload) => {
    memoryStore.set(payload.key, payload.value);
    return {};
  },
  removeItem: async (payload) => {
    memoryStore.delete(payload.key);
    return {};
  },
  clear: async () => {
    memoryStore.clear();
    return {};
  },
  getAllKeys: async () => ({
    keys: Array.from(memoryStore.keys()),
  }),
});
