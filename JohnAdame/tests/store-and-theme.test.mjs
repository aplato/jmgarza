import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../js/store.js';
import { resolveInitialTheme } from '../js/theme.js';
import { resolvePosterSrc } from '../js/poster-fallback.js';

describe('Store and Theme Engine', () => {
  it('should clamp stop index between 0 and 379', () => {
    store.setStopIndex(-5);
    assert.strictEqual(store.state.activeStopIndex, 0);
    store.setStopIndex(400);
    assert.strictEqual(store.state.activeStopIndex, 379);
  });

  it('should switch view and set stop index on selectMovieAndJump', () => {
    store.selectMovieAndJump(10);
    assert.strictEqual(store.state.activeStopIndex, 10);
    assert.strictEqual(store.state.activeView, 'story');
  });

  it('should resolve theme correctly', () => {
    // Mocking localStorage and matchMedia would be needed in a real browser env,
    // but we test the logic interface here.
    const theme = resolveInitialTheme();
    assert.ok(['light', 'dark'].includes(theme));
  });

  it('should return SVG data URI for missing poster', () => {
    const src = resolvePosterSrc('N/A');
    assert.ok(src.startsWith('data:image/svg+xml'));
  });
});
