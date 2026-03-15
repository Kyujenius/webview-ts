import { describe, it, expect } from 'vitest';
import { storage } from './storage';

describe('storage preset', () => {
  it('should have correct name', () => {
    expect(storage.name).toBe('storage');
  });

  it('.host() should require all handlers', () => {
    const result = storage.host({
      'storage.getItem': async (p) => ({ value: 'val' }),
      'storage.setItem': async () => ({}),
      'storage.removeItem': async () => ({}),
      'storage.clear': async () => ({}),
      'storage.getAllKeys': async () => ({ keys: [] }),
    });
    expect(result.pluginName).toBe('storage');
    expect(Object.keys(result.handlers).length).toBe(5);
  });

  it('methods should pass correct payloads', async () => {
    const calls: any[] = [];
    const mockCall = async (action: string, payload: any) => {
      calls.push({ action, payload });
      return { value: null };
    };
    const methods = storage.methods(mockCall as any);
    await methods.getItem('myKey');
    expect(calls[0]).toEqual({ action: 'storage.getItem', payload: { key: 'myKey' } });
  });
});
