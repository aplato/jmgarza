import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTimelineMarkup } from '../js/timeline.js';
import { renderStoryDeskMarkup } from '../js/story-view.js';

test('Timeline renders correct markup structure', () => {
  const state = {
    currentStopIndex: 50,
    totalStops: 380,
    chapters: ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4'],
    activeDate: '1943-02-09',
    activeLocation: 'Hospital'
  };
  
  const result = renderTimelineMarkup(state);
  assert.ok(result.includes('Chapter 1'), 'Should render chapter selector');
  assert.ok(result.includes('Stop 51 of 380'), 'Should render stop counter');
  assert.ok(result.includes('value="50"'), 'Should render scrubber with correct value');
});

test('Story Desk renders multi-entry stops and interpolated badge', () => {
  const state = {
    stop: {
      date: '1943-02-09',
      location: 'Hospital',
      isInterpolated: true,
      notes: ['Note 1', 'Note 2'],
      movies: [
        { title: 'Movie 1', rating: 'PG', plot: 'Plot 1', cast: ['Actor 1'] },
        { title: 'Movie 2', rating: 'R', plot: 'Plot 2', cast: ['Actor 2'] }
      ]
    }
  };

  const result = renderStoryDeskMarkup(state);
  assert.ok(result.includes('Interpolated at Sea'), 'Should display interpolated badge');
  assert.ok(result.includes('Note 1'), 'Should render first note');
  assert.ok(result.includes('Note 2'), 'Should render second note');
  assert.ok(result.includes('Movie 1'), 'Should render first movie');
  assert.ok(result.includes('Movie 2'), 'Should render second movie');
});
