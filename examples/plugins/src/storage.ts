import { definePlugin } from '@webview-ts/shared';

export type StorageActions = {
  'storage.setItem': {
    payload: { key: string; value: string };
    response: Record<string, never>;
  };
  'storage.getItem': {
    payload: { key: string };
    response: { value: string | null };
  };
  'storage.removeItem': {
    payload: { key: string };
    response: Record<string, never>;
  };
  'storage.clear': {
    payload: undefined;
    response: Record<string, never>;
  };
  'storage.getAllKeys': {
    payload: undefined;
    response: { keys: string[] };
  };
};

export const storage = definePlugin<StorageActions>()({
  name: 'storage',
  methods: (call) => ({
    setItem: (key: string, value: string) => call('storage.setItem', { key, value }),
    getItem: (key: string) => call('storage.getItem', { key }),
    removeItem: (key: string) => call('storage.removeItem', { key }),
    clear: () => call('storage.clear', undefined),
    getAllKeys: () => call('storage.getAllKeys', undefined),
  }),
});
