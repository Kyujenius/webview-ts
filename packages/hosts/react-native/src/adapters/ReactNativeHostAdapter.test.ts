import { describe, it, expect, vi } from 'vitest';
import { ReactNativeHostAdapter } from './ReactNativeHostAdapter';

describe('ReactNativeHostAdapter', () => {
  it('send warns when no WebView ref is set', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new ReactNativeHostAdapter();
    adapter.send('test');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('WebView reference not set'));
    warnSpy.mockRestore();
  });

  it('send calls postMessage on WebView ref', () => {
    const adapter = new ReactNativeHostAdapter();
    const mockRef = { postMessage: vi.fn() };
    adapter.setWebViewRef(mockRef as any);
    adapter.send('hello');
    expect(mockRef.postMessage).toHaveBeenCalledWith('hello');
  });

  it('setWebViewRef(null) clears the ref', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new ReactNativeHostAdapter();
    const mockRef = { postMessage: vi.fn() };
    adapter.setWebViewRef(mockRef as any);
    adapter.setWebViewRef(null);
    adapter.send('test');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('onMessage registers listener and returns unsubscribe', () => {
    const adapter = new ReactNativeHostAdapter();
    const listener = vi.fn();
    const unsub = adapter.onMessage(listener);

    adapter.handleNativeEvent({ nativeEvent: { data: '{"test":1}' } });
    expect(listener).toHaveBeenCalledWith('{"test":1}');

    unsub();
    adapter.handleNativeEvent({ nativeEvent: { data: 'after unsub' } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('handleNativeEvent dispatches to all listeners', () => {
    const adapter = new ReactNativeHostAdapter();
    const l1 = vi.fn();
    const l2 = vi.fn();
    adapter.onMessage(l1);
    adapter.onMessage(l2);

    adapter.handleNativeEvent({ nativeEvent: { data: 'msg' } });
    expect(l1).toHaveBeenCalledWith('msg');
    expect(l2).toHaveBeenCalledWith('msg');
  });

  it('destroy clears listeners and ref', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new ReactNativeHostAdapter();
    const mockRef = { postMessage: vi.fn() };
    adapter.setWebViewRef(mockRef as any);
    const listener = vi.fn();
    adapter.onMessage(listener);

    adapter.destroy();

    adapter.send('test');
    expect(warnSpy).toHaveBeenCalled();
    adapter.handleNativeEvent({ nativeEvent: { data: 'test' } });
    expect(listener).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
