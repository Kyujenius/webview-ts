import { calendar } from '@example/plugins';
import { useState } from 'react';

import { useBridge, usePlugin } from '../bridge';
import ActionError from '../components/ActionError';
import ModeBadge from '../components/ModeBadge';

// datetime-local input expects "YYYY-MM-DDTHH:mm" in local time
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function CalendarPage() {
  const { connectionMode } = useBridge();
  const { addEvent, getEvents } = usePlugin(calendar);
  const [title, setTitle] = useState('Star webview-ts on GitHub ⭐');
  const [startDate, setStartDate] = useState(() =>
    toLocalInput(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [endDate, setEndDate] = useState(() =>
    toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000))
  );
  const [notes, setNotes] = useState('Typed postMessage — no more raw strings');

  const handleAdd = async () => {
    const res = await addEvent.execute({
      title,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      notes: notes || undefined,
    });
    if (res) {
      setTitle('');
      setNotes('');
    }
  };

  const handleGetEvents = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    getEvents.execute({ startDate: start, endDate: end });
  };

  const events = getEvents.data?.events ?? [];
  const error = addEvent.error ?? getEvents.error;

  return (
    <div>
      <h1>Calendar</h1>
      <ModeBadge connectionMode={connectionMode} fallbackLabel="In-Memory" />

      <div className="card">
        <h2>Add Event</h2>
        <div className="form-column">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="form-input"
          />
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-input"
          />
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="form-input"
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="form-input"
          />
          <button
            className="button"
            onClick={handleAdd}
            disabled={!title || !startDate || !endDate}
          >
            Add to Calendar
          </button>
        </div>
        {addEvent.data && (
          <div className="result success">Event created (id: {addEvent.data.id})</div>
        )}
      </div>

      <div className="card">
        <h2>This Month</h2>
        <button className="button button-secondary" onClick={handleGetEvents}>
          Load Events
        </button>
        {events.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            {events.map((evt: { id: string; title: string; startDate: string }) => (
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

      <ActionError error={error} />
    </div>
  );
}

export default CalendarPage;
