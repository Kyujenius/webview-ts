import { definePlugin } from '@webview-ts/shared';

export type CameraActions = {
  'camera.takePhoto': {
    payload: { quality?: number };
    response: { uri: string; width: number; height: number };
  };
  'camera.pickImage': {
    payload: { multiple?: boolean };
    response: { images: { uri: string }[] };
  };
  'camera.recordVideo': {
    payload: { maxDuration?: number };
    response: { uri: string; duration: number };
  };
};

export const camera = definePlugin<CameraActions>()({
  name: 'camera',
  methods: (call) => ({
    takePhoto: (opts?: { quality?: number }) => call('camera.takePhoto', opts ?? {}),
    pickImage: (opts?: { multiple?: boolean }) => call('camera.pickImage', opts ?? {}),
    recordVideo: (opts?: { maxDuration?: number }) => call('camera.recordVideo', opts ?? {}),
  }),
});
