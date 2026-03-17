import type { RecordedMessage } from '../../types';
import { statusColor, statusIcon } from './StatusUtils';

interface TimelineProps {
  records: RecordedMessage[];
  selectedId: string | null;
  hasAnyRecords: boolean;
  onSelect: (id: string) => void;
}

export function Timeline({ records, selectedId, hasAnyRecords, onSelect }: TimelineProps) {
  if (records.length === 0) {
    return (
      <div id="timeline">
        <div className="empty">
          {hasAnyRecords ? 'No messages match filter' : 'Waiting for bridge messages...'}
        </div>
      </div>
    );
  }

  return (
    <div id="timeline">
      {records.map((m) => {
        const color = statusColor(m.status);
        return (
          <div
            key={m.recordId}
            className={`msg-row${selectedId === m.recordId ? ' selected' : ''}`}
            style={{ borderLeftColor: color }}
            onClick={() => onSelect(m.recordId)}
          >
            <span className="msg-icon" style={{ color }}>
              {statusIcon(m.status)}
            </span>
            {m.source && (
              <span
                className="msg-source"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 4px',
                  borderRadius: 3,
                  background: m.source === 'host' ? '#6366f1' : '#0ea5e9',
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {m.source}
              </span>
            )}
            <span className="msg-action">{m.action}</span>
            {m.duration != null && <span className="msg-dur">{m.duration.toFixed(0)}ms</span>}
            <span className="msg-time">
              {new Date(m.timestamp).toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
