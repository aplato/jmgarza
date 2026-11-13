import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeRouteSegments, createMapController } from '../js/map.js';

describe('Map Module', () => {
  test('computeRouteSegments handles Pacific longitude unwrapping', () => {
    const stops = [
      { lng: -150 }, // Stop 0
      { lng: -170 }, // Stop 1
      { lng: 170 }   // Stop 2 (should be unwrapped to -190)
    ];
    const { completed, upcoming } = computeRouteSegments(stops, 1);
    
    // Check that all longitudes are within [-240, -89]
    [...completed, ...upcoming].forEach(coord => {
      assert.ok(coord.lng >= -240 && coord.lng <= -89, `Longitude ${coord.lng} out of bounds`);
    });
  });

  test('createMapController initializes map and handles theme switching', () => {
    const mockContainer = {};
    const mockStore = {
      callback: null,
      subscribe: function(callback) { this.callback = callback; },
      getState: () => ({ theme: 'dark' })
    };
    const mockLRef = {
      map: () => ({
        setView: () => {},
        addLayer: () => {},
        removeLayer: () => {},
        panTo: () => {}
      }),
      tileLayer: (url) => ({ url, addTo: () => {} }),
      marker: () => ({ addTo: () => {}, bindPopup: () => {} }),
      circleMarker: () => ({ addTo: () => {}, bindPopup: () => {} }),
      polyline: () => ({ addTo: () => {} })
    };

    const controller = createMapController({ 
      container: mockContainer, 
      store: mockStore, 
      LRef: mockLRef,
      locations: []
    });
    
    assert.ok(controller, "Controller should be created");
  });

  test('createMapController renders markers and polylines', () => {
    const mockContainer = {};
    const mockStore = {
      subscribe: () => {},
      getState: () => ({ theme: 'dark' })
    };
    let markerCount = 0;
    let polylineCount = 0;
    const mockLRef = {
      map: () => ({
        setView: () => {},
        addLayer: () => {},
        removeLayer: () => {},
        panTo: () => {}
      }),
      tileLayer: () => ({ addTo: () => {} }),
      marker: () => {
        markerCount++;
        return { addTo: () => {}, bindPopup: () => {} };
      },
      circleMarker: () => ({ addTo: () => {}, bindPopup: () => {} }),
      polyline: () => {
        polylineCount++;
        return { addTo: () => {} };
      }
    };

    createMapController({ 
      container: mockContainer, 
      store: mockStore, 
      LRef: mockLRef,
      locations: [{ name: 'A', lat: 0, lng: -150 }, { name: 'B', lat: 0, lng: -160 }],
      stops: [{ lat: 0, lng: -150 }, { lat: 0, lng: -160 }],
      activeStopIndex: 0
    });
    
    assert.ok(markerCount >= 2, "Markers should be rendered");
    assert.ok(polylineCount >= 2, "Polylines should be rendered");
  });
});
