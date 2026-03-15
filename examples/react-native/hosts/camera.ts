import { camera } from '@example/plugins';

export const cameraHost = camera.host({
  takePhoto: async (payload) => {
    console.log('[Host] camera.takePhoto', payload);
    // TODO: replace with react-native-camera or expo-camera
    return { uri: 'https://picsum.photos/1920/1080', width: 1920, height: 1080 };
  },
  pickImage: async (payload) => {
    console.log('[Host] camera.pickImage', payload);
    return { images: [{ uri: 'https://picsum.photos/800/600' }] };
  },
  recordVideo: async (payload) => {
    console.log('[Host] camera.recordVideo', payload);
    return { uri: 'file://mock-video.mp4', duration: payload.maxDuration ?? 30 };
  },
});
