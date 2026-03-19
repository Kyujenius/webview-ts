import { useState } from 'react';
import { usePlugin, useBridge } from '../bridge';
import { phone } from '@example/plugins';
import ModeBadge from '../components/ModeBadge';
import ActionError from '../components/ActionError';

function PhonePage() {
  const { connectionMode } = useBridge();
  const { call } = usePlugin(phone);
  const [number, setNumber] = useState('');

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
      <ModeBadge connectionMode={connectionMode} />

      <div className="card">
        <input
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Phone number"
          className="dial-input"
        />

        <div className="dial-grid">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
            <button
              key={digit}
              className="button button-secondary"
              onClick={() => handleDigit(digit)}
            >
              {digit}
            </button>
          ))}
        </div>

        <div className="button-group">
          <button className="button button-call" onClick={handleCall} disabled={!number}>
            Call
          </button>
          <button className="button button-secondary" onClick={handleDelete} disabled={!number}>
            Delete
          </button>
        </div>
      </div>

      {call.data && <div className="result success">Dialing {number}...</div>}
      <ActionError error={call.error} />
    </div>
  );
}

export default PhonePage;
