import { useState } from 'react';
import { usePlugin, useBridge } from '../bridge';
import { share } from '@example/plugins';

function SharePage() {
  const { connectionMode } = useBridge();
  const { share: doShare } = usePlugin(share);
  const [title, setTitle] = useState('Check this out!');
  const [message, setMessage] = useState('Hello from webview-ts');
  const [url, setUrl] = useState('https://github.com');
  const [result, setResult] = useState<{ shared: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    try {
      setError(null);
      const res = await doShare({
        title: title || undefined,
        message: message || undefined,
        url: url || undefined,
      });
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <h1>Share Plugin</h1>
      <p className="mode-badge">
        {connectionMode === 'native'
          ? 'Native Bridge'
          : connectionMode === 'fallback'
            ? 'Fallback (Web Share API)'
            : 'Disconnected'}
      </p>

      <div className="card">
        <h2>Share Content</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            style={{ padding: '8px' }}
          />
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            style={{ padding: '8px' }}
          />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL"
            style={{ padding: '8px' }}
          />
        </div>
        <button onClick={handleShare}>Share</button>

        {result && (
          <div className="result" style={{ marginTop: '1rem' }}>
            {result.shared ? 'Shared successfully!' : 'Share was cancelled'}
          </div>
        )}
      </div>

      {error && <div className="result error">{error}</div>}
    </div>
  );
}

export default SharePage;
