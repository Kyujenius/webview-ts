import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '@example/plugins';

export const storageHost = storage.host({
  getItem: async (payload) => {
    const value = await AsyncStorage.getItem(payload.key);
    return { value };
  },
  setItem: async (payload) => {
    await AsyncStorage.setItem(payload.key, payload.value);
    return {};
  },
  removeItem: async (payload) => {
    await AsyncStorage.removeItem(payload.key);
    return {};
  },
  clear: async () => {
    await AsyncStorage.clear();
    return {};
  },
  getAllKeys: async () => {
    const keys = await AsyncStorage.getAllKeys();
    return { keys: [...keys] };
  },
});
