import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Load dataset
const dataset = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'journal.json'), 'utf8'));

describe('E2E App Smoke Test (Browser Loading Simulation)', () => {
  test('index.html loads dataset and app module without script errors', () => {
    const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    assert.match(html, /vendor\/leaflet\/leaflet\.css/, 'Leaflet CSS must be linked');
    assert.match(html, /vendor\/leaflet\/leaflet\.js/, 'Leaflet JS must be loaded');
    assert.match(html, /data\/journal-data\.js/, 'journal-data.js must be loaded');
    assert.match(html, /type="module"\s+src="js\/app\.js"/, 'js/app.js module must be loaded');
  });

  test('app initializes DOM elements and renders story desk, timeline, poster wall, and journal table', async () => {
    // Setup Mock DOM
    const listeners = new Map();
    const createElement = (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        dataset: {},
        attributes: {},
        children: [],
        classList: {
          add(c) { el.className = (el.className || '') + ' ' + c; },
          remove(c) { el.className = (el.className || '').replace(new RegExp(`\\b${c}\\b`, 'g'), '').trim(); },
          contains(c) { return (el.className || '').includes(c); }
        },
        setAttribute(k, v) { el.attributes[k] = v; },
        getAttribute(k) { return el.attributes[k]; },
        addEventListener(event, fn) {
          if (!listeners.has(el)) listeners.set(el, {});
          const l = listeners.get(el);
          if (!l[event]) l[event] = [];
          l[event].push(fn);
        },
        querySelector(selector) {
          if (selector === '#map-canvas') return domElements['map-canvas'];
          if (selector === '#story-desk') return domElements['story-desk'];
          if (selector === '#timeline-dock') return domElements['timeline-dock'];
          if (selector === '#poster-wall-container') return domElements['poster-wall-container'];
          if (selector === '#journal-table-container') return domElements['journal-table-container'];
          if (selector === '#theme-toggle-btn') return domElements['theme-toggle-btn'];
          if (selector === '#view-story') return domElements['view-story'];
          if (selector === '#view-posters') return domElements['view-posters'];
          if (selector === '#view-journal') return domElements['view-journal'];
          if (selector === 'input[type="range"]') return createElement('INPUT');
          if (selector === '.play-btn') return createElement('BUTTON');
          if (selector.startsWith('.')) {
            const cls = selector.slice(1);
            if (el.innerHTML.includes(`class="${cls}"`)) return createElement('DIV');
          }
          return null;
        },
        querySelectorAll(selector) {
          if (selector === '.nav-tab') return [domElements['tab-story'], domElements['tab-posters'], domElements['tab-journal']];
          if (selector === '.chapter-btn') return [createElement('BUTTON'), createElement('BUTTON'), createElement('BUTTON'), createElement('BUTTON')];
          if (selector === '.poster-card') return [createElement('DIV')];
          if (selector === 'tr[data-entry-id]') return [createElement('TR')];
          return [];
        }
      };
      return el;
    };

    const domElements = {
      'map-canvas': createElement('DIV'),
      'story-desk': createElement('DIV'),
      'timeline-dock': createElement('DIV'),
      'poster-wall-container': createElement('DIV'),
      'journal-table-container': createElement('DIV'),
      'view-story': createElement('SECTION'),
      'view-posters': createElement('SECTION'),
      'view-journal': createElement('SECTION'),
      'theme-toggle-btn': createElement('BUTTON'),
      'tab-story': createElement('BUTTON'),
      'tab-posters': createElement('BUTTON'),
      'tab-journal': createElement('BUTTON')
    };

    domElements['tab-story'].dataset.view = 'story';
    domElements['tab-posters'].dataset.view = 'posters';
    domElements['tab-journal'].dataset.view = 'journal';

    const mockDoc = {
      documentElement: { dataset: {} },
      getElementById(id) { return domElements[id] || null; },
      querySelectorAll(sel) {
        if (sel === '.nav-tab') return [domElements['tab-story'], domElements['tab-posters'], domElements['tab-journal']];
        return [];
      },
      addEventListener(evt, fn) {}
    };

    const mockL = {
      map() {
        return {
          setView() { return this; },
          panTo() {},
          invalidateSize() {},
          removeLayer() {}
        };
      },
      tileLayer() { return { addTo() { return this; } }; },
      marker() { return { addTo() { return this; }, bindPopup() { return this; } }; },
      circleMarker() { return { addTo() { return this; }, setLatLng() {}, setStyle() {} }; },
      polyline() { return { addTo() { return this; }, setLatLngs() {} }; }
    };

    const mockWin = {
      L: mockL,
      JOHN_ADAME_DATA: dataset
    };

    const { initApp } = await import('../js/app.js');
    const store = initApp(mockDoc, mockWin);

    // Verify initial store initialization
    assert.ok(store, 'Store must be initialized');
    assert.equal(store.getState().activeStopIndex, 0);
    assert.equal(store.getState().totalStops, 380);

    // Verify story desk rendered stop 0 (Fort Leavenworth, Arrived Ft. Leavenworth)
    const storyHtml = domElements['story-desk'].innerHTML;
    assert.ok(storyHtml.includes('Fort Leavenworth'), 'Story desk must render Fort Leavenworth');
    assert.ok(storyHtml.includes('Arrived Ft. Leavenworth'), 'Story desk must render first journal note');

    // Verify timeline dock rendered chapters and scrubber
    const timelineHtml = domElements['timeline-dock'].innerHTML;
    assert.ok(timelineHtml.includes('US Training'), 'Timeline must render chapter 1');
    assert.ok(timelineHtml.includes('timeline-scrubber'), 'Timeline must render scrubber');

    // Verify poster wall rendered films
    const posterHtml = domElements['poster-wall-container'].innerHTML;
    assert.ok(posterHtml.includes('Casablanca'), 'Poster wall must include Casablanca');
    assert.ok(posterHtml.includes('poster-card'), 'Poster wall must contain poster cards');

    // Verify journal table rendered entries
    const tableHtml = domElements['journal-table-container'].innerHTML;
    assert.ok(tableHtml.includes('journal-table'), 'Journal index must contain journal table');
    assert.ok(tableHtml.includes('Fort Leavenworth'), 'Journal table must contain first entry');
  });
});
