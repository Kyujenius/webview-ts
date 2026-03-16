export interface SharePayload {
  title?: string;
  message?: string;
  url?: string;
}

export interface ShareResponse {
  shared: boolean;
}
