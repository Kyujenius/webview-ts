/**
 * MessageTimeline - Visual timeline component for bridge messages
 */

import React, { useState, useMemo } from 'react';
import type { RecordedMessage } from '../types/index';
import { MessageDirection, MessageStatus } from '../types/index';

/**
 * Timeline component props
 */
export interface MessageTimelineProps {
  /**
   * Messages to display
   */
  messages: RecordedMessage[];

  /**
   * Selected message record ID
   */
  selectedId?: string;

  /**
   * Message selection handler
   */
  onSelect?: (message: RecordedMessage) => void;

  /**
   * Filter function
   */
  filter?: (message: RecordedMessage) => boolean;

  /**
   * Max height in pixels
   */
  maxHeight?: number;
}

/**
 * Message timeline visualization component
 */
export function MessageTimeline({
  messages,
  selectedId,
  onSelect,
  filter,
  maxHeight = 600,
}: MessageTimelineProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    let filtered = messages;

    // Apply custom filter
    if (filter) {
      filtered = filtered.filter(filter);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((msg) => {
        if ('action' in msg.message) {
          return msg.message.action.toLowerCase().includes(term);
        }
        return false;
      });
    }

    // Sort by timestamp (newest first)
    return [...filtered].sort((a, b) => b.timestamp - a.timestamp);
  }, [messages, filter, searchTerm]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Message Timeline ({filteredMessages.length})</h3>
        <input
          type="text"
          placeholder="Search actions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Timeline */}
      <div style={{ ...styles.timeline, maxHeight }}>
        {filteredMessages.length === 0 ? (
          <div style={styles.empty}>No messages recorded</div>
        ) : (
          filteredMessages.map((message) => (
            <MessageItem
              key={message.recordId}
              message={message}
              selected={message.recordId === selectedId}
              onClick={() => onSelect?.(message)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Message item props
 */
interface MessageItemProps {
  message: RecordedMessage;
  selected: boolean;
  onClick: () => void;
}

/**
 * Individual message item
 */
function MessageItem({ message, selected, onClick }: MessageItemProps): JSX.Element {
  const statusColor = getStatusColor(message.status);
  const directionIcon = getDirectionIcon(message.direction);
  const time = new Date(message.timestamp).toLocaleTimeString();

  // Extract action name
  const action = 'action' in message.message ? message.message.action : 'response';

  return (
    <div
      onClick={onClick}
      style={{
        ...styles.item,
        ...(selected ? styles.itemSelected : {}),
        borderLeftColor: statusColor,
      }}
    >
      <div style={styles.itemHeader}>
        <span style={styles.directionIcon}>{directionIcon}</span>
        <span style={styles.action}>{action}</span>
        <span style={styles.time}>{time}</span>
      </div>

      <div style={styles.itemDetails}>
        <span style={{ ...styles.status, color: statusColor }}>{message.status}</span>
        {message.duration !== undefined && (
          <span style={styles.duration}>{message.duration.toFixed(2)}ms</span>
        )}
      </div>
    </div>
  );
}

/**
 * Get color for message status
 */
function getStatusColor(status: MessageStatus): string {
  switch (status) {
    case MessageStatus.SUCCESS:
      return '#22c55e';
    case MessageStatus.ERROR:
      return '#ef4444';
    case MessageStatus.TIMEOUT:
      return '#f97316';
    case MessageStatus.PENDING:
      return '#3b82f6';
    default:
      return '#6b7280';
  }
}

/**
 * Get icon for message direction
 */
function getDirectionIcon(direction: MessageDirection): string {
  switch (direction) {
    case MessageDirection.REQUEST:
      return '→';
    case MessageDirection.RESPONSE:
      return '←';
    case MessageDirection.EVENT:
      return '★';
    default:
      return '•';
  }
}

/**
 * Styles
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  timeline: {
    overflowY: 'auto',
    padding: '8px',
  },
  empty: {
    padding: '32px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  item: {
    padding: '12px',
    margin: '4px 0',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderLeft: '4px solid #3b82f6',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  itemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  directionIcon: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  action: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827',
    fontFamily: 'monospace',
  },
  time: {
    fontSize: '12px',
    color: '#6b7280',
  },
  itemDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '12px',
  },
  status: {
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  duration: {
    color: '#6b7280',
    fontFamily: 'monospace',
  },
};
