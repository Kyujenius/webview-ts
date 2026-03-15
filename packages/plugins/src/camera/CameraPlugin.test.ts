import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CameraPlugin } from './CameraPlugin';
import type { BridgeManager } from '@ts-bridge/core';
import { CameraType, ImageQuality } from './types';

describe('CameraPlugin', () => {
  let mockBridge: BridgeManager;
  let plugin: CameraPlugin;

  beforeEach(() => {
    mockBridge = {
      isAvailable: vi.fn().mockReturnValue(true),
      call: vi.fn().mockResolvedValue({
        uri: 'file:///test.jpg',
        width: 1920,
        height: 1080,
        accuracy: 10,
      }),
    } as unknown as BridgeManager;

    plugin = new CameraPlugin(mockBridge);
  });

  describe('takePhoto', () => {
    it('should take photo with options', async () => {
      const options = {
        cameraType: CameraType.BACK,
        quality: ImageQuality.HIGH,
        allowEditing: true,
      };

      const result = await plugin.takePhoto(options);

      expect(mockBridge.call).toHaveBeenCalledWith('camera.takePhoto', options);
      expect(result).toHaveProperty('uri');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
    });

    it('should take photo with default options', async () => {
      await plugin.takePhoto();

      expect(mockBridge.call).toHaveBeenCalledWith('camera.takePhoto', {});
    });
  });

  describe('pickImage', () => {
    it('should pick single image', async () => {
      const options = {
        allowMultiple: false,
        quality: ImageQuality.MEDIUM,
      };

      await plugin.pickImage(options);

      expect(mockBridge.call).toHaveBeenCalledWith('camera.pickImage', options);
    });
  });

  describe('isAvailable', () => {
    it('should check if camera is available', () => {
      const available = plugin.isAvailable();
      expect(available).toBe(true);
      expect(mockBridge.isAvailable).toHaveBeenCalled();
    });
  });
});
