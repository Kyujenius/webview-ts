import { useState } from 'react';

import type { RecordedMessage } from '../../types';

type EventTab = 'payload' | 'stream' | 'raw';

interface EventInspectorProps {
  selected: RecordedMessage;
  eventStream: RecordedMessage[];
  expandedEvents: Set<string>;
  onToggleExpand: (recordId: string) => void;
}

const TABS: EventTab[] = ['payload', 'stream', 'raw'];

export function EventInspector({
  selected,
  eventStream,
  expandedEvents,
  onToggleExpand,
}: EventInspectorProps) {
  const [tab, setTab] = useState<EventTab>('payload');

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="badge" style={{ background: '#a855f7' }}>
          event
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{selected.action}</span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#64748b',
          }}
        >
          {new Date(selected.timestamp).toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>

      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'stream'
              ? `Stream (${eventStream.length})`
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'payload' && (
        <pre className="code">{JSON.stringify(selected.payload ?? null, null, 2)}</pre>
      )}

      {tab === 'raw' && <pre className="code">{JSON.stringify(selected, null, 2)}</pre>}

      {tab === 'stream' && (
        <div className="event-stream">
          {eventStream.map((ev) => {
            const isExpanded = expandedEvents.has(ev.recordId);
            return (
              <div
                key={ev.recordId}
                className={`event-entry${isExpanded ? ' expanded' : ''}${ev.recordId === selected.recordId ? ' selected' : ''}`}
                onClick={() => onToggleExpand(ev.recordId)}
              >
                <span className="msg-time">
                  {new Date(ev.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                </span>
                {isExpanded ? (
                  <pre className="event-payload-full">
                    {JSON.stringify(ev.payload ?? null, null, 2)}
                  </pre>
                ) : (
                  <span className="event-payload-preview">
                    {JSON.stringify(ev.payload ?? null)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
