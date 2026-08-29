import { describe, expect, it, vi } from 'vite-plus/test';

import { ReactNativeHostAdapter } from './ReactNativeHostAdapter';

describe('ReactNativeHostAdapter', () => {
  it('send queues messages when no WebView ref is set and flushes on attach', () => {
    const adapter = new ReactNativeHostAdapter();
    adapter.send('first');
    adapter.send('second');

    const mockRef = { postMessage: vi.fn() };
    adapter.setWebViewRef(mockRef as any);

    expect(mockRef.postMessage).toHaveBeenNthCalledWith(1, 'first');
    expect(mockRef.postMessage).toHaveBeenNthCalledWith(2, 'second');
  });

  it('flushed queue is not re-sent on re-attach', () => {
    const adapter = new ReactNativeHostAdapter();
    adapter.send('queued');

    const mockRef = { postMessage: vi.fn() };
    adapter.setWebViewRef(mockRef as any);
    expect(mockRef.postMessage).toHaveBeenCalledTimes(1);

    adapter.setWebViewRef(null);
    const mockRef2 = { postMessage: vi.fn() };
    adapter.setWebViewRef(mockRef2 as any);
    expect(mockRef2.postMessage).not.toHaveBeenCalled();
  });

  it('send calls postMessage on WebView ref', () => {
    const adapter = new ReactNativeHostAdapter();
    const mockRef = { postMessage: vi.fn() };
    adapter.setWebViewRef(mockRef as any);
    adapter.send('hello');
    expect(mockRef.postMessage).toHaveBeenCalledWith('hello');
  });

  it('drops messages sent after detach — they target a dead page', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new ReactNativeHostAdapter();
    const mockRef = { postMessage: vi.fn() };
    adapter.setWebViewRef(mockRef as any);
    adapter.setWebViewRef(null);

    adapter.send('stale');

    const mockRef2 = { postMessage: vi.fn() };
    adapter.setWebViewRef(mockRef2 as any);
    // stale message must NOT replay into the fresh page
    expect(mockRef2.postMessage).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('dropping message'));
    warnSpy.mockRestore();
  });

  it('clears queued messages on detach so they never replay', () => {
    const adapter = new ReactNativeHostAdapter();
    const mockRef = { postMessage: vi.fn() };
    adapter.setWebViewRef(mockRef as any);
    adapter.setWebViewRef(null);
    const mockRef2 = { postMessage: vi.fn() };
    adapter.setWebViewRef(mockRef2 as any);
    expect(mockRef2.postMessage).not.toHaveBeenCalled();
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

  it('destroy clears listeners, ref, and pending queue', () => {
    const adapter = new ReactNativeHostAdapter();
    adapter.send('queued-before-destroy');
    const mockRef = { postMessage: vi.fn() };
    const listener = vi.fn();
    adapter.onMessage(listener);

    adapter.destroy();

    adapter.setWebViewRef(mockRef as any);
    expect(mockRef.postMessage).not.toHaveBeenCalled();
    adapter.handleNativeEvent({ nativeEvent: { data: 'test' } });
    expect(listener).not.toHaveBeenCalled();
  });
});
