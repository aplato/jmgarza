import { resolvePosterSrc } from './poster-fallback.js';
import { escapeHtml } from './utils.js';

export function renderStoryDeskMarkup(state) {
  const stopIndex = state.activeStopIndex !== undefined ? state.activeStopIndex : (state.currentStopIndex !== undefined ? state.currentStopIndex : 0);
  const stop = state.stop || (state.stops && state.stops[stopIndex]) || state.activeStop || {};
  const date = stop.dateDisplay || stop.date || '';
  const location = stop.location || '';
  const isInterpolated = stop.isInterpolated;
  const notes = stop.notes;
  const moviesRaw = stop.movies || (stop.movie ? [stop.movie] : []);
  const moviesMeta = state.dataset?.movies || {};
  const locationReview = stop.locationReview || '';
  const descUrl = stop.descriptionUrl || '';
  const totalStops = state.totalStops || (state.stops ? state.stops.length : 380);

  // Normalize notes list
  const notesHtml = Array.isArray(notes)
    ? notes.filter(Boolean).map(n => `
        <div class="journal-note-card">
          <div class="note-tag">📓 Journal Note</div>
          <p class="journal-note-text">"${escapeHtml(n)}"</p>
        </div>
      `).join('')
    : (notes ? `
        <div class="journal-note-card">
          <div class="note-tag">📓 Journal Note</div>
          <p class="journal-note-text">"${escapeHtml(notes)}"</p>
        </div>
      ` : '');

  // Normalize movies list with metadata lookup
  const moviesHtml = moviesRaw.map(m => {
    const meta = (m.movieKey && moviesMeta[m.movieKey]) || {};
    const title = m.title || meta.title || 'Untitled Movie';
    const year = m.year || meta.year || '';
    const rating = m.rating || meta.imdbRating || '';
    const genre = m.genre || meta.genre || m.category || '';
    const runtime = m.runtime || meta.runtime || '';
    const plot = m.plot || meta.plot || '';
    const rawCast = m.cast || meta.actors || '';
    const cast = Array.isArray(rawCast) ? rawCast.join(', ') : rawCast;
    const director = m.director || meta.director || '';
    const movieNum = m.movieNumber || null;
    const posterSrc = resolvePosterSrc(meta.posterUrl || m.posterUrl || '', movieNum);

    return `
      <div class="movie-card" data-movie-key="${escapeHtml(m.movieKey || '')}">
        <div class="movie-poster-col">
          <img class="movie-poster-img" src="${posterSrc}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.onerror=null;this.src='${resolvePosterSrc('', movieNum)}';" />
          ${movieNum ? `<span class="badge movie-number-badge">Film #${movieNum}</span>` : ''}
        </div>
        <div class="movie-details-col">
          <h3 class="movie-title">${escapeHtml(title)} ${year ? `<span class="movie-year">(${year})</span>` : ''}</h3>
          <div class="movie-meta-row">
            ${rating ? `<span class="movie-rating">★ IMDb ${escapeHtml(rating)}</span>` : ''}
            ${runtime ? `<span class="movie-runtime">${escapeHtml(runtime)}</span>` : ''}
            ${genre ? `<span class="movie-genre">${escapeHtml(genre)}</span>` : ''}
          </div>
          ${plot ? `<p class="movie-plot">${escapeHtml(plot)}</p>` : ''}
          ${director ? `<p class="movie-crew"><strong>Director:</strong> ${escapeHtml(director)}</p>` : ''}
          ${cast ? `<p class="movie-cast"><strong>Cast:</strong> ${escapeHtml(cast)}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="story-desk-container">
      <div class="story-header">
        <div class="story-nav-pills">
          <button class="desk-nav-btn" data-action="prev" title="Previous entry (ArrowLeft)">◀ Previous</button>
          <span class="desk-counter">Stop ${stopIndex + 1} of ${totalStops}</span>
          <button class="desk-nav-btn" data-action="next" title="Next entry (ArrowRight)">Next ▶</button>
        </div>
        <h2 class="story-location">
          ${escapeHtml(location)}
          ${descUrl ? `<a href="${escapeHtml(descUrl)}" target="_blank" rel="noopener" class="location-link" title="Historical military base information">ℹ️ Info</a>` : ''}
        </h2>
        <div class="story-meta-row">
          <span class="story-date">📅 ${escapeHtml(date)}</span>
          ${stop.coordDisplay ? `<span class="story-coords">📍 ${escapeHtml(stop.coordDisplay)}</span>` : ''}
          ${isInterpolated ? '<span class="badge interpolated-badge">🚢 Interpolated at Sea</span>' : ''}
        </div>
      </div>

      ${locationReview ? `
        <div class="base-review-card">
          <div class="base-review-tag">⭐ Base Dispatch / Historical Context</div>
          <p class="base-review-text">"${escapeHtml(locationReview)}"</p>
        </div>
      ` : ''}

      <div class="story-notes-section">
        ${notesHtml ? notesHtml : '<p class="no-notes-placeholder">No written journal note for this date.</p>'}
      </div>

      <div class="story-movies-section">
        <div class="section-heading">🎬 Films Attended on This Date</div>
        ${moviesHtml ? moviesHtml : '<p class="no-movies-placeholder">No movie viewings recorded for this date.</p>'}
      </div>

      <div class="journal-scan-prompt">
        <span>Original physical journal pages photographed:</span>
        <a href="https://photos.app.goo.gl/hjhDGiVrYHD2E5WU8" target="_blank" rel="noopener" class="photos-btn">
          📷 Browse Google Photos Album ↗
        </a>
      </div>
    </div>
  `;
}

export function createStoryViewController({ container, modalContainer, store }) {
  const update = () => {
    if (!container) return;
    const state = store.getState();
    container.innerHTML = renderStoryDeskMarkup(state);
    wireEvents();
  };

  const wireEvents = () => {
    if (!container) return;
    const prevBtn = container.querySelector('[data-action="prev"]');
    const nextBtn = container.querySelector('[data-action="next"]');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const state = store.getState();
        store.setStopIndex(Math.max(0, state.activeStopIndex - 1));
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const state = store.getState();
        const total = state.totalStops || 380;
        store.setStopIndex(Math.min(total - 1, state.activeStopIndex + 1));
      });
    }
  };

  if (store && typeof store.subscribe === 'function') {
    store.subscribe(() => {
      update();
    });
  }

  update();

  return {
    destroy: () => {}
  };
}
