import { StorageActions } from '.';

const memoryStore = new Map<string, string>();

export const storageFallback = {
  [StorageActions.setItem]: async (payload: any) => {
    memoryStore.set(payload.key, payload.value);
    return {};
  },
  [StorageActions.getItem]: async (payload: any) => ({
    value: memoryStore.get(payload.key) ?? null,
  }),
  [StorageActions.removeItem]: async (payload: any) => {
    memoryStore.delete(payload.key);
    return {};
  },
  [StorageActions.clear]: async () => {
    memoryStore.clear();
    return {};
  },
  [StorageActions.getAllKeys]: async () => ({
    keys: Array.from(memoryStore.keys()),
  }),
};
