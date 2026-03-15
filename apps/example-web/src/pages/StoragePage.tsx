import { useState } from 'react';
import { StoragePlugin } from '@ts-bridge/plugins/storage';
import { useBridge } from '../hooks/useBridge';

function StoragePage() {
  const { bridge, isAvailable } = useBridge();
  const [storage] = useState(() => new StoragePlugin(bridge));
  const [key, setKey] = useState('test-key');
  const [value, setValue] = useState('test-value');
  const [result, setResult] = useState<string | null>(null);
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSetItem = async () => {
    setLoading(true);
    setError(null);

    try {
      await storage.setItem(key, value);
      setResult(`Successfully set "${key}" = "${value}"`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set item');
    } finally {
      setLoading(false);
    }
  };

  const handleGetItem = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const item = await storage.getItem(key);
      setResult(item !== null ? `Value: "${item}"` : 'Key not found');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get item');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async () => {
    setLoading(true);
    setError(null);

    try {
      await storage.removeItem(key);
      setResult(`Successfully removed "${key}"`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    } finally {
      setLoading(false);
    }
  };

  const handleGetAllKeys = async () => {
    setLoading(true);
    setError(null);

    try {
      const keys = await storage.getAllKeys();
      setAllKeys(keys);
      setResult(`Found ${keys.length} keys`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get all keys');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all storage?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await storage.clear();
      setResult('Storage cleared successfully');
      setAllKeys([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear storage');
    } finally {
      setLoading(false);
    }
  };

  const handleSetJSON = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = { name: 'John Doe', age: 30, email: 'john@example.com' };
      await storage.setJSON('user', data);
      setResult(`Successfully stored JSON object in "user"`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set JSON');
    } finally {
      setLoading(false);
    }
  };

  const handleGetJSON = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await storage.getJSON<{ name: string; age: number; email: string }>(
        'user'
      );
      if (data) {
        setResult(JSON.stringify(data, null, 2));
      } else {
        setResult('Key "user" not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get JSON');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Storage Plugin</h1>

      {!isAvailable && (
        <div className="result error">
          <strong>Native bridge not available.</strong> Using in-memory storage
          fallback.
        </div>
      )}

      <div className="card">
        <h2>Key-Value Storage</h2>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Key:
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              style={{
                marginLeft: '0.5rem',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </label>
          <label style={{ display: 'block', marginTop: '0.5rem' }}>
            Value:
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{
                marginLeft: '0.5rem',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={handleSetItem} disabled={loading}>
            Set Item
          </button>
          <button
            className="button button-secondary"
            onClick={handleGetItem}
            disabled={loading}
          >
            Get Item
          </button>
          <button
            className="button button-secondary"
            onClick={handleRemoveItem}
            disabled={loading}
          >
            Remove Item
          </button>
        </div>
      </div>

      <div className="card">
        <h2>JSON Operations</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={handleSetJSON} disabled={loading}>
            Store JSON Object
          </button>
          <button
            className="button button-secondary"
            onClick={handleGetJSON}
            disabled={loading}
          >
            Retrieve JSON Object
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Bulk Operations</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={handleGetAllKeys} disabled={loading}>
            Get All Keys
          </button>
          <button
            className="button button-secondary"
            onClick={handleClear}
            disabled={loading}
          >
            Clear Storage
          </button>
        </div>
      </div>

      {error && (
        <div className="result error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="result success">
          <strong>Result:</strong>
          <pre>{result}</pre>
        </div>
      )}

      {allKeys.length > 0 && (
        <div className="card">
          <h2>All Keys ({allKeys.length})</h2>
          <div className="result">
            <ul style={{ marginLeft: '1.5rem' }}>
              {allKeys.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="card">
        <h2>API Reference</h2>
        <pre>{`const storage = new StoragePlugin(bridge);

// Basic operations
await storage.setItem('key', 'value');
const value = await storage.getItem('key');
await storage.removeItem('key');
await storage.clear();

// JSON operations
await storage.setJSON('user', { name: 'John', age: 30 });
const user = await storage.getJSON<User>('user');

// Bulk operations
const keys = await storage.getAllKeys();
await storage.multiSet([
  ['key1', 'value1'],
  ['key2', 'value2'],
]);
const values = await storage.multiGet(['key1', 'key2']);
await storage.multiRemove(['key1', 'key2']);`}</pre>
      </div>
    </div>
  );
}

export default StoragePage;
