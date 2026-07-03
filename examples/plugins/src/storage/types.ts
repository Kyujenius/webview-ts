import type { z } from 'zod';

import type {
  getAllKeysResponse,
  getItemPayload,
  getItemResponse,
  removeItemPayload,
  setItemPayload,
} from './plugin';

export type SetItemPayload = z.input<typeof setItemPayload>;
export type GetItemPayload = z.input<typeof getItemPayload>;
export type GetItemResponse = z.output<typeof getItemResponse>;
export type RemoveItemPayload = z.input<typeof removeItemPayload>;
export type GetAllKeysResponse = z.output<typeof getAllKeysResponse>;
