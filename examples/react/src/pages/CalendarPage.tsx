import { useState } from 'react';
import { usePlugin, useBridge } from '../bridge';
import { calendar } from '@example/plugins';
import type { CalendarEvent } from '@example/plugins';

function CalendarPage() {
  const { connectionMode } = useBridge();
  const { addEvent, getEvents } = usePlugin(calendar);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    try {
      setError(null);
      const res = await addEvent({
        title,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        notes: notes || undefined,
      });
      setResult(`Event created (id: ${res.id})`);
      setTitle('');
      setNotes('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleGetEvents = async () => {
    try {
      setError(null);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      const res = await getEvents({ startDate: start, endDate: end });
      setEvents(res.events);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <h1>Calendar</h1>
      <p className="mode-badge">
        {connectionMode === 'native'
          ? 'Native Bridge'
          : connectionMode === 'fallback'
            ? 'Fallback (In-Memory)'
            : 'Disconnected'}
      </p>

      <div className="card">
        <h2>Add Event</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <button
            className="button"
            onClick={handleAdd}
            disabled={!title || !startDate || !endDate}
          >
            Add to Calendar
          </button>
        </div>
        {result && <div className="result success">{result}</div>}
      </div>

      <div className="card">
        <h2>This Month</h2>
        <button className="button button-secondary" onClick={handleGetEvents}>
          Load Events
        </button>
        {events.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            {events.map((evt) => (
              <div key={evt.id} className="result" style={{ marginBottom: '4px' }}>
                <strong>{evt.title}</strong>
                <br />
                <span style={{ fontSize: '11px', color: '#666' }}>
                  {new Date(evt.startDate).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="result error">{error}</div>}
    </div>
  );
}

export default CalendarPage;
