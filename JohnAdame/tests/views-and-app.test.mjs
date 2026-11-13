import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { filterMovieEntries } from '../js/poster-wall.js';
import { filterJournalEntries } from '../js/journal-table.js';
import { handleGlobalKeydown } from '../js/app.js';

describe('Movie Poster Wall & Journal Index', () => {
  test('filterMovieEntries filters correctly', () => {
    const entries = [{ title: 'Matrix' }, { title: 'Inception' }];
    const result = filterMovieEntries(entries, 'Matrix');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'Matrix');
  });

  test('filterJournalEntries filters correctly', () => {
    const entries = [{ note: 'Good' }, { note: 'Bad' }];
    const result = filterJournalEntries(entries, 'Good');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].note, 'Good');
  });
});

describe('App Global Navigation', () => {
  test('handleGlobalKeydown ignores inputs', () => {
    const mockStore = { setStopIndex: () => {} };
    const event = {
      key: 'ArrowRight',
      target: { tagName: 'INPUT' },
      preventDefault: () => {}
    };
    // Should not throw or trigger navigation
    assert.doesNotThrow(() => handleGlobalKeydown(event, mockStore));
  });

  test('handleGlobalKeydown processes navigation on body', () => {
    const mockStore = { 
      state: { activeStopIndex: 0 },
      setStopIndex(i) { this.state.activeStopIndex = i; }
    };
    const event = {
      key: 'ArrowRight',
      target: { tagName: 'BODY' },
      preventDefault: () => {}
    };
    handleGlobalKeydown(event, mockStore);
    assert.strictEqual(mockStore.state.activeStopIndex, 1);
  });
});
