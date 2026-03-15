export interface TakePhotoPayload {
  quality?: number;
}

export interface TakePhotoResponse {
  uri: string;
  width: number;
  height: number;
}

export interface PickImagePayload {
  multiple?: boolean;
}

export interface PickImageResponse {
  images: { uri: string }[];
}

export interface RecordVideoPayload {
  maxDuration?: number;
}

export interface RecordVideoResponse {
  uri: string;
  duration: number;
}
