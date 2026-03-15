/**
 * RequestInspector - Detailed inspector for bridge messages
 */

import React, { useState } from 'react';
import type { RecordedMessage } from '../types/index';
import { MessageDirection } from '../types/index';

/**
 * Inspector component props
 */
export interface RequestInspectorProps {
  /**
   * Message to inspect
   */
  message: RecordedMessage | null;

  /**
   * Show metadata
   */
  showMetadata?: boolean;
}

/**
 * Request inspector component
 */
export function RequestInspector({
  message,
  showMetadata = true,
}: RequestInspectorProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'message' | 'metadata' | 'raw'>('message');

  if (!message) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>Select a message to inspect</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Message Inspector</h3>
        <div style={styles.badge}>{message.direction}</div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'message' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('message')}
        >
          Message
        </button>
        {showMetadata && (
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'metadata' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('metadata')}
          >
            Metadata
          </button>
        )}
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'raw' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('raw')}
        >
          Raw
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'message' && <MessageTab message={message} />}
        {activeTab === 'metadata' && <MetadataTab message={message} />}
        {activeTab === 'raw' && <RawTab message={message} />}
      </div>
    </div>
  );
}

/**
 * Message tab
 */
function MessageTab({ message }: { message: RecordedMessage }): JSX.Element {
  const isRequest = message.direction === MessageDirection.REQUEST;
  const msg = message.message;

  return (
    <div style={styles.tabContent}>
      {/* Basic info */}
      <Section title="Basic Information">
        <Field label="ID" value={msg.id} />
        {isRequest && 'action' in msg && <Field label="Action" value={msg.action} />}
        <Field label="Timestamp" value={new Date(msg.timestamp).toISOString()} />
        {message.duration !== undefined && (
          <Field label="Duration" value={`${message.duration.toFixed(2)}ms`} />
        )}
      </Section>

      {/* Payload/Data */}
      {isRequest && 'payload' in msg && msg.payload !== undefined && (
        <Section title="Payload">
          <CodeBlock data={msg.payload} />
        </Section>
      )}

      {!isRequest && 'data' in msg && msg.data !== undefined && (
        <Section title="Response Data">
          <CodeBlock data={msg.data} />
        </Section>
      )}

      {/* Error */}
      {!isRequest && 'error' in msg && msg.error && (
        <Section title="Error">
          <Field label="Code" value={msg.error.code} />
          <Field label="Message" value={msg.error.message} />
          {msg.error.details && (
            <Field label="Details">
              <CodeBlock data={msg.error.details} />
            </Field>
          )}
        </Section>
      )}

      {/* Stack trace */}
      {message.stackTrace && (
        <Section title="Stack Trace">
          <pre style={styles.code}>{message.stackTrace}</pre>
        </Section>
      )}
    </div>
  );
}

/**
 * Metadata tab
 */
function MetadataTab({ message }: { message: RecordedMessage }): JSX.Element {
  return (
    <div style={styles.tabContent}>
      <Section title="Record Information">
        <Field label="Record ID" value={message.recordId} />
        <Field label="Direction" value={message.direction} />
        <Field label="Status" value={message.status} />
        <Field label="Recorded At" value={new Date(message.timestamp).toISOString()} />
      </Section>

      {message.metadata && Object.keys(message.metadata).length > 0 && (
        <Section title="Custom Metadata">
          <CodeBlock data={message.metadata} />
        </Section>
      )}
    </div>
  );
}

/**
 * Raw tab
 */
function RawTab({ message }: { message: RecordedMessage }): JSX.Element {
  return (
    <div style={styles.tabContent}>
      <CodeBlock data={message} />
    </div>
  );
}

/**
 * Section component
 */
function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>{title}</h4>
      <div style={styles.sectionContent}>{children}</div>
    </div>
  );
}

/**
 * Field component
 */
function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}): JSX.Element {
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>
        {children || <span style={styles.fieldText}>{value}</span>}
      </div>
    </div>
  );
}

/**
 * Code block component
 */
function CodeBlock({ data }: { data: unknown }): JSX.Element {
  const json = JSON.stringify(data, null, 2);

  return <pre style={styles.code}>{json}</pre>;
}

/**
 * Styles
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6b7280',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    padding: '4px 8px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '500',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
  },
  tabContent: {
    padding: '16px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  sectionContent: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '12px',
  },
  field: {
    display: 'flex',
    marginBottom: '8px',
  },
  fieldLabel: {
    width: '120px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#6b7280',
    flexShrink: 0,
  },
  fieldValue: {
    flex: 1,
    fontSize: '13px',
    color: '#111827',
  },
  fieldText: {
    fontFamily: 'monospace',
  },
  code: {
    margin: 0,
    padding: '12px',
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    fontSize: '12px',
    fontFamily: 'monospace',
    borderRadius: '6px',
    overflow: 'auto',
  },
};
