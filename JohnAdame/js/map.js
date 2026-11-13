export function unwrapPacificLng(lng) {
  if (lng === null || lng === undefined) return lng;
  return lng > 0 ? lng - 360 : lng;
}

export function computeRouteSegments(stops, activeStopIndex) {
  const unwrapped = stops.map(s => {
    let lng = s.lngUnwrapped !== undefined ? s.lngUnwrapped : unwrapPacificLng(s.lng);
    return { ...s, lng };
  });

  const completed = unwrapped.slice(0, activeStopIndex + 1);
  const upcoming = unwrapped.slice(activeStopIndex);

  return { completed, upcoming };
}

export function createMapController({ container, store, LRef, locations = [], stops = [], activeStopIndex = 0 }) {
  if (!LRef || !container) {
    return { map: null, updateTheme: () => {}, setActiveStop: () => {}, invalidateSize: () => {} };
  }

  // Ensure Leaflet resolves default marker icons locally
  if (LRef.Icon && LRef.Icon.Default) {
    LRef.Icon.Default.imagePath = 'vendor/leaflet/images/';
  }

  const map = LRef.map(container, {
    worldCopyJump: false,
    minZoom: 2,
    maxZoom: 10
  });
  map.setView([15, -160], 3);

  const CARTO_API_KEY = (typeof window !== 'undefined' && window.CARTO_API_KEY) || 'cb1_57rb_1_43aaa4e6914a3dbff56dacf9'; 
  const keyParam = CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : '';
  const darkUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png${keyParam}`;
  const lightUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png${keyParam}`;
  let currentTileLayer = null;
  const updateTheme = (theme) => {
    if (currentTileLayer) map.removeLayer(currentTileLayer);
    currentTileLayer = LRef.tileLayer(theme === 'dark' ? darkUrl : lightUrl, {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19
    });
    currentTileLayer.addTo(map);
  };

  // Determine active dataset
  const effectiveLocations = (locations && locations.length > 0)
    ? locations
    : Object.values(store?.getState()?.dataset?.locations || {});

  const effectiveStops = (stops && stops.length > 0)
    ? stops
    : (store?.getState()?.stops || store?.getState()?.dataset?.stops || []);

  let currentIndex = activeStopIndex || store?.getState()?.activeStopIndex || 0;

  // Render base markers
  effectiveLocations.forEach(loc => {
    const lat = loc.lat;
    const rawLng = loc.lngUnwrapped !== undefined ? loc.lngUnwrapped : loc.lng;
    if (lat !== undefined && lat !== null && rawLng !== undefined && rawLng !== null) {
      const adjLng = unwrapPacificLng(rawLng);

      const marker = LRef.marker([lat, adjLng]).addTo(map);
      if (marker && typeof marker.bindPopup === 'function') {
        const popupContent = `
          <div class="map-popup">
            <h4>${loc.name}</h4>
            ${loc.coordDisplay ? `<p>📍 ${loc.coordDisplay}</p>` : ''}
            ${loc.review ? `<p class="popup-review">"${loc.review}"</p>` : ''}
          </div>
        `;
        marker.bindPopup(popupContent);
      }
    }
  });

  // Render polylines
  const { completed, upcoming } = computeRouteSegments(effectiveStops, currentIndex);
  const completedPolyline = LRef.polyline(
    completed.map(s => [s.lat, s.lng]),
    { color: '#f59e0b', weight: 3.5, opacity: 0.9 }
  ).addTo(map);

  const upcomingPolyline = LRef.polyline(
    upcoming.map(s => [s.lat, s.lng]),
    { color: '#64748b', weight: 2, opacity: 0.5, dashArray: '5, 8' }
  ).addTo(map);

  // Active stop marker
  let activeMarker = null;
  if (effectiveStops.length > 0 && currentIndex >= 0 && currentIndex < effectiveStops.length) {
    const activeStop = effectiveStops[currentIndex];
    const rawLng = activeStop.lngUnwrapped !== undefined ? activeStop.lngUnwrapped : activeStop.lng;
    const adjLng = unwrapPacificLng(rawLng);

    activeMarker = LRef.circleMarker([activeStop.lat, adjLng], {
      radius: 9,
      fillColor: activeStop.isInterpolated ? '#38bdf8' : '#ef4444',
      color: '#ffffff',
      weight: 2.5,
      fillOpacity: 1
    }).addTo(map);
  }

  const setActiveStop = (index) => {
    if (!effectiveStops || effectiveStops.length === 0 || index < 0 || index >= effectiveStops.length) return;
    currentIndex = index;
    const stop = effectiveStops[index];
    const rawLng = stop.lngUnwrapped !== undefined ? stop.lngUnwrapped : stop.lng;
    const adjLng = unwrapPacificLng(rawLng);

    if (activeMarker && typeof activeMarker.setLatLng === 'function') {
      activeMarker.setLatLng([stop.lat, adjLng]);
      if (typeof activeMarker.setStyle === 'function') {
        activeMarker.setStyle({
          fillColor: stop.isInterpolated ? '#38bdf8' : '#ef4444'
        });
      }
    }

    const segments = computeRouteSegments(effectiveStops, currentIndex);
    if (completedPolyline && typeof completedPolyline.setLatLngs === 'function') {
      completedPolyline.setLatLngs(segments.completed.map(s => [s.lat, s.lng]));
    }
    if (upcomingPolyline && typeof upcomingPolyline.setLatLngs === 'function') {
      upcomingPolyline.setLatLngs(segments.upcoming.map(s => [s.lat, s.lng]));
    }

    if (map && typeof map.panTo === 'function') {
      map.panTo([stop.lat, adjLng]);
    }
  };

  if (store && typeof store.subscribe === 'function') {
    let lastTheme = store.getState().theme;
    let lastIndex = store.getState().activeStopIndex;

    store.subscribe(() => {
      const state = store.getState();
      if (state.theme !== lastTheme) {
        lastTheme = state.theme;
        updateTheme(lastTheme);
      }
      if (state.activeStopIndex !== lastIndex) {
        lastIndex = state.activeStopIndex;
        setActiveStop(lastIndex);
      }
    });
  }

  updateTheme(store?.getState()?.theme || 'dark');

  // Trigger size invalidation to ensure tiles load when layout finishes
  if (typeof setTimeout === 'function') {
    setTimeout(() => {
      if (map && typeof map.invalidateSize === 'function') {
        map.invalidateSize();
      }
    }, 100);
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', () => {
      if (map && typeof map.invalidateSize === 'function') {
        map.invalidateSize();
      }
    });
  }

  return {
    map,
    updateTheme,
    setActiveStop,
    invalidateSize: () => {
      if (map && typeof map.invalidateSize === 'function') {
        map.invalidateSize();
      }
    }
  };
}
