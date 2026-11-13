import { test, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Minimal DOM Mocking for Node.js environment without JSDOM
const setupMockDOM = () => {
  const listeners = new Map();
  const elements = new Map();

  const createElement = (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      innerHTML: '',
      innerText: '',
      value: '',
      attributes: {},
      style: {},
      classList: {
        add: (cls) => { el.className = (el.className || '') + ' ' + cls; },
        remove: (cls) => { el.className = (el.className || '').replace(cls, ''); },
        contains: (cls) => (el.className || '').includes(cls)
      },
      setAttribute: (name, val) => { el.attributes[name] = val; },
      getAttribute: (name) => el.attributes[name],
      addEventListener: (event, cb) => {
        if (!listeners.has(el)) listeners.set(el, {});
        const elListeners = listeners.get(el);
        if (!elListeners[event]) elListeners[event] = [];
        elListeners[event].push(cb);
      },
      dispatchEvent: (event) => {
        const elListeners = listeners.get(el);
        if (elListeners && elListeners[event.type]) {
          elListeners[event.type].forEach(cb => cb(event));
        }
      },
      querySelector: (sel) => {
        // Very basic selector matching for tests
        if (sel === 'input[type="range"]') return el.querySelectorByTag('INPUT');
        if (sel === '.play-btn') return el.querySelectorByClass('play-btn');
        return null;
      },
      querySelectorAll: (sel) => [],
      // Helper for mock
      querySelectorByTag: (tag) => {
        if (el.innerHTML.includes(`<${tag.toLowerCase()}`)) return createElement(tag);
        return null;
      },
      querySelectorByClass: (cls) => {
        if (el.innerHTML.includes(`class="${cls}"`)) return createElement('DIV');
        return null;
      }
    };
    return el;
  };

  global.document = {
    createElement,
    body: createElement('BODY')
  };
  global.window = {
    setInterval: (fn, ms) => {
      return 123; // mock timer id
    },
    clearInterval: (id) => {}
  };
  global.CustomEvent = class {
    constructor(type, detail) {
      this.type = type;
      this.detail = detail;
    }
  };
};

setupMockDOM();

// Import the modules to test
import { createTimelineController } from '../js/timeline.js';
import { createStoryViewController } from '../js/story-view.js';

describe('CARD-009: Timeline & Story Desk Controllers', () => {
  let mockStore;
  let timelineContainer;
  let storyContainer;

  beforeEach(() => {
    timelineContainer = document.createElement('div');
    storyContainer = document.createElement('div');
    
    mockStore = {
      state: {
        activeStopIndex: 0,
        stops: [
          { date: '1943-02-09', location: 'Hospital', notes: 'Note 1', movies: [], isInterpolated: false },
          { date: '1943-02-10', location: 'At Sea', notes: 'Note 2', movies: [{ title: 'M1' }], isInterpolated: true }
        ],
        chapters: ['Chap 1', 'Chap 2'],
        isPlaying: false
      },
      subscribers: [],
      subscribe(cb) { this.subscribers.push(cb); },
      getState() { 
        return {
          ...this.state,
          activeStop: this.state.stops[this.state.activeStopIndex]
        };
      },
      setStopIndex(idx) { 
        this.state.activeStopIndex = idx;
        this.subscribers.forEach(cb => cb(this.getState()));
      },
      togglePlayback() {
        this.state.isPlaying = !this.state.isPlaying;
        this.subscribers.forEach(cb => cb(this.getState()));
      }
    };
  });

  describe('Timeline Controller', () => {
    it('should render timeline and respond to store changes', () => {
      const controller = createTimelineController({ 
        container: timelineContainer, 
        store: mockStore 
      });

      assert.ok(timelineContainer.innerHTML.includes('Hospital'), 'Should render initial location');
      
      mockStore.setStopIndex(1);
      assert.ok(timelineContainer.innerHTML.includes('At Sea'), 'Should update location on store change');
    });

    it('should have playback controls and scrubber', () => {
      createTimelineController({ 
        container: timelineContainer, 
        store: mockStore 
      });

      assert.ok(timelineContainer.innerHTML.includes('input'), 'Should have a scrubber input');
      assert.ok(timelineContainer.innerHTML.includes('button'), 'Should have control buttons');
    });
  });

  describe('Story View Controller', () => {
    it('should render story desk with notes and movies', () => {
      createStoryViewController({
        container: storyContainer,
        store: mockStore
      });

      assert.ok(storyContainer.innerHTML.includes('Note 1'), 'Should render notes');
      
      mockStore.setStopIndex(1);
      assert.ok(storyContainer.innerHTML.includes('Note 2'), 'Should update notes');
      assert.ok(storyContainer.innerHTML.includes('M1'), 'Should render movie title');
      assert.ok(storyContainer.innerHTML.includes('Interpolated'), 'Should show interpolated badge');
    });
  });
});
