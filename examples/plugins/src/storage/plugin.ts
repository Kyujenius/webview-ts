import { definePlugin, action } from '@webview-ts/shared';
import type {
  SetItemPayload,
  GetItemPayload,
  GetItemResponse,
  RemoveItemPayload,
  GetAllKeysResponse,
} from './types';

const memoryStore = new Map<string, string>();

export const storage = definePlugin('storage', {
  setItem: action<SetItemPayload, Record<string, never>>(),
  getItem: action<GetItemPayload, GetItemResponse>(),
  removeItem: action<RemoveItemPayload, Record<string, never>>(),
  clear: action<void, Record<string, never>>(),
  getAllKeys: action<void, GetAllKeysResponse>(),
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
