/**
 * @webview-ts/devtools
 * Communication visualization and debugging tools
 */

// Types
export type {
  MessageDirection,
  MessageStatus,
  RecordedMessage,
  PerformanceMetrics,
  DevToolsConfig,
  DevToolsStore,
} from './types/index';

export {
  MessageDirection as MessageDirectionEnum,
  MessageStatus as MessageStatusEnum,
} from './types/index';

// Middleware
export { DevToolsMiddleware, createDevToolsMiddleware } from './middleware/DevToolsMiddleware';
export { TimeTracker, createTimeTracker } from './middleware/TimeTracker';
export type { PerformanceEntry } from './middleware/TimeTracker';

// Logger
export { DevToolsStoreImpl } from './logger/DevToolsStore';
export { StructuredLogger, createStructuredLogger, LogLevel } from './logger/StructuredLogger';
export type { LogEntry, LoggerConfig } from './logger/StructuredLogger';

// Visualizer components
export { MessageTimeline } from './visualizer/MessageTimeline';
export type { MessageTimelineProps } from './visualizer/MessageTimeline';

export { RequestInspector } from './visualizer/RequestInspector';
export type { RequestInspectorProps } from './visualizer/RequestInspector';

// Floating panel (TanStack Query DevTools-style)
export { TsBridgeDevtools } from './panel/TsBridgeDevtools';
export type { TsBridgeDevtoolsProps } from './panel/TsBridgeDevtools';

// Convenience function
export { createDevTools } from './createDevTools';
export type { DevToolsBundle, CreateDevToolsOptions } from './createDevTools';
