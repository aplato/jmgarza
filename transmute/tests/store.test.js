import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/store.js';

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

test('theme defaults to saved state if present or falls back to prefersDark', () => {
  const s1 = createStore({ storage: createMemoryStorage(), prefersDark: () => true });
  assert.equal(s1.getTheme(), 'dark');

  const s2 = createStore({ storage: createMemoryStorage(), prefersDark: () => false });
  assert.equal(s2.getTheme(), 'light');

  const s3 = createStore({
    storage: createMemoryStorage({ 'transmute.theme': 'light' }),
    prefersDark: () => true,
  });
  assert.equal(s3.getTheme(), 'light');
  assert.equal(s3.toggleTheme(), 'dark');
  assert.equal(s3.getTheme(), 'dark');
});

test('favorites persist in order, deduplicate, and support reorderFavorites and moveFavorite', () => {
  const storage = createMemoryStorage();
  const store = createStore({ storage });

  store.toggleFavorite('seed-a');
  store.toggleFavorite('seed-b');
  store.toggleFavorite('seed-c');
  assert.deepEqual(store.getFavorites(), ['seed-a', 'seed-b', 'seed-c']);

  // Move 'seed-c' to index 0
  assert.deepEqual(store.reorderFavorites(2, 0), ['seed-c', 'seed-a', 'seed-b']);
  // Move 'seed-a' right by 1
  assert.deepEqual(store.moveFavorite('seed-a', 1), ['seed-c', 'seed-b', 'seed-a']);
  // Out-of-bounds reorder is a safe no-op
  assert.deepEqual(store.reorderFavorites(-1, 99), ['seed-c', 'seed-b', 'seed-a']);

  // Unfavorite 'seed-b'
  store.toggleFavorite('seed-b');
  assert.deepEqual(store.getFavorites(), ['seed-c', 'seed-a']);
});

test('corrupted localStorage JSON recovers gracefully to empty list', () => {
  const storage = createMemoryStorage({ 'transmute.favorites': '{bad-json' });
  const store = createStore({ storage });
  assert.deepEqual(store.getFavorites(), []);
});

