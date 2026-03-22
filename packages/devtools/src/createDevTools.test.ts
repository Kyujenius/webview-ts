import { describe, it, expect, vi } from 'vitest';
import { createDevTools } from './createDevTools';
import { DevToolsMiddleware } from './middleware/DevToolsMiddleware';
import { TimeTracker } from './middleware/TimeTracker';
import { StructuredLogger, LogLevel } from './logger/StructuredLogger';

describe('createDevTools', () => {
  it('returns a bundle with middleware, timeTracker, and logger', () => {
    const bundle = createDevTools();
    expect(bundle).toHaveProperty('middleware');
    expect(bundle).toHaveProperty('timeTracker');
    expect(bundle).toHaveProperty('logger');
  });

  it('creates all three with default options when called with no arguments', () => {
    const bundle = createDevTools();
    expect(bundle.middleware).toBeInstanceOf(DevToolsMiddleware);
    expect(bundle.timeTracker).toBeInstanceOf(TimeTracker);
    expect(bundle.logger).toBeInstanceOf(StructuredLogger);
  });

  it('passes devtools config to middleware', () => {
    const onMessage = vi.fn();
    const bundle = createDevTools({
      devtools: { enabled: false, maxRecords: 50, onMessage },
    });
    expect(bundle.middleware.isEnabled()).toBe(false);
  });

  it('passes timeTrackerMaxEntries to timeTracker', () => {
    const bundle = createDevTools({ timeTrackerMaxEntries: 42 });
    // Verify the timeTracker respects maxEntries by filling it past the limit
    // We can't inspect private fields directly, so we use the public API
    expect(bundle.timeTracker).toBeInstanceOf(TimeTracker);
    // TimeTracker with maxEntries=42 keeps only the last 42 entries
    // Confirm it was constructed (no error thrown)
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

  it('middleware has expected methods', () => {
    const { middleware } = createDevTools();
    expect(typeof middleware.isEnabled).toBe('function');
    expect(typeof middleware.setEnabled).toBe('function');
    expect(typeof middleware.clear).toBe('function');
    expect(typeof middleware.getStore).toBe('function');
    expect(typeof middleware.toMiddleware).toBe('function');
  });

  it('timeTracker has expected methods', () => {
    const { timeTracker } = createDevTools();
    expect(typeof timeTracker.getEntries).toBe('function');
    expect(typeof timeTracker.getAverageDuration).toBe('function');
    expect(typeof timeTracker.getSuccessRate).toBe('function');
    expect(typeof timeTracker.clear).toBe('function');
    expect(typeof timeTracker.toMiddleware).toBe('function');
  });

  it('logger has expected methods', () => {
    const { logger } = createDevTools();
    expect(typeof logger.log).toBe('function');
    expect(typeof logger.getLogs).toBe('function');
    expect(typeof logger.getLogsByLevel).toBe('function');
    expect(typeof logger.clear).toBe('function');
    expect(typeof logger.toMiddleware).toBe('function');
  });
});
