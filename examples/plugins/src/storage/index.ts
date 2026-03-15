import { definePlugin, action } from '@webview-ts/shared';
import type {
  SetItemPayload,
  GetItemPayload,
  GetItemResponse,
  RemoveItemPayload,
  GetAllKeysResponse,
} from './types';

export const storage = definePlugin('storage', {
  setItem: action<SetItemPayload, Record<string, never>>(),
  getItem: action<GetItemPayload, GetItemResponse>(),
  removeItem: action<RemoveItemPayload, Record<string, never>>(),
  clear: action<void, Record<string, never>>(),
  getAllKeys: action<void, GetAllKeysResponse>(),
});

export const StorageActions = storage.actions;
export { storageFallback } from './fallback';

export type {
  SetItemPayload,
  GetItemPayload,
  GetItemResponse,
  RemoveItemPayload,
  GetAllKeysResponse,
} from './types';
