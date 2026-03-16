export interface SetClipboardPayload {
  text: string;
}

export interface GetClipboardResponse {
  text: string | null;
}
