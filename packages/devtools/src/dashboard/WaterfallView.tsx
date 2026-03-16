import React, { useState } from 'react';
import type { MiddlewareTrace } from '../types/index';

export interface WaterfallViewProps {
  traces: MiddlewareTrace[];
  handlerMs?: number;
  handlerSkipped?: boolean;
  totalMs?: number;
}

export function WaterfallView({ traces, handlerMs, handlerSkipped, totalMs }: WaterfallViewProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const total =
    totalMs ?? traces.reduce((sum, t) => sum + t.enterMs + t.exitMs, 0) + (handlerMs ?? 0);
  const barScale = total > 0 ? 100 / total : 0;

  return (
    <div style={S.waterfallContainer}>
      <div style={S.waterfallHeader}>
        <span style={S.waterfallLabel}>Layer</span>
        <span style={S.waterfallLabel}>Name</span>
        <span style={S.waterfallTimingHeader}>Timing</span>
        <span style={S.waterfallLabel}>Enter</span>
        <span style={S.waterfallLabel}>Exit</span>
      </div>
      {traces.map((trace, i) => {
        const layerColor = trace.error
          ? '#ef4444'
          : trace.layer === 'global'
            ? '#3b82f6'
            : '#f59e0b';
        const enterWidth = Math.max(trace.enterMs * barScale, 1);
        const exitWidth = Math.max(trace.exitMs * barScale, 1);
        const isExpanded = expandedIdx === i;
        const hasDetail = !!(trace.error || trace.logs?.length || trace.metadataChanges);

        return (
          <React.Fragment key={i}>
            <div
              style={{
                ...S.waterfallRow,
                cursor: hasDetail ? 'pointer' : 'default',
                backgroundColor: isExpanded ? '#1e293b' : 'transparent',
              }}
              onClick={() => hasDetail && setExpandedIdx(isExpanded ? null : i)}
            >
              <span style={{ ...S.waterfallLayerBadge, backgroundColor: layerColor }}>
                {trace.layer === 'global' ? 'G' : 'P'}
              </span>
              <span style={S.waterfallName}>
                {hasDetail && <span style={S.expandArrow}>{isExpanded ? '\u25BC' : '\u25B6'}</span>}
                {trace.name}
                {trace.error && <span style={S.mwErrorBadge}>ERROR</span>}
                {trace.shortCircuit && (
                  <span style={S.waterfallShortCircuit}>
                    {trace.shortCircuitReason ?? 'short-circuit'}
                  </span>
                )}
              </span>
              <div style={S.waterfallBar}>
                <div
                  style={{
                    width: `${enterWidth}%`,
                    backgroundColor: layerColor,
                    height: 8,
                    borderRadius: 2,
                    display: 'inline-block',
                  }}
                />
                <div
                  style={{
                    width: `${exitWidth}%`,
                    backgroundColor: layerColor,
                    opacity: 0.5,
                    height: 8,
                    borderRadius: 2,
                    display: 'inline-block',
                    marginLeft: 1,
                  }}
                />
              </div>
              <span style={S.waterfallMs}>{trace.enterMs.toFixed(1)}</span>
              <span style={S.waterfallMs}>{trace.exitMs.toFixed(1)}</span>
            </div>
            {isExpanded && <TraceDetail trace={trace} />}
          </React.Fragment>
        );
      })}
      {/* Handler row */}
      <div style={S.waterfallRow}>
        <span style={{ ...S.waterfallLayerBadge, backgroundColor: '#6b7280' }}>H</span>
        <span style={S.waterfallName}>
          handler
          {handlerSkipped && <span style={S.waterfallShortCircuit}>skipped</span>}
        </span>
        <div style={S.waterfallBar}>
          {!handlerSkipped && handlerMs != null && (
            <div
              style={{
                width: `${Math.max(handlerMs * barScale, 1)}%`,
                backgroundColor: '#6b7280',
                height: 8,
                borderRadius: 2,
                display: 'inline-block',
              }}
            />
          )}
        </div>
        <span style={S.waterfallMs}>{handlerSkipped ? '-' : (handlerMs?.toFixed(1) ?? '-')}</span>
        <span style={S.waterfallMs}>-</span>
      </div>
    </div>
  );
}

function TraceDetail({ trace }: { trace: MiddlewareTrace }) {
  return (
    <div style={S.traceDetail}>
      {trace.error && (
        <div style={S.traceSection}>
          <div style={S.traceSectionTitle}>Error</div>
          <div style={S.traceError}>{trace.error.message}</div>
          {trace.error.stack && <pre style={S.traceStack}>{trace.error.stack}</pre>}
        </div>
      )}
      {trace.logs && trace.logs.length > 0 && (
        <div style={S.traceSection}>
          <div style={S.traceSectionTitle}>Logs</div>
          {trace.logs.map((log, i) => (
            <div key={i} style={S.traceLog}>
              {log}
            </div>
          ))}
        </div>
      )}
      {trace.metadataChanges && (
        <div style={S.traceSection}>
          <div style={S.traceSectionTitle}>Metadata Changes</div>
          <pre style={S.traceMetadata}>{JSON.stringify(trace.metadataChanges, null, 2)}</pre>
        </div>
      )}
      {!trace.error && !trace.logs?.length && !trace.metadataChanges && (
        <div style={S.traceEmpty}>No detail recorded</div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  waterfallContainer: {
    flex: 1,
    overflow: 'auto',
    padding: 8,
    backgroundColor: '#020617',
  },
  waterfallHeader: {
    display: 'grid',
    gridTemplateColumns: '28px 1fr 2fr 48px 48px',
    gap: 6,
    padding: '4px 4px 6px',
    borderBottom: '1px solid #1e293b',
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  waterfallRow: {
    display: 'grid',
    gridTemplateColumns: '28px 1fr 2fr 48px 48px',
    gap: 6,
    alignItems: 'center',
    padding: '4px',
    borderBottom: '1px solid #0f172a',
  },
  waterfallLabel: { fontSize: 10, color: '#64748b' },
  waterfallTimingHeader: { fontSize: 10, color: '#64748b' },
  waterfallLayerBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 16,
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 700,
    color: '#fff',
  },
  waterfallName: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  waterfallBar: { height: 10, display: 'flex', alignItems: 'center' },
  waterfallMs: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#94a3b8',
    textAlign: 'right',
  },
  waterfallShortCircuit: {
    fontSize: 9,
    fontWeight: 600,
    padding: '1px 4px',
    borderRadius: 3,
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    marginLeft: 6,
  },
  expandArrow: { fontSize: 8, marginRight: 4, color: '#64748b' },
  mwErrorBadge: {
    fontSize: 9,
    fontWeight: 700,
    padding: '1px 4px',
    borderRadius: 3,
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    marginLeft: 6,
  },
  traceDetail: {
    gridColumn: '1 / -1',
    padding: '8px 12px 8px 36px',
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #1e293b',
  },
  traceSection: { marginBottom: 8 },
  traceSectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  traceError: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#fca5a5',
    padding: '4px 8px',
    backgroundColor: '#1c0a0a',
    borderRadius: 4,
    borderLeft: '3px solid #ef4444',
  },
  traceStack: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#94a3b8',
    margin: '4px 0 0',
    padding: '4px 8px',
    backgroundColor: '#020617',
    borderRadius: 4,
    overflow: 'auto',
    maxHeight: 120,
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap',
  },
  traceLog: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#a5f3fc',
    padding: '2px 8px',
    borderLeft: '2px solid #334155',
  },
  traceMetadata: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#86efac',
    margin: 0,
    padding: '4px 8px',
    backgroundColor: '#020617',
    borderRadius: 4,
    overflow: 'auto',
    maxHeight: 120,
    lineHeight: 1.4,
  },
  traceEmpty: { fontSize: 11, color: '#475569', fontStyle: 'italic' },
};
