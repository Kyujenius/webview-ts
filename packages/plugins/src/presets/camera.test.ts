import { describe, it, expect } from 'vitest';
import { camera } from './camera';

describe('camera preset', () => {
  it('should have correct name', () => {
    expect(camera.name).toBe('camera');
  });

  it('should have methods factory', () => {
    const mockCall = async (action: string, payload: any) => {
      if (action === 'camera.takePhoto') return { uri: '/photo.jpg', width: 100, height: 100 };
      if (action === 'camera.pickImage') return { images: [{ uri: '/img.jpg' }] };
      if (action === 'camera.recordVideo') return { uri: '/video.mp4', duration: 10 };
      return {};
    };
    const methods = camera.methods(mockCall as any);
    expect(typeof methods.takePhoto).toBe('function');
    expect(typeof methods.pickImage).toBe('function');
    expect(typeof methods.recordVideo).toBe('function');
  });

  it('.host() should create handler result', () => {
    const result = camera.host({
      'camera.takePhoto': async () => ({ uri: '/p.jpg', width: 1, height: 1 }),
      'camera.pickImage': async () => ({ images: [] }),
      'camera.recordVideo': async () => ({ uri: '/v.mp4', duration: 0 }),
    });
    expect(result.pluginName).toBe('camera');
    expect(Object.keys(result.handlers)).toEqual([
      'camera.takePhoto', 'camera.pickImage', 'camera.recordVideo',
    ]);
  });

  it('methods should call through to bridge', async () => {
    const calls: any[] = [];
    const mockCall = async (action: string, payload: any) => {
      calls.push({ action, payload });
      return { uri: '/photo.jpg', width: 100, height: 100 };
    };
    const methods = camera.methods(mockCall as any);
    await methods.takePhoto({ quality: 0.8 });
    expect(calls[0]).toEqual({ action: 'camera.takePhoto', payload: { quality: 0.8 } });
  });
});
