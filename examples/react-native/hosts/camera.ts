import { camera } from '@example/plugins';
import * as ImagePicker from 'expo-image-picker';

async function ensurePermission(
  request: () => Promise<{ status: ImagePicker.PermissionStatus }>,
  errorMessage: string
) {
  const { status } = await request();
  if (status !== 'granted') {
    throw new Error(errorMessage);
  }
}

function ensureAssets(result: ImagePicker.ImagePickerResult, errorMessage: string) {
  if (result.canceled || !result.assets?.length) {
    throw new Error(errorMessage);
  }
  return result.assets;
}

export const cameraHost = camera.host({
  takePhoto: async (payload) => {
    await ensurePermission(ImagePicker.requestCameraPermissionsAsync, 'Camera permission denied');

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: payload.quality ?? 0.8,
      allowsEditing: true,
    });

    const assets = ensureAssets(result, 'Camera cancelled');
    const asset = assets[0];
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
    };
  },

  pickImage: async (payload) => {
    await ensurePermission(
      ImagePicker.requestMediaLibraryPermissionsAsync,
      'Media library permission denied'
    );

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: payload.multiple ?? false,
      quality: 0.8,
    });

    const assets = ensureAssets(result, 'Image pick cancelled');
    return {
      images: assets.map((a) => ({ uri: a.uri })),
    };
  },

  recordVideo: async (payload) => {
    await ensurePermission(ImagePicker.requestCameraPermissionsAsync, 'Camera permission denied');

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: payload.maxDuration ?? 30,
    });

    const assets = ensureAssets(result, 'Video recording cancelled');
    const asset = assets[0];
    return {
      uri: asset.uri,
      duration: asset.duration ?? 0,
    };
  },
});
