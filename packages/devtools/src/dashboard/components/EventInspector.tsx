import type { RecordedMessage } from '../../types';

interface EventInspectorProps {
  selected: RecordedMessage;
  eventStream: RecordedMessage[];
  expandedEvents: Set<string>;
  onToggleExpand: (recordId: string) => void;
}

export function EventInspector({
  selected,
  eventStream,
  expandedEvents,
  onToggleExpand,
}: EventInspectorProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="badge" style={{ background: '#a855f7' }}>
          event
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{selected.action}</span>
        <span className="event-count">{eventStream.length}</span>
      </div>
      <div className="event-stream">
        {eventStream.map((ev) => {
          const isExpanded = expandedEvents.has(ev.recordId);
          return (
            <div
              key={ev.recordId}
              className={`event-entry${isExpanded ? ' expanded' : ''}`}
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
                <span className="event-payload-preview">{JSON.stringify(ev.payload ?? null)}</span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
