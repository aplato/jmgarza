import { createStore } from './store.js';
import { resolveInitialTheme, applyTheme } from './theme.js';
import { createMapController } from './map.js';
import { createTimelineController } from './timeline.js';
import { createStoryViewController } from './story-view.js';
import { createPosterWallController } from './poster-wall.js';
import { createJournalTableController } from './journal-table.js';

export function initApp(doc = document, win = window) {
  const initialTheme = resolveInitialTheme();
  applyTheme(initialTheme, doc);

  const dataset = win.JOHN_ADAME_DATA || {};
  const store = createStore(dataset, initialTheme);

  const mapContainer = doc.getElementById('map-canvas');
  const storyContainer = doc.getElementById('story-desk');
  const timelineContainer = doc.getElementById('timeline-dock') || doc.getElementById('app');
  const postersContainer = doc.getElementById('poster-wall-container') || doc.getElementById('app');
  const journalContainer = doc.getElementById('journal-table-container') || doc.getElementById('app');

  const mapController = createMapController({ 
    container: mapContainer, 
    store, 
    LRef: win.L,
    locations: Object.values(dataset.locations || {}),
    stops: store.state.stops,
    activeStopIndex: store.state.activeStopIndex
  });
  
  createTimelineController({ 
    container: timelineContainer, 
    store 
  });
  
  createStoryViewController({ 
    container: storyContainer, 
    store 
  });

  createPosterWallController({ 
    container: postersContainer, 
    store 
  });

  createJournalTableController({ 
    container: journalContainer, 
    store 
  });

  // View tabs navigation
  const viewPanels = {
    story: doc.getElementById('view-story'),
    posters: doc.getElementById('view-posters'),
    journal: doc.getElementById('view-journal')
  };

  const navTabs = doc.querySelectorAll ? doc.querySelectorAll('.nav-tab') : [];

  const updateViewUI = (activeView) => {
    Object.entries(viewPanels).forEach(([viewName, panel]) => {
      if (!panel) return;
      if (viewName === activeView) {
        panel.style.display = 'flex';
        panel.classList.add('active');
        if (viewName === 'story' && mapController && typeof mapController.invalidateSize === 'function') {
          setTimeout(() => mapController.invalidateSize(), 50);
        }
      } else {
        panel.style.display = 'none';
        panel.classList.remove('active');
      }
    });

    if (navTabs.forEach) {
      navTabs.forEach(tab => {
        if (tab.dataset.view === activeView) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
    }
  };

  if (navTabs.forEach) {
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetView = tab.dataset.view;
        if (targetView && store.setView) {
          store.setView(targetView);
        }
      });
    });
  }

  // Theme toggle button
  const themeBtn = doc.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = store.getState().theme || 'dark';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, doc);
      store.setTheme(nextTheme);
    });
  }

  store.subscribe((state) => {
    if (state.activeView) {
      updateViewUI(state.activeView);
    }
  });

  // Initial view sync
  updateViewUI(store.getState().activeView || 'story');

  if (mapController && typeof mapController.invalidateSize === 'function') {
    setTimeout(() => mapController.invalidateSize(), 150);
  }

  doc.addEventListener('keydown', (e) => handleGlobalKeydown(e, store));

  return store;
}

export function handleGlobalKeydown(event, store) {
  const ignoredTags = ['INPUT', 'SELECT', 'TEXTAREA'];
  if (event.target && ignoredTags.includes(event.target.tagName)) {
    return;
  }

  const state = store.getState ? store.getState() : store.state;
  const currentIndex = state.activeStopIndex !== undefined ? state.activeStopIndex : 0;
  const total = (state.stops && state.stops.length) || 380;

  if (event.key === 'ArrowRight') {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    store.setStopIndex(Math.min(total - 1, currentIndex + 1));
  } else if (event.key === 'ArrowLeft') {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    store.setStopIndex(Math.max(0, currentIndex - 1));
  } else if (event.key === ' ' || event.key === 'Space') {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (store.togglePlayback) {
      store.togglePlayback();
    } else if (store.setState) {
      store.setState({ isPlaying: !state.isPlaying });
    }
  }
}

// Auto-bootstrap in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initApp());
  } else {
    initApp();
  }
}
