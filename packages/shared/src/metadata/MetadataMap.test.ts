import { describe, it, expect } from 'vitest';
import { createMetadataKey, MetadataMap } from './MetadataMap';

describe('createMetadataKey', () => {
  it('returns an object with the given key string', () => {
    const k = createMetadataKey<number>('myKey');
    expect(k.key).toBe('myKey');
  });

  it('two keys with the same string are structurally equal', () => {
    const a = createMetadataKey<string>('same');
    const b = createMetadataKey<number>('same');
    expect(a.key).toBe(b.key);
  });

  it('two keys with different strings are distinct', () => {
    const a = createMetadataKey<string>('foo');
    const b = createMetadataKey<string>('bar');
    expect(a.key).not.toBe(b.key);
  });
});

describe('MetadataMap', () => {
  describe('typed key set / get / has / delete', () => {
    it('stores and retrieves a typed value', () => {
      const map = new MetadataMap();
      const key = createMetadataKey<number>('count');
      map.set(key, 42);
      expect(map.get(key)).toBe(42);
    });

    it('returns undefined for a key that was never set', () => {
      const map = new MetadataMap();
      const key = createMetadataKey<string>('missing');
      expect(map.get(key)).toBeUndefined();
    });

    it('has() returns true after set and false before', () => {
      const map = new MetadataMap();
      const key = createMetadataKey<boolean>('flag');
      expect(map.has(key)).toBe(false);
      map.set(key, true);
      expect(map.has(key)).toBe(true);
    });

    it('delete() removes the entry and returns true', () => {
      const map = new MetadataMap();
      const key = createMetadataKey<string>('token');
      map.set(key, 'abc');
      expect(map.delete(key)).toBe(true);
      expect(map.has(key)).toBe(false);
      expect(map.get(key)).toBeUndefined();
    });

    it('delete() returns false when key does not exist', () => {
      const map = new MetadataMap();
      const key = createMetadataKey<string>('ghost');
      expect(map.delete(key)).toBe(false);
    });

    it('overwrites an existing typed value', () => {
      const map = new MetadataMap();
      const key = createMetadataKey<number>('n');
      map.set(key, 1);
      map.set(key, 99);
      expect(map.get(key)).toBe(99);
    });
  });

  describe('string key operations', () => {
    it('stores and retrieves a value with a plain string key', () => {
      const map = new MetadataMap();
      map.set('__mwLog:myMiddleware', { level: 'info' });
      expect(map.get('__mwLog:myMiddleware')).toEqual({ level: 'info' });
    });

    it('has() works with plain string keys', () => {
      const map = new MetadataMap();
      expect(map.has('dynamic')).toBe(false);
      map.set('dynamic', 123);
      expect(map.has('dynamic')).toBe(true);
    });

    it('delete() works with plain string keys', () => {
      const map = new MetadataMap();
      map.set('tmp', 'value');
      expect(map.delete('tmp')).toBe(true);
      expect(map.has('tmp')).toBe(false);
    });
  });

  describe('shared namespace between typed and string keys', () => {
    it('typed key and string key with the same string share the same slot', () => {
      const map = new MetadataMap();
      const key = createMetadataKey<number>('shared');
      map.set(key, 10);
      // reading via the raw string should see the same value
      expect(map.get('shared')).toBe(10);
    });

    it('writing via string key is visible through the typed key', () => {
      const map = new MetadataMap();
      const key = createMetadataKey<number>('shared');
      map.set('shared', 77);
      expect(map.get(key)).toBe(77);
    });

    it('deleting via typed key removes the string-key entry too', () => {
      const map = new MetadataMap();
      const key = createMetadataKey<string>('k');
      map.set('k', 'hello');
      map.delete(key);
      expect(map.has('k')).toBe(false);
    });
  });

  describe('size', () => {
    it('is 0 for a new map', () => {
      expect(new MetadataMap().size).toBe(0);
    });

    it('increments when new keys are added', () => {
      const map = new MetadataMap();
      map.set('a', 1);
      map.set('b', 2);
      expect(map.size).toBe(2);
    });

    it('does not change when the same key is overwritten', () => {
      const map = new MetadataMap();
      map.set('a', 1);
      map.set('a', 2);
      expect(map.size).toBe(1);
    });

    it('decrements when a key is deleted', () => {
      const map = new MetadataMap();
      map.set('a', 1);
      map.delete('a');
      expect(map.size).toBe(0);
    });
  });

  describe('keys()', () => {
    it('returns all inserted string keys', () => {
      const map = new MetadataMap();
      const k1 = createMetadataKey<number>('x');
      map.set(k1, 1);
      map.set('y', 2);
      expect([...map.keys()]).toEqual(['x', 'y']);
    });

    it('returns an empty iterator for a new map', () => {
      expect([...new MetadataMap().keys()]).toEqual([]);
    });
  });

  describe('entries()', () => {
    it('returns [key, value] pairs for all entries', () => {
      const map = new MetadataMap();
      map.set('foo', 'bar');
      map.set('num', 42);
      const result = [...map.entries()];
      expect(result).toEqual([
        ['foo', 'bar'],
        ['num', 42],
      ]);
    });

    it('returns an empty iterator for a new map', () => {
      expect([...new MetadataMap().entries()]).toEqual([]);
    });
  });

  describe('forEach()', () => {
    it('calls the callback for each entry with (value, key)', () => {
      const map = new MetadataMap();
      map.set('a', 1);
      map.set('b', 2);
      const collected: Array<[string, unknown]> = [];
      map.forEach((value, key) => collected.push([key, value]));
      expect(collected).toEqual([
        ['a', 1],
        ['b', 2],
      ]);
    });

    it('does not call the callback for an empty map', () => {
      const fn = vi.fn();
      new MetadataMap().forEach(fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });
});
