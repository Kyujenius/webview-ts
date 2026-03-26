/**
 * Convenience factory for creating DevTools bundle
 */

import type { LoggerConfig, StructuredLogger } from './logger/StructuredLogger';
import { createStructuredLogger } from './logger/StructuredLogger';
import type { DevToolsMiddleware } from './middleware/DevToolsMiddleware';
import { createDevToolsMiddleware } from './middleware/DevToolsMiddleware';
import type { TimeTracker } from './middleware/TimeTracker';
import { createTimeTracker } from './middleware/TimeTracker';
import type { DevToolsConfig } from './types/index';

/**
 * DevTools bundle configuration
 */
export interface CreateDevToolsOptions {
  /**
   * DevTools recorder config
   */
  devtools?: DevToolsConfig;

  /**
   * Time tracker max entries
   */
  timeTrackerMaxEntries?: number;

  /**
   * Logger configuration
   */
  logger?: LoggerConfig;
}

/**
 * DevTools bundle
 */
export interface DevToolsBundle {
  /**
   * DevTools recorder for recording messages
   */
  recorder: DevToolsMiddleware;

  /**
   * Time tracker for performance metrics
   */
  timeTracker: TimeTracker;

  /**
   * Structured logger
   */
  logger: StructuredLogger;

  /**
   * Connect both recorder and timeTracker to a bridge target's lifecycle events.
   * Returns a cleanup function that unsubscribes all.
   */
  connect(target: { onCall(event: string, handler: (data: any) => void): () => void }): () => void;
}

/**
 * Create a complete DevTools bundle
 */
export function createDevTools(options: CreateDevToolsOptions = {}): DevToolsBundle {
  const recorder = createDevToolsMiddleware(options.devtools);
  const timeTracker = createTimeTracker(options.timeTrackerMaxEntries);
  const logger = createStructuredLogger(options.logger);

  return {
    recorder,
    timeTracker,
    logger,
    connect(target) {
      const unsub1 = recorder.connect(target);
      const unsub2 = timeTracker.connect(target);
      return () => {
        unsub1();
        unsub2();
      };
    },
  };
}
