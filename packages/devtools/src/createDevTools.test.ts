import { describe, expect, it, vi } from 'vitest';

import { createDevTools } from './createDevTools';
import { LogLevel, StructuredLogger } from './logger/StructuredLogger';
import { DevToolsMiddleware } from './middleware/DevToolsMiddleware';
import { TimeTracker } from './middleware/TimeTracker';

describe('createDevTools', () => {
  it('returns a bundle with recorder, timeTracker, logger, and connect', () => {
    const bundle = createDevTools();
    expect(bundle).toHaveProperty('recorder');
    expect(bundle).toHaveProperty('timeTracker');
    expect(bundle).toHaveProperty('logger');
    expect(bundle).toHaveProperty('connect');
  });

  it('creates all three with default options when called with no arguments', () => {
    const bundle = createDevTools();
    expect(bundle.recorder).toBeInstanceOf(DevToolsMiddleware);
    expect(bundle.timeTracker).toBeInstanceOf(TimeTracker);
    expect(bundle.logger).toBeInstanceOf(StructuredLogger);
  });

  it('passes devtools config to recorder', () => {
    const onMessage = vi.fn();
    const bundle = createDevTools({
      devtools: { enabled: false, maxRecords: 50, onMessage },
    });
    expect(bundle.recorder.isEnabled()).toBe(false);
  });

  it('passes timeTrackerMaxEntries to timeTracker', () => {
    const bundle = createDevTools({ timeTrackerMaxEntries: 42 });
    expect(bundle.timeTracker).toBeInstanceOf(TimeTracker);
    expect(bundle.timeTracker.getEntries()).toHaveLength(0);
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

  it('recorder has expected methods', () => {
    const { recorder } = createDevTools();
    expect(typeof recorder.isEnabled).toBe('function');
    expect(typeof recorder.setEnabled).toBe('function');
    expect(typeof recorder.clear).toBe('function');
    expect(typeof recorder.getStore).toBe('function');
    expect(typeof recorder.connect).toBe('function');
  });

  it('timeTracker has expected methods', () => {
    const { timeTracker } = createDevTools();
    expect(typeof timeTracker.getEntries).toBe('function');
    expect(typeof timeTracker.getAverageDuration).toBe('function');
    expect(typeof timeTracker.getSuccessRate).toBe('function');
    expect(typeof timeTracker.clear).toBe('function');
    expect(typeof timeTracker.connect).toBe('function');
  });

  it('logger has expected methods', () => {
    const { logger } = createDevTools();
    expect(typeof logger.log).toBe('function');
    expect(typeof logger.getLogs).toBe('function');
    expect(typeof logger.getLogsByLevel).toBe('function');
    expect(typeof logger.clear).toBe('function');
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
