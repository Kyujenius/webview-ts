import { useState } from 'react';
import { usePlugin, useBridge } from '../bridge';
import { share } from '@example/plugins';
import ModeBadge from '../components/ModeBadge';
import ActionError from '../components/ActionError';

function SharePage() {
  const { connectionMode } = useBridge();
  const { share: doShare } = usePlugin(share);
  const [title, setTitle] = useState('Check this out!');
  const [message, setMessage] = useState('Hello from webview-ts');
  const [url, setUrl] = useState('https://github.com');

  const handleShare = () =>
    doShare.execute({
      title: title || undefined,
      message: message || undefined,
      url: url || undefined,
    });

  return (
    <div>
      <h1>Share Plugin</h1>
      <ModeBadge connectionMode={connectionMode} fallbackLabel="Web Share API" />

      <div className="card">
        <h2>Share Content</h2>
        <div className="form-column" style={{ marginBottom: '12px' }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="form-input"
          />
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            className="form-input"
          />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL"
            className="form-input"
          />
        </div>
        <button onClick={handleShare}>Share</button>

        {doShare.data && (
          <div className="result" style={{ marginTop: '1rem' }}>
            {doShare.data.shared ? 'Shared successfully!' : 'Share was cancelled'}
          </div>
        )}
      </div>

      <ActionError error={doShare.error} />
    </div>
  );
}

export default SharePage;
