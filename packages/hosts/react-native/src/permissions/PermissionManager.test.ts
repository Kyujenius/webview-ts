import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionStatus } from '@webview-ts/shared';
import { PermissionManager, createPermissionManager } from './PermissionManager';

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

describe('PermissionManager', () => {
  let manager: PermissionManager;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onError = vi.fn();
    manager = new PermissionManager({ onError });
  });

  // 1. createPermissionManager returns instance
  it('createPermissionManager returns a PermissionManager instance', () => {
    const m = createPermissionManager();
    expect(m).toBeInstanceOf(PermissionManager);
  });

  // 2. registerPermission + hasPermissionHandler
  it('registerPermission registers a handler and hasPermissionHandler returns true', () => {
    expect(manager.hasPermissionHandler('camera')).toBe(false);
    manager.registerPermission('camera', vi.fn());
    expect(manager.hasPermissionHandler('camera')).toBe(true);
  });

  // 3. registerPermission throws on duplicate
  it('registerPermission throws when registering the same permission twice', () => {
    manager.registerPermission('camera', vi.fn());
    expect(() => manager.registerPermission('camera', vi.fn())).toThrow(
      "Permission handler for 'camera' is already registered"
    );
  });

  // 4. unregisterPermission removes handler and cache
  it('unregisterPermission removes handler and cached result', async () => {
    const handler = vi.fn().mockResolvedValue({ status: PermissionStatus.GRANTED });
    manager.registerPermission('camera', handler);
    await manager.checkPermission('camera'); // populate cache
    manager.unregisterPermission('camera');
    expect(manager.hasPermissionHandler('camera')).toBe(false);
    // cache cleared: handler should not be called again, but returns DENIED (no handler)
    const status = await manager.checkPermission('camera');
    expect(status).toBe(PermissionStatus.DENIED);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // 5. checkPermission returns GRANTED when handler resolves
  it('checkPermission returns GRANTED when handler resolves with GRANTED', async () => {
    manager.registerPermission(
      'camera',
      vi.fn().mockResolvedValue({ status: PermissionStatus.GRANTED })
    );
    const status = await manager.checkPermission('camera');
    expect(status).toBe(PermissionStatus.GRANTED);
  });

  // 6. checkPermission returns cached result on second call
  it('checkPermission returns cached result on second call without invoking handler again', async () => {
    const handler = vi.fn().mockResolvedValue({ status: PermissionStatus.GRANTED });
    manager.registerPermission('camera', handler);
    await manager.checkPermission('camera');
    await manager.checkPermission('camera');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // 7. checkPermission returns DENIED for unregistered permission
  it('checkPermission returns DENIED for an unregistered permission', async () => {
    const status = await manager.checkPermission('microphone');
    expect(status).toBe(PermissionStatus.DENIED);
  });

  // 8. checkPermission returns DENIED and calls onError when handler throws
  it('checkPermission returns DENIED and calls onError when handler throws', async () => {
    const err = new Error('check failed');
    manager.registerPermission('camera', vi.fn().mockRejectedValue(err));
    const status = await manager.checkPermission('camera');
    expect(status).toBe(PermissionStatus.DENIED);
    expect(onError).toHaveBeenCalledWith(err);
  });

  // 9. requestPermission returns status and caches
  it('requestPermission returns status and caches the result', async () => {
    const handler = vi.fn().mockResolvedValue({ status: PermissionStatus.GRANTED });
    manager.registerPermission('camera', handler);
    const status = await manager.requestPermission('camera');
    expect(status).toBe(PermissionStatus.GRANTED);
    // should now be cached: checkPermission should not call handler again
    await manager.checkPermission('camera');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // 10. requestPermission throws for unregistered permission
  it('requestPermission throws for an unregistered permission', async () => {
    await expect(manager.requestPermission('microphone')).rejects.toThrow(
      'No handler registered for permission: microphone'
    );
  });

  // 11. requestPermission calls onError and rethrows on handler error
  it('requestPermission calls onError and rethrows when handler throws', async () => {
    const err = new Error('request failed');
    manager.registerPermission('camera', vi.fn().mockRejectedValue(err));
    await expect(manager.requestPermission('camera')).rejects.toThrow(err);
    expect(onError).toHaveBeenCalledWith(err);
  });

  // 12. hasPermission returns true/false
  it('hasPermission returns true for GRANTED and false for DENIED', async () => {
    manager.registerPermission(
      'camera',
      vi.fn().mockResolvedValue({ status: PermissionStatus.GRANTED })
    );
    manager.registerPermission(
      'microphone',
      vi.fn().mockResolvedValue({ status: PermissionStatus.DENIED })
    );
    expect(await manager.hasPermission('camera')).toBe(true);
    expect(await manager.hasPermission('microphone')).toBe(false);
  });

  // 13. requestPermissions handles multiple permissions
  it('requestPermissions returns a map of statuses for multiple permissions', async () => {
    manager.registerPermission(
      'camera',
      vi.fn().mockResolvedValue({ status: PermissionStatus.GRANTED })
    );
    manager.registerPermission(
      'microphone',
      vi.fn().mockResolvedValue({ status: PermissionStatus.DENIED })
    );
    const results = await manager.requestPermissions(['camera', 'microphone']);
    expect(results).toEqual({
      camera: PermissionStatus.GRANTED,
      microphone: PermissionStatus.DENIED,
    });
  });

  // 14. requestPermissions catches individual failures
  it('requestPermissions catches individual failures and sets DENIED for that permission', async () => {
    manager.registerPermission(
      'camera',
      vi.fn().mockResolvedValue({ status: PermissionStatus.GRANTED })
    );
    manager.registerPermission('microphone', vi.fn().mockRejectedValue(new Error('fail')));
    const results = await manager.requestPermissions(['camera', 'microphone']);
    expect(results.camera).toBe(PermissionStatus.GRANTED);
    expect(results.microphone).toBe(PermissionStatus.DENIED);
    expect(onError).toHaveBeenCalled();
  });

  // 15. canShowRationale returns false on iOS
  it('canShowRationale returns false on iOS', () => {
    expect(manager.canShowRationale('camera')).toBe(false);
  });

  // 16. clearCache (specific + all)
  describe('clearCache', () => {
    it('clears a specific permission from the cache', async () => {
      const handler = vi.fn().mockResolvedValue({ status: PermissionStatus.GRANTED });
      manager.registerPermission('camera', handler);
      await manager.checkPermission('camera');
      manager.clearCache('camera');
      await manager.checkPermission('camera');
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('clears all permissions from the cache when called without arguments', async () => {
      const cameraHandler = vi.fn().mockResolvedValue({ status: PermissionStatus.GRANTED });
      const micHandler = vi.fn().mockResolvedValue({ status: PermissionStatus.GRANTED });
      manager.registerPermission('camera', cameraHandler);
      manager.registerPermission('microphone', micHandler);
      await manager.checkPermission('camera');
      await manager.checkPermission('microphone');
      manager.clearCache();
      await manager.checkPermission('camera');
      await manager.checkPermission('microphone');
      expect(cameraHandler).toHaveBeenCalledTimes(2);
      expect(micHandler).toHaveBeenCalledTimes(2);
    });
  });

  // 17. getRegisteredPermissions lists all
  it('getRegisteredPermissions returns all registered permission keys', () => {
    manager.registerPermission('camera', vi.fn());
    manager.registerPermission('microphone', vi.fn());
    const perms = manager.getRegisteredPermissions();
    expect(perms).toContain('camera');
    expect(perms).toContain('microphone');
    expect(perms).toHaveLength(2);
  });

  // 18. getPlatform returns OS
  it('getPlatform returns the current platform OS', () => {
    expect(manager.getPlatform()).toBe('ios');
  });
});
