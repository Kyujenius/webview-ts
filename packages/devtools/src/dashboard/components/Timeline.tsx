import type { RecordedMessage } from '../../types';
import { errorCodeColor, statusColor, statusIcon } from './StatusUtils';

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
        const color =
          m.status === 'error' && m.error?.code
            ? errorCodeColor(m.error.code)
            : statusColor(m.status);
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
            {m.sourceId && (
              <span
                style={{
                  fontSize: 9,
                  padding: '1px 3px',
                  borderRadius: 3,
                  background: '#115e59',
                  color: '#5eead4',
                  fontFamily: 'monospace',
                }}
              >
                {m.sourceId.length > 8 ? '…' + m.sourceId.slice(-4) : m.sourceId}
              </span>
            )}
            <span className="msg-action">{m.action}</span>
            {m.error?.code && (
              <span
                style={{
                  fontSize: 9,
                  padding: '1px 3px',
                  borderRadius: 3,
                  background: '#1e1e1e',
                  color: errorCodeColor(m.error.code),
                  fontFamily: 'monospace',
                }}
              >
                {m.error.code}
              </span>
            )}
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
