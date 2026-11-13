export function renderTimelineMarkup(state) {
  const stopIndex = state.activeStopIndex !== undefined ? state.activeStopIndex : (state.currentStopIndex !== undefined ? state.currentStopIndex : 0);
  const stops = state.stops || [];
  const totalStops = stops.length > 0 ? stops.length : (state.totalStops !== undefined ? state.totalStops : 380);
  const chapters = state.chapters || (state.dataset && state.dataset.chapters) || [];
  const activeStop = state.activeStop || (stops.length > 0 ? stops[stopIndex] : null) || {};
  const activeDate = state.activeDate || activeStop.date || '';
  const activeLocation = state.activeLocation || activeStop.location || '';
  const isPlaying = state.isPlaying || false;

  return `
    <div class="timeline-component">
      <div class="chapters-band">
        ${chapters.map((ch, i) => `<button class="chapter-btn" data-chapter-index="${i}">${typeof ch === 'string' ? ch : (ch.title || ch.name || 'Chapter ' + (i + 1))}</button>`).join('')}
      </div>
      <div class="timeline-controls">
        <button class="control-btn" data-action="prev">⏮</button>
        <button class="control-btn play-btn" data-action="play">${isPlaying ? 'Pause' : 'Play'}</button>
        <button class="control-btn" data-action="next">⏭</button>
        <span class="stop-counter">Stop ${stopIndex + 1} of ${totalStops}</span>
        <span class="active-info">${activeDate} ${activeLocation ? '- ' + activeLocation : ''}</span>
      </div>
      <div class="timeline-scrubber-wrapper">
        <input type="range" min="0" max="${totalStops - 1}" value="${stopIndex}" class="timeline-scrubber" />
      </div>
    </div>
  `;
}

export function createTimelineController({ container, store, intervalMs = 1000 }) {
  let timerId = null;

  const update = () => {
    if (!container) return;
    const state = store.getState();
    container.innerHTML = renderTimelineMarkup(state);
    wireEvents();
    managePlayback(state);
  };

  const wireEvents = () => {
    if (!container) return;
    const scrubber = container.querySelector('input[type="range"]') || (container.querySelectorByTag && container.querySelectorByTag('INPUT'));
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && store.setStopIndex) {
          store.setStopIndex(val);
        }
      });
      scrubber.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && store.setStopIndex) {
          store.setStopIndex(val);
        }
      });
    }

    const buttons = container.querySelectorAll ? container.querySelectorAll('button') : [];
    // If mock DOM or real DOM elements need event listeners on buttons
    const playBtn = container.querySelector('.play-btn') || (container.querySelectorByClass && container.querySelectorByClass('play-btn'));
    if (playBtn && typeof playBtn.addEventListener === 'function') {
      playBtn.addEventListener('click', () => {
        if (store.togglePlayback) {
          store.togglePlayback();
        } else if (store.setState) {
          const state = store.getState();
          store.setState({ isPlaying: !state.isPlaying });
        }
      });
    }

    const prevBtn = container.querySelector('[data-action="prev"]');
    if (prevBtn && typeof prevBtn.addEventListener === 'function') {
      prevBtn.addEventListener('click', () => {
        const state = store.getState();
        const current = state.activeStopIndex !== undefined ? state.activeStopIndex : 0;
        store.setStopIndex(Math.max(0, current - 1));
      });
    }

    const nextBtn = container.querySelector('[data-action="next"]');
    if (nextBtn && typeof nextBtn.addEventListener === 'function') {
      nextBtn.addEventListener('click', () => {
        const state = store.getState();
        const current = state.activeStopIndex !== undefined ? state.activeStopIndex : 0;
        const total = (state.stops && state.stops.length) || 380;
        store.setStopIndex(Math.min(total - 1, current + 1));
      });
    }

    if (container.querySelectorAll) {
      container.querySelectorAll('.chapter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.chapterIndex, 10);
          if (store.setChapter) store.setChapter(idx);
        });
      });
    }
  };

  const managePlayback = (state) => {
    if (state.isPlaying) {
      if (!timerId) {
        timerId = setInterval(() => {
          const currentState = store.getState();
          const currentIndex = currentState.activeStopIndex !== undefined ? currentState.activeStopIndex : 0;
          const stops = currentState.stops || [];
          const total = stops.length > 0 ? stops.length : 380;
          if (currentIndex + 1 < total) {
            store.setStopIndex(currentIndex + 1);
          } else {
            if (store.togglePlayback) store.togglePlayback();
            else if (store.setState) store.setState({ isPlaying: false });
          }
        }, intervalMs);
      }
    } else {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    }
  };

  if (store && typeof store.subscribe === 'function') {
    store.subscribe(() => {
      update();
    });
  }

  update();

  return {
    destroy: () => {
      if (timerId) clearInterval(timerId);
    }
  };
}
