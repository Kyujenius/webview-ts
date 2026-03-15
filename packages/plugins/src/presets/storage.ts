import { definePlugin } from '../define';

export type StorageActions = {
  'storage.getItem': {
    payload: { key: string };
    response: { value: string | null };
  };
  'storage.setItem': {
    payload: { key: string; value: string };
    response: {};
  };
  'storage.removeItem': {
    payload: { key: string };
    response: {};
  };
  'storage.clear': {
    payload: {};
    response: {};
  };
  'storage.getAllKeys': {
    payload: {};
    response: { keys: string[] };
  };
};

export const storage = definePlugin<StorageActions>()({
  name: 'storage',
  methods: (call) => ({
    getItem: (key: string) => call('storage.getItem', { key }),
    setItem: (key: string, value: string) => call('storage.setItem', { key, value }),
    removeItem: (key: string) => call('storage.removeItem', { key }),
    clear: () => call('storage.clear', {}),
    getAllKeys: () => call('storage.getAllKeys', {}),
  }),
});
