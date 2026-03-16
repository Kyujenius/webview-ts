import { useState } from 'react';
import { usePlugin, useBridge } from '../bridge';
import { clipboard } from '@example/plugins';

function ClipboardPage() {
  const { connectionMode } = useBridge();
  const { call } = usePlugin(clipboard);
  const [text, setText] = useState('');
  const [clipboardText, setClipboardText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      setError(null);
      await call('setText', { text });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handlePaste = async () => {
    try {
      setError(null);
      const result = await call('getText', undefined);
      setClipboardText(result.text);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <h1>Clipboard Plugin</h1>
      <p className="mode-badge">
        {connectionMode === 'native'
          ? 'Native Bridge'
          : connectionMode === 'fallback'
            ? 'Fallback (In-Memory)'
            : 'Disconnected'}
      </p>

      <div className="card">
        <h2>Copy to Clipboard</h2>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to copy..."
          style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
        />
        <button onClick={handleCopy} disabled={!text}>
          Copy
        </button>
      </div>

      <div className="card">
        <h2>Paste from Clipboard</h2>
        <button onClick={handlePaste}>Paste</button>
        {clipboardText !== null && (
          <div className="result" style={{ marginTop: '1rem' }}>
            <strong>Clipboard content:</strong> {clipboardText || '(empty)'}
          </div>
        )}
      </div>

      {error && <div className="result error">{error}</div>}
    </div>
  );
}

export default ClipboardPage;
