import type { RecordedMessage } from '../../types';
import { statusColor, errorCodeColor } from './StatusUtils';

export type InspectorTab = 'payload' | 'response' | 'routing' | 'raw';

interface CallInspectorProps {
  selected: RecordedMessage;
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
}

const TABS: InspectorTab[] = ['response', 'payload', 'routing', 'raw'];

function getTabContent(selected: RecordedMessage, tab: InspectorTab): string {
  if (tab === 'payload') return JSON.stringify(selected.payload ?? null, null, 2);
  if (tab === 'response')
    return JSON.stringify(
      selected.error ? { error: selected.error } : (selected.responseData ?? null),
      null,
      2
    );
  if (tab === 'routing') {
    const routing: Record<string, string | undefined> = {
      messageId: selected.messageId,
      sourceId: selected.sourceId,
      targetId: selected.targetId,
    };
    return JSON.stringify(routing, null, 2);
  }
  return JSON.stringify(selected, null, 2);
}

export function CallInspector({ selected, tab, onTabChange }: CallInspectorProps) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="badge" style={{ background: statusColor(selected.status) }}>
          {selected.status}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{selected.action}</span>
        {selected.error?.code && (
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: errorCodeColor(selected.error.code),
              fontWeight: 700,
            }}
          >
            {selected.error.code}
          </span>
        )}
        {selected.duration != null && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#64748b',
            }}
          >
            {selected.duration.toFixed(2)}ms
          </span>
        )}
      </div>
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab${tab === t ? ' active' : ''}`}
            onClick={() => onTabChange(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <pre className="code">{getTabContent(selected, tab)}</pre>
    </>
  );
}
