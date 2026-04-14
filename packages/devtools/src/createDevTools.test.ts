import { describe, expect, it, vi } from 'vitest';

import { createDevTools } from './createDevTools';
import { LogLevel } from './logger/StructuredLogger';

describe('createDevTools', () => {
  it('passes devtools config to recorder', () => {
    const onMessage = vi.fn();
    const bundle = createDevTools({
      devtools: { enabled: false, maxRecords: 50, onMessage },
    });
    expect(bundle.recorder.isEnabled()).toBe(false);
  });

  it('passes logger config to structured logger', () => {
    const onLog = vi.fn();
    const bundle = createDevTools({
      logger: { minLevel: LogLevel.WARN, console: false, onLog },
    });
    // DEBUG messages should be filtered out (below WARN)
    bundle.logger.log(LogLevel.DEBUG, 'debug message');
    expect(onLog).not.toHaveBeenCalled();

    // WARN messages should pass through
    bundle.logger.log(LogLevel.WARN, 'warn message');
    expect(onLog).toHaveBeenCalledOnce();
  });

  it('connect() subscribes both recorder and timeTracker to target events', () => {
    const bundle = createDevTools();
    const handlers = new Map<string, ((data: any) => void)[]>();

    const target = {
      onCall(event: string, handler: (data: any) => void): () => void {
        if (!handlers.has(event)) handlers.set(event, []);
        handlers.get(event)!.push(handler);
        return () => {
          const list = handlers.get(event);
          if (list) {
            const idx = list.indexOf(handler);
            if (idx >= 0) list.splice(idx, 1);
          }
        };
      },
    };

    const cleanup = bundle.connect(target);

    // Both recorder and timeTracker should subscribe to all 3 events
    expect(handlers.get('call:start')?.length).toBe(2);
    expect(handlers.get('call:end')?.length).toBe(2);
    expect(handlers.get('call:error')?.length).toBe(2);

    cleanup();

    // All handlers should be cleaned up
    expect(handlers.get('call:start')?.length).toBe(0);
    expect(handlers.get('call:end')?.length).toBe(0);
    expect(handlers.get('call:error')?.length).toBe(0);
  });
});
