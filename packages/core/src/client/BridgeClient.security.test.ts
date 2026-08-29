/**
 * Message delivery + spoofing-protection tests.
 *
 * react-native-webview delivers host->web postMessage on window (iOS) or
 * document (Android, bubbles: false). Both must reach the client.
 * Messages carrying a `source` window (real postMessage from an iframe or
 * parent) must be dropped unless their origin is explicitly allowed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { BridgeClient } from './BridgeClient';

function setupNativeBridge() {
  (window as any).ReactNativeWebView = { postMessage: vi.fn() };
}

/** send happens after the async interceptor chain — flush microtasks first */
async function lastSentMessage(): Promise<{ id: string }> {
  const mock = (window as any).ReactNativeWebView.postMessage as ReturnType<typeof vi.fn>;
  await new Promise((resolve) => setTimeout(resolve, 0));
  return JSON.parse(mock.mock.calls[mock.mock.calls.length - 1][0]);
}

function makeResponse(id: string) {
  return JSON.stringify({
    id,
    success: true,
    data: { ok: true },
    timestamp: Date.now(),
    sourceId: 'host',
    targetId: 'client',
  });
}

describe('message delivery', () => {
  let client: BridgeClient;

  beforeEach(() => {
    setupNativeBridge();
    client = new BridgeClient();
    client.connect();
  });

  afterEach(() => {
    client.destroy();
    delete (window as any).ReactNativeWebView;
  });

  it('receives responses dispatched on window (iOS path)', async () => {
    const promise = client.call('test.action');
    const { id } = await lastSentMessage();

    window.dispatchEvent(new MessageEvent('message', { data: makeResponse(id) }));

    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('receives responses dispatched on document with bubbles: false (Android path)', async () => {
    const promise = client.call('test.action');
    const { id } = await lastSentMessage();

    // Mirrors RNCWebViewManagerImpl.kt: new MessageEvent (bubbles: false) on document
    document.dispatchEvent(new MessageEvent('message', { data: makeResponse(id), bubbles: false }));

    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('receives events dispatched on document (Android path)', () => {
    const handler = vi.fn();
    client.on('some.event', handler);

    document.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          event: 'some.event',
          payload: { v: 1 },
          timestamp: Date.now(),
          sourceId: 'host',
        }),
      })
    );

    expect(handler).toHaveBeenCalledWith({ v: 1 });
  });
});

describe('spoofing protection', () => {
  afterEach(() => {
    delete (window as any).ReactNativeWebView;
  });

  it('drops messages that carry a source window (iframe/parent postMessage)', () => {
    setupNativeBridge();
    const client = new BridgeClient();
    client.connect();
    const handler = vi.fn();
    client.on('session.expired', handler);

    // Real postMessage always sets source — simulate a hostile frame
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          event: 'session.expired',
          payload: {},
          timestamp: Date.now(),
          sourceId: 'host',
        }),
        source: window,
        origin: 'https://evil.example',
      })
    );

    expect(handler).not.toHaveBeenCalled();
    client.destroy();
  });

  it('accepts sourced messages from an explicitly allowed origin', () => {
    setupNativeBridge();
    const client = new BridgeClient({ allowedOrigins: ['https://trusted.example'] });
    client.connect();
    const handler = vi.fn();
    client.on('session.expired', handler);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          event: 'session.expired',
          payload: {},
          timestamp: Date.now(),
          sourceId: 'host',
        }),
        source: window,
        origin: 'https://trusted.example',
      })
    );

    expect(handler).toHaveBeenCalledWith({});
    client.destroy();
  });
});

describe('abort (BridgeCallOptions.signal)', () => {
  afterEach(() => {
    delete (window as any).ReactNativeWebView;
  });

  it('rejects with ABORTED before sending when the signal is already aborted', async () => {
    setupNativeBridge();
    const client = new BridgeClient();
    client.connect();
    const controller = new AbortController();
    controller.abort();

    await expect(
      client.call('a.b', undefined, { signal: controller.signal })
    ).rejects.toMatchObject({ code: 'ABORTED' });
    const mock = (window as any).ReactNativeWebView.postMessage;
    expect(mock).not.toHaveBeenCalled();
    client.destroy();
  });

  it('aborting mid-flight rejects the wait and ignores the late response', async () => {
    setupNativeBridge();
    const client = new BridgeClient();
    client.connect();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const controller = new AbortController();

    const promise = client.call('a.b', undefined, { signal: controller.signal });
    const { id } = await lastSentMessage();

    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: 'ABORTED' });

    // The late response finds no pending callback — warned and dropped
    window.dispatchEvent(new MessageEvent('message', { data: makeResponse(id) }));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown message'));
    warnSpy.mockRestore();
    client.destroy();
  });

  it('an aborted call is never retried', async () => {
    setupNativeBridge();
    const client = new BridgeClient({ retry: { maxAttempts: 3, delay: 10 } });
    client.connect();
    const controller = new AbortController();

    const promise = client.call('a.b', undefined, { signal: controller.signal });
    await lastSentMessage();
    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: 'ABORTED' });

    await new Promise((r) => setTimeout(r, 50));
    const mock = (window as any).ReactNativeWebView.postMessage;
    expect(mock).toHaveBeenCalledTimes(1); // no re-send after abort
    client.destroy();
  });
});
