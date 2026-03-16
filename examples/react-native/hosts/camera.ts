import * as ImagePicker from 'expo-image-picker';
import { camera } from '@example/plugins';

export const cameraHost = camera.host({
  takePhoto: async (payload) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: payload.quality ?? 0.8,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.length) {
      throw new Error('Camera cancelled');
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
    };
  },

  pickImage: async (payload) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Media library permission denied');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: payload.multiple ?? false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) {
      throw new Error('Image pick cancelled');
    }

    return {
      images: result.assets.map((a) => ({ uri: a.uri })),
    };
  },

  recordVideo: async (payload) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission denied');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: payload.maxDuration ?? 30,
    });

    if (result.canceled || !result.assets?.length) {
      throw new Error('Video recording cancelled');
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      duration: asset.duration ?? 0,
    };
  },
});
