import { describe, it, expect, vi } from 'vitest';
import { action, event } from './types';
import { definePlugin } from './define';
import type { Middleware } from '../types/middleware';

const mockMiddleware = (label: string): Middleware => ({
  name: label,
  fn: vi.fn(),
});

// ─── action() ───

describe('action()', () => {
  it('creates a marker with no options', () => {
    const m = action();
    expect(m.__interceptors).toEqual([]);
    expect(m.__timeout).toBeUndefined();
    expect(m.__retry).toBeUndefined();
    expect(m.__cache).toBeUndefined();
  });

  it('stores timeout option', () => {
    const m = action({ timeout: 3000 });
    expect(m.__timeout).toBe(3000);
  });

  it('stores retry option', () => {
    const retry = { maxAttempts: 3, delay: 500, exponentialBackoff: true };
    const m = action({ retry });
    expect(m.__retry).toEqual(retry);
  });

  it('stores cache option as number', () => {
    const m = action({ cache: 10000 });
    expect(m.__cache).toBe(10000);
  });

  it('stores cache option as true', () => {
    const m = action({ cache: true });
    expect(m.__cache).toBe(true);
  });

  it('use() chains interceptors and returns same marker', () => {
    const mw1 = mockMiddleware('mw1');
    const mw2 = mockMiddleware('mw2');
    const m = action();
    const returned = m.use(mw1).use(mw2);
    expect(returned).toBe(m);
    expect(m.__interceptors).toHaveLength(2);
    expect(m.__interceptors![0]).toBe(mw1);
    expect(m.__interceptors![1]).toBe(mw2);
  });
});

// ─── event() ───

describe('event()', () => {
  it('creates a basic event marker', () => {
    const e = event();
    expect(e.__routing).toBeUndefined();
  });

  it('stores routing option', () => {
    const e = event({ routing: 'broadcast' });
    expect(e.__routing).toBe('broadcast');
  });
});

// ─── definePlugin() ───

describe('definePlugin()', () => {
  const markers = {
    takePhoto: action<{ quality: number }, string>({ timeout: 5000 }),
    getStatus: action<void, boolean>({ retry: { maxAttempts: 2, delay: 200 } }),
    getCached: action<void, string>({ cache: 8000 }),
  };

  const mw = mockMiddleware('test-interceptor');
  markers.takePhoto.use(mw);

  const plugin = definePlugin('camera', markers);

  it('stores plugin name', () => {
    expect(plugin.name).toBe('camera');
  });

  it('builds action name map (short → qualified)', () => {
    expect(plugin.actions.takePhoto).toBe('camera.takePhoto');
    expect(plugin.actions.getStatus).toBe('camera.getStatus');
    expect(plugin.actions.getCached).toBe('camera.getCached');
  });

  it('builds empty event name map when no events', () => {
    expect(plugin.events).toEqual({});
  });

  it('extracts interceptors for actions that have them', () => {
    expect(plugin.interceptors['camera.takePhoto']).toContain(mw);
    expect(plugin.interceptors['camera.getStatus']).toBeUndefined();
  });

  it('extracts timeouts', () => {
    expect(plugin.timeouts['camera.takePhoto']).toBe(5000);
    expect(plugin.timeouts['camera.getStatus']).toBeUndefined();
  });

  it('extracts retries', () => {
    expect(plugin.retries['camera.getStatus']).toEqual({ maxAttempts: 2, delay: 200 });
    expect(plugin.retries['camera.takePhoto']).toBeUndefined();
  });

  it('extracts cache', () => {
    expect(plugin.caches['camera.getCached']).toBe(8000);
    expect(plugin.caches['camera.takePhoto']).toBeUndefined();
  });

  it('fallback is undefined by default', () => {
    expect(plugin.fallback).toBeUndefined();
  });
});

// ─── definePlugin() — with events ───

describe('definePlugin() with events', () => {
  const plugin = definePlugin(
    'location',
    { getPosition: action() },
    { events: { updated: event(), failed: event({ routing: 'targeted' }) } }
  );

  it('builds event name map', () => {
    expect(plugin.events.updated).toBe('location.updated');
    expect(plugin.events.failed).toBe('location.failed');
  });
});

// ─── host() ───

describe('definePlugin().host()', () => {
  const plugin = definePlugin(
    'camera',
    { shoot: action<{ flash: boolean }, string>() },
    { events: { done: event() } }
  );

  it('wraps handlers with fully-qualified names', async () => {
    const handler = vi.fn().mockResolvedValue('ok');
    const result = plugin.host({ shoot: handler });

    expect(result.pluginName).toBe('camera');
    expect(result.eventNames).toContain('camera.done');
    expect('camera.shoot' in result.handlers).toBe(true);

    const ctx = { messageId: 'x', timestamp: 0 };
    const response = await result.handlers['camera.shoot']({ flash: true }, ctx);
    expect(handler).toHaveBeenCalledWith({ flash: true }, ctx);
    expect(response).toBe('ok');
  });
});

// ─── withFallback() ───

describe('definePlugin().withFallback()', () => {
  const plugin = definePlugin('camera', {
    takePhoto: action<{ quality: number }, string>(),
  });

  it('maps short names to qualified names in fallback map', () => {
    const fallbackFn = vi.fn().mockResolvedValue('fallback-photo');
    const updated = plugin.withFallback({ takePhoto: fallbackFn });

    expect(updated).toBe(plugin);
    expect(plugin.fallback!['camera.takePhoto']).toBe(fallbackFn);
  });
});

// ─── empty events edge case ───

describe('definePlugin() with empty events option', () => {
  it('does not produce event names for empty events object', () => {
    const plugin = definePlugin('test', { act: action() }, { events: {} });
    expect(Object.keys(plugin.events)).toHaveLength(0);
  });
});
