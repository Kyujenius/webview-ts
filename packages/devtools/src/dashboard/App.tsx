import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RecordedMessage } from '../types';
import { Toolbar } from './components/Toolbar';
import { FilterBar, type Filter } from './components/FilterBar';
import { Timeline } from './components/Timeline';
import { EventInspector } from './components/EventInspector';
import { CallInspector, type InspectorTab } from './components/CallInspector';
import './app.css';

export function App() {
  const [records, setRecords] = useState<Map<string, RecordedMessage>>(new Map());
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState<InspectorTab>('response');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  // ---- WebSocket connection ----

  useEffect(() => {
    let ws: WebSocket;
    let timer: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(`ws://${window.location.host}?role=dashboard`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        timer = setTimeout(connect, 1000);
      };

      ws.onmessage = (e) => {
        let msg: { type: string; record?: RecordedMessage; appConnected?: boolean };
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }

        if (msg.type === 'status') {
          setConnected(msg.appConnected ?? false);
        } else if (msg.type === 'record' && msg.record) {
          setConnected(true);
          setRecords((prev) => {
            const next = new Map(prev);
            next.set(msg.record!.recordId, msg.record!);
            return next;
          });
        } else if (msg.type === 'clear') {
          setRecords(new Map());
          setSelectedId(null);
        }
      };
    }

    connect();
    return () => {
      clearTimeout(timer);
      ws?.close();
    };
  }, []);

  // ---- Derived state ----

  const all = useMemo(() => Array.from(records.values()), [records]);

  const filtered = useMemo(() => {
    let arr = all;
    if (filter !== 'all') arr = arr.filter((m) => m.status === filter);
    if (search) arr = arr.filter((m) => m.action.toLowerCase().includes(search.toLowerCase()));
    if (sourceFilter) arr = arr.filter((m) => m.sourceId === sourceFilter || m.status === 'event');
    return arr.reverse();
  }, [all, filter, search, sourceFilter]);

  const selected = selectedId ? (records.get(selectedId) ?? null) : null;

  const sourceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of all) {
      if (m.sourceId) ids.add(m.sourceId);
    }
    return Array.from(ids).sort();
  }, [all]);

  const stats = useMemo(() => {
    const total = all.length;
    const errs = all.filter((m) => m.status === 'error').length;
    const events = all.filter((m) => m.status === 'event').length;
    const successes = all.filter((m) => m.status === 'success').length;
    const calls = total - events;
    const rate = calls ? Math.round((successes / calls) * 100) : 0;
    const durations = all.filter((m) => m.duration != null).map((m) => m.duration!);
    const avg = durations.length
      ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
      : '-';
    const errorBreakdown: Record<string, number> = {};
    for (const m of all) {
      if (m.error?.code) {
        errorBreakdown[m.error.code] = (errorBreakdown[m.error.code] ?? 0) + 1;
      }
    }
    return { total, errs, events, rate, avg, errorBreakdown };
  }, [all]);

  const eventStream = useMemo(() => {
    if (!selected || selected.status !== 'event') return [];
    return all
      .filter((m) => m.action === selected.action && m.status === 'event')
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [all, selected]);

  // ---- Callbacks ----

  const clearAll = useCallback(() => {
    setRecords(new Map());
    setSelectedId(null);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setTab('response');
  }, []);

  const toggleEventExpand = useCallback((recordId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  }, []);

  // ---- Render ----

  return (
    <>
      <Toolbar stats={stats} connected={connected} onClear={clearAll} />
      <FilterBar
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        totalCount={records.size}
        sourceIds={sourceIds}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
      />
      <div id="body">
        <Timeline
          records={filtered}
          selectedId={selectedId}
          hasAnyRecords={records.size > 0}
          onSelect={handleSelect}
        />
        <div id="inspector">
          {!selected ? (
            <div className="empty">Select a message to inspect</div>
          ) : selected.status === 'event' ? (
            <EventInspector
              selected={selected}
              eventStream={eventStream}
              expandedEvents={expandedEvents}
              onToggleExpand={toggleEventExpand}
            />
          ) : (
            <CallInspector selected={selected} tab={tab} onTabChange={setTab} />
          )}
        </div>
      </div>
    </>
  );
}
