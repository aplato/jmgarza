import { escapeHtml } from './utils.js';
import { resolvePosterSrc } from './poster-fallback.js';

function renderCardsHtml(filtered) {
  return filtered.map(movie => {
    const posterSrc = resolvePosterSrc(movie.posterUrl, movie.movieNumber);
    const movieNum = movie.movieNumber ? `#${movie.movieNumber}` : '';
    const yearStr = movie.year ? `(${escapeHtml(String(movie.year))})` : '';
    const locStr = movie.location ? escapeHtml(movie.location) : '';
    const genreStr = movie.category || movie.genre || '';

    return `
      <div class="poster-card" data-entry-id="${escapeHtml(String(movie.entryId))}" title="Click to view on map &amp; timeline">
        <div class="poster-card-img-wrap">
          <img src="${posterSrc}" alt="${escapeHtml(movie.title || '')}" loading="lazy" onerror="this.onerror=null;this.src='${resolvePosterSrc('', movie.movieNumber)}';" />
          ${movieNum ? `<span class="poster-card-badge">${movieNum}</span>` : ''}
        </div>
        <div class="poster-card-info">
          <h3 class="poster-card-title">${escapeHtml(movie.title || '')}</h3>
          <div class="poster-card-meta">
            ${yearStr ? `<span class="poster-year">${yearStr}</span>` : ''}
            ${genreStr ? `<span class="poster-genre">${escapeHtml(genreStr)}</span>` : ''}
          </div>
          ${locStr ? `<div class="poster-card-location">📍 ${locStr}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

export function renderPosterWallMarkup(state) {
  const movies = state.movies || [];
  const query = state.posterFilters?.query || '';
  const filtered = filterMovieEntries(movies, query);
  const postersHtml = renderCardsHtml(filtered);

  return `
    <div class="poster-wall">
      <div class="poster-wall-header">
        <h2>🎞️ World War II Cinema Chronicle (303 Films)</h2>
        <p class="poster-wall-subtitle">Every motion picture watched by John Adamé between February 1943 and November 1945 across 21 military bases and at sea.</p>
        <div class="controls">
          <input type="text" id="poster-search" placeholder="Search films by title, genre, actor, base..." value="${escapeHtml(query)}" autofocus>
          <p class="poster-count-tag">Showing ${filtered.length} of ${movies.length} films</p>
        </div>
      </div>
      <div class="gallery">${postersHtml}</div>
    </div>
  `;
}

export function filterMovieEntries(entries, query) {
  if (!query) return entries;
  const lowerQuery = query.toLowerCase();
  return entries.filter(entry => 
    (entry.title && entry.title.toLowerCase().includes(lowerQuery)) ||
    (entry.category && entry.category.toLowerCase().includes(lowerQuery)) ||
    (entry.genre && entry.genre.toLowerCase().includes(lowerQuery)) ||
    (entry.location && entry.location.toLowerCase().includes(lowerQuery)) ||
    (entry.note && entry.note.toLowerCase().includes(lowerQuery)) ||
    (entry.cast && String(entry.cast).toLowerCase().includes(lowerQuery))
  );
}

export function createPosterWallController({ container, store }) {
  const wireCards = () => {
    if (!container) return;
    container.querySelectorAll('.poster-card').forEach(card => {
      card.addEventListener('click', () => {
        const rawId = card.getAttribute('data-entry-id');
        const entryId = parseInt(rawId, 10);
        store.selectMovieAndJump(!isNaN(entryId) ? entryId : rawId);
      });
    });
  };

  const update = () => {
    if (!container) return;
    const state = store.getState();
    container.innerHTML = renderPosterWallMarkup(state);

    const searchInput = container.querySelector('#poster-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        store.state.posterFilters = { query };
        const movies = store.state.movies || [];
        const filtered = filterMovieEntries(movies, query);
        const gallery = container.querySelector('.gallery');
        const countTag = container.querySelector('.poster-count-tag');
        if (countTag) countTag.textContent = `Showing ${filtered.length} of ${movies.length} films`;
        if (gallery) {
          gallery.innerHTML = renderCardsHtml(filtered);
          wireCards();
        }
      });
    }

    wireCards();
  };

  if (store && typeof store.subscribe === 'function') {
    store.subscribe(() => {
      // Only re-render full markup if view changed or movies loaded
      const state = store.getState();
      if (state.activeView === 'posters') {
        const searchInput = container.querySelector('#poster-search');
        if (!searchInput) {
          update();
        }
      }
    });
  }

  update();

  return {
    destroy: () => {}
  };
}
