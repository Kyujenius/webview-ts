import { storage } from '@example/plugins';

// In-memory storage mock — swap for AsyncStorage in production
const store = new Map<string, string>();

export const storageHost = storage.host({
  setItem: async (payload) => {
    store.set(payload.key, payload.value);
    return {};
  },
  getItem: async (payload) => ({
    value: store.get(payload.key) ?? null,
  }),
  removeItem: async (payload) => {
    store.delete(payload.key);
    return {};
  },
  clear: async () => {
    store.clear();
    return {};
  },
  getAllKeys: async () => ({
    keys: Array.from(store.keys()),
  }),
});
