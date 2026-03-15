import { CameraActions } from '.';

export const cameraFallback = {
  [CameraActions.takePhoto]: async () => ({
    uri: 'https://picsum.photos/400/300',
    width: 400,
    height: 300,
  }),
  [CameraActions.pickImage]: async (payload: any) => ({
    images: [
      { uri: 'https://picsum.photos/400/300?1' },
      ...(payload?.multiple ? [{ uri: 'https://picsum.photos/400/300?2' }] : []),
    ],
  }),
  [CameraActions.recordVideo]: async () => ({
    uri: 'https://example.com/mock-video.mp4',
    duration: 5,
  }),
};
