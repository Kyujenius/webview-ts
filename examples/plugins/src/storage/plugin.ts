import { action, definePlugin } from '@webview-ts/shared';
import { z } from 'zod';

const memoryStore = new Map<string, string>();

export const setItemPayload = z.object({ key: z.string(), value: z.string() });
export const setItemResponse = z.object({});
export const getItemPayload = z.object({ key: z.string() });
export const getItemResponse = z.object({ value: z.string().nullable() });
export const removeItemPayload = z.object({ key: z.string() });
export const removeItemResponse = z.object({});
export const getAllKeysResponse = z.object({ keys: z.array(z.string()) });

export const storage = definePlugin('storage', {
  setItem: action({ payload: setItemPayload, response: setItemResponse }),
  getItem: action({ payload: getItemPayload, response: getItemResponse }),
  removeItem: action({ payload: removeItemPayload, response: removeItemResponse }),
  clear: action<void, Record<string, never>>(),
  getAllKeys: action({ response: getAllKeysResponse }),
}).withFallback({
  setItem: async (payload) => {
    memoryStore.set(payload.key, payload.value);
    return {};
  },
  getItem: async (payload) => ({
    value: memoryStore.get(payload.key) ?? null,
  }),
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
