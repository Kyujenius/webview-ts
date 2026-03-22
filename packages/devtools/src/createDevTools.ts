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
   * DevTools middleware config
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
   * DevTools middleware for recording messages
   */
  middleware: DevToolsMiddleware;

  /**
   * Time tracker for performance metrics
   */
  timeTracker: TimeTracker;

  /**
   * Structured logger
   */
  logger: StructuredLogger;
}

/**
 * Create a complete DevTools bundle
 */
export function createDevTools(options: CreateDevToolsOptions = {}): DevToolsBundle {
  const middleware = createDevToolsMiddleware(options.devtools);
  const timeTracker = createTimeTracker(options.timeTrackerMaxEntries);
  const logger = createStructuredLogger(options.logger);

  return {
    middleware,
    timeTracker,
    logger,
  };
}
