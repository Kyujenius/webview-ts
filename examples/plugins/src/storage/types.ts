export interface SetItemPayload {
  key: string;
  value: string;
}

export interface GetItemPayload {
  key: string;
}

export interface GetItemResponse {
  value: string | null;
}

export interface RemoveItemPayload {
  key: string;
}

export interface GetAllKeysResponse {
  keys: string[];
}
