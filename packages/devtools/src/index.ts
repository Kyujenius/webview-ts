/**
 * @webview-ts/devtools
 * Communication visualization and debugging tools
 */

// Types
export type {
  MiddlewareTrace,
  RecordedMessage,
  PerformanceMetrics,
  DevToolsConfig,
  DevToolsStore,
} from './types/index';

export type { MessageStatus } from './types/index';

// Middleware
export { DevToolsMiddleware, createDevToolsMiddleware } from './middleware/DevToolsMiddleware';
export { createTimeTracker } from './middleware/TimeTracker';
export type { PerformanceEntry } from './middleware/TimeTracker';

// Logger
export { createStructuredLogger, LogLevel } from './logger/StructuredLogger';
export type { LogEntry, LoggerConfig } from './logger/StructuredLogger';

// Dashboard (standalone window)
export { Dashboard } from './dashboard/index';
export type { DashboardProps } from './dashboard/index';
export { WaterfallView } from './dashboard/index';
export type { WaterfallViewProps } from './dashboard/index';

// Floating button (opens dashboard in new window)
export { TsBridgeDevtools } from './panel/TsBridgeDevtools';
export type { TsBridgeDevtoolsProps } from './panel/TsBridgeDevtools';

// Legacy visualizer components (deprecated — use Dashboard)
export { MessageTimeline } from './visualizer/MessageTimeline';
export type { MessageTimelineProps } from './visualizer/MessageTimeline';

export { RequestInspector } from './visualizer/RequestInspector';
export type { RequestInspectorProps } from './visualizer/RequestInspector';
