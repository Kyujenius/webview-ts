# @webview-ts/devtools

Communication visualization and debugging tools for ts-bridge.

## Features

- 📊 **Message Timeline** - Visual timeline of all bridge communications
- 🔍 **Request Inspector** - Detailed inspection of messages and responses
- ⏱️ **Performance Tracking** - Monitor response times and success rates
- 📝 **Structured Logging** - Configurable logging with multiple levels
- 💾 **Export/Import** - Save and load message history for analysis
- 🎨 **React Components** - Ready-to-use visualization components

## Installation

```bash
npm install @webview-ts/devtools
# or
pnpm add @webview-ts/devtools
```

## Usage

### Basic Setup

```typescript
import { createBridge } from '@webview-ts/core';
import { createDevTools } from '@webview-ts/devtools';

// Create DevTools bundle
const devTools = createDevTools({
  devtools: {
    enabled: true,
    maxRecords: 1000,
  },
  logger: {
    console: true,
    minLevel: 'debug',
  },
});

// Create bridge with DevTools middleware
const bridge = createBridge({
  middleware: [
    devTools.middleware,
    devTools.timeTracker,
    devTools.logger,
  ],
});
```

### Using Individual Components

#### DevTools Middleware

Records all bridge messages for visualization:

```typescript
import { createDevToolsMiddleware } from '@webview-ts/devtools';

const middleware = createDevToolsMiddleware({
  enabled: true,
  maxRecords: 1000,
  trackPerformance: true,
  captureStackTraces: true,

  // Custom filter
  filter: (message) => {
    // Only record certain actions
    return message.action !== 'ping';
  },

  // Real-time notifications
  onMessage: (record) => {
    console.log('New message:', record);
  },
});

// Get recorded messages
const messages = middleware.getStore().getMessages();

// Get performance metrics
const metrics = middleware.getStore().getMetrics();

// Export for analysis
const json = middleware.getStore().export();
```

#### Time Tracker

Tracks performance metrics:

```typescript
import { createTimeTracker } from '@webview-ts/devtools';

const timeTracker = createTimeTracker(1000);

// Get all performance entries
const entries = timeTracker.getEntries();

// Get average duration for an action
const avgDuration = timeTracker.getAverageDuration('getUserProfile');

// Get success rate
const successRate = timeTracker.getSuccessRate('updateSettings');

// Export performance data
const perfData = timeTracker.export();
```

#### Structured Logger

Configurable logging with multiple levels:

```typescript
import { createStructuredLogger, LogLevel } from '@webview-ts/devtools';

const logger = createStructuredLogger({
  minLevel: LogLevel.INFO,
  console: true,
  includePayloads: false, // Hide sensitive data

  onLog: (entry) => {
    // Send to external logging service
    sendToLoggingService(entry);
  },
});

// Manual logging
logger.log(LogLevel.INFO, 'Custom message', { data: 'value' });

// Get all logs
const logs = logger.getLogs();

// Get error logs only
const errors = logger.getLogsByLevel(LogLevel.ERROR);
```

### React Components

#### Message Timeline

Visual timeline of bridge messages:

```tsx
import { MessageTimeline } from '@webview-ts/devtools';
import { useState } from 'react';

function DevToolsPanel() {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const messages = devTools.middleware.getStore().getMessages();

  return (
    <MessageTimeline
      messages={messages}
      selectedId={selectedMessage?.recordId}
      onSelect={setSelectedMessage}
      maxHeight={600}
      filter={(msg) => msg.status !== 'pending'}
    />
  );
}
```

#### Request Inspector

Detailed message inspector:

```tsx
import { RequestInspector } from '@webview-ts/devtools';

function InspectorPanel() {
  return (
    <RequestInspector
      message={selectedMessage}
      showMetadata={true}
    />
  );
}
```

### Complete Example

```tsx
import { createBridge } from '@webview-ts/core';
import {
  createDevTools,
  MessageTimeline,
  RequestInspector,
} from '@webview-ts/devtools';
import { useState } from 'react';

// Create DevTools
const devTools = createDevTools();

// Create bridge
const bridge = createBridge({
  middleware: [
    devTools.middleware,
    devTools.timeTracker,
    devTools.logger,
  ],
});

// DevTools UI Component
function DevToolsUI() {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messages, setMessages] = useState([]);

  // Update messages in real-time
  devTools.middleware.config.onMessage = () => {
    setMessages(devTools.middleware.getStore().getMessages());
  };

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100vh' }}>
      <div style={{ flex: 1 }}>
        <MessageTimeline
          messages={messages}
          selectedId={selectedMessage?.recordId}
          onSelect={setSelectedMessage}
        />
      </div>
      <div style={{ flex: 1 }}>
        <RequestInspector message={selectedMessage} />
      </div>
    </div>
  );
}
```

## API Reference

### Types

#### `RecordedMessage`

Represents a recorded bridge message:

```typescript
interface RecordedMessage {
  recordId: string;
  direction: MessageDirection;
  status: MessageStatus;
  message: BridgeMessage | BridgeResponse;
  timestamp: number;
  duration?: number;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}
```

#### `PerformanceMetrics`

Performance statistics:

```typescript
interface PerformanceMetrics {
  totalMessages: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successRate: number;
  errorCount: number;
  timeoutCount: number;
}
```

### Configuration

#### `DevToolsConfig`

```typescript
interface DevToolsConfig {
  enabled?: boolean;              // Enable recording (default: true)
  maxRecords?: number;            // Max messages to store (default: 1000)
  trackPerformance?: boolean;     // Track durations (default: true)
  captureStackTraces?: boolean;   // Capture error stacks (default: true)
  filter?: (message) => boolean;  // Message filter
  onMessage?: (record) => void;   // New message callback
}
```

#### `LoggerConfig`

```typescript
interface LoggerConfig {
  minLevel?: LogLevel;            // Minimum log level (default: INFO)
  console?: boolean;              // Log to console (default: false)
  onLog?: (entry) => void;        // Custom log handler
  includePayloads?: boolean;      // Include payloads (default: true)
}
```

## Performance Considerations

- **Memory**: DevTools stores messages in memory. Configure `maxRecords` to limit memory usage
- **Production**: Disable DevTools in production or use minimal configuration
- **Filtering**: Use filters to reduce recorded messages
- **Payloads**: Set `includePayloads: false` for sensitive data or large payloads

## License

MIT
