/**
 * Convenience factory for creating DevTools bundle
 */

import { DevToolsMiddleware, createDevToolsMiddleware } from './middleware/DevToolsMiddleware';
import { TimeTracker, createTimeTracker } from './middleware/TimeTracker';
import { StructuredLogger, createStructuredLogger } from './logger/StructuredLogger';
import type { DevToolsConfig } from './types/index';
import type { LoggerConfig } from './logger/StructuredLogger';

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
