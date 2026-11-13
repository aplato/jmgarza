import { test } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../js/store.js';

test('store should support pub/sub', () => {
  let callCount = 0;
  const unsubscribe = store.subscribe(() => {
    callCount++;
  });
  
  store.setState({ theme: 'dark' });
  assert.strictEqual(callCount, 1, 'Subscriber should be called on state change');
  
  unsubscribe();
  store.setState({ theme: 'light' });
  assert.strictEqual(callCount, 1, 'Subscriber should not be called after unsubscribe');
});
