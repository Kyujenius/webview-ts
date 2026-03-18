import { useState } from 'react';
import { usePlugin, useBridge } from '../bridge';
import { phone } from '@example/plugins';

function PhonePage() {
  const { connectionMode } = useBridge();
  const { call } = usePlugin(phone);
  const [number, setNumber] = useState('01058204625');

  const handleCall = () => call.execute({ number });

  const handleDigit = (digit: string) => {
    setNumber((prev) => prev + digit);
  };

  const handleDelete = () => {
    setNumber((prev) => prev.slice(0, -1));
  };

  return (
    <div>
      <h1>Phone</h1>
      <p className="mode-badge">
        {connectionMode === 'native'
          ? 'Native Bridge'
          : connectionMode === 'fallback'
            ? 'Fallback'
            : 'Disconnected'}
      </p>

      <div className="card">
        <input
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Phone number"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '1.5rem',
            textAlign: 'center',
            border: '1px solid #ddd',
            borderRadius: '8px',
            marginBottom: '12px',
            fontFamily: 'monospace',
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
            <button
              key={digit}
              className="button button-secondary"
              onClick={() => handleDigit(digit)}
              style={{ padding: '14px', fontSize: '1.1rem' }}
            >
              {digit}
            </button>
          ))}
        </div>

        <div className="button-group">
          <button
            className="button"
            onClick={handleCall}
            disabled={!number}
            style={{ background: '#22c55e' }}
          >
            Call
          </button>
          <button className="button button-secondary" onClick={handleDelete} disabled={!number}>
            Delete
          </button>
        </div>
      </div>

      {call.data && <div className="result success">Dialing {number}...</div>}
      {call.error && <div className="result error">{call.error.message}</div>}
    </div>
  );
}

export default PhonePage;
