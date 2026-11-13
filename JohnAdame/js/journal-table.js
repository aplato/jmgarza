import { escapeHtml } from './utils.js';

function renderRowsHtml(filtered) {
  return filtered.map(entry => {
    const isAtSea = entry.isInterpolated;
    const isMovie = entry.movieNumber !== null && entry.movieNumber !== undefined;
    const rowClass = isMovie ? 'row-movie' : (entry.note ? 'row-note' : 'row-travel');

    return `
      <tr class="${rowClass}" data-entry-id="${escapeHtml(String(entry.entryId))}" title="Click to view on map &amp; timeline">
        <td class="col-date">${escapeHtml(String(entry.dateDisplay || entry.date || ''))}</td>
        <td class="col-location">
          ${isAtSea ? '🚢 ' : '📍 '}${escapeHtml(entry.location || 'Out at Sea')}
        </td>
        <td class="col-title">
          ${isMovie ? `<span class="table-movie-num">#${entry.movieNumber}</span> ` : ''}
          <strong>${escapeHtml(entry.title || entry.movieTitle || '—')}</strong>
        </td>
        <td class="col-note">${escapeHtml(entry.note || '—')}</td>
      </tr>
    `;
  }).join('');
}

export function renderJournalTableMarkup(state) {
  const entries = state.journalEntries || [];
  const query = state.tableFilters?.query || '';
  const filtered = filterJournalEntries(entries, query);
  const rowsHtml = renderRowsHtml(filtered);

  return `
    <div class="journal-table-container">
      <div class="journal-table-header">
        <h2>📓 John Adamé Wartime Journal &amp; Film Index (402 Entries)</h2>
        <p class="journal-table-subtitle">Complete chronological record of bases, airfields, combat notes, hospitalizations, and film screenings (1942–1945).</p>
        <div class="table-controls">
          <input type="text" id="journal-search" placeholder="Search journal notes, bases, movies..." value="${escapeHtml(query)}" autofocus>
          <span class="table-count-tag">Showing ${filtered.length} of ${entries.length} entries</span>
        </div>
      </div>
      <div class="table-scroll-wrap">
        <table class="journal-table">
          <thead>
            <tr>
              <th style="width: 130px;">Date</th>
              <th style="width: 200px;">Location / Theatre</th>
              <th style="width: 260px;">Event / Movie</th>
              <th>Journal Note</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `;
}

export function filterJournalEntries(entries, query) {
  if (!query) return entries;
  const lowerQuery = query.toLowerCase();
  return entries.filter(entry => 
    (entry.note && entry.note.toLowerCase().includes(lowerQuery)) ||
    (entry.title && entry.title.toLowerCase().includes(lowerQuery)) ||
    (entry.location && entry.location.toLowerCase().includes(lowerQuery)) ||
    (entry.date && String(entry.date).toLowerCase().includes(lowerQuery)) ||
    (entry.dateDisplay && entry.dateDisplay.toLowerCase().includes(lowerQuery))
  );
}

export function createJournalTableController({ container, store }) {
  const wireRows = () => {
    if (!container) return;
    container.querySelectorAll('tr[data-entry-id]').forEach(row => {
      row.addEventListener('click', () => {
        const rawId = row.getAttribute('data-entry-id');
        const entryId = parseInt(rawId, 10);
        store.selectMovieAndJump(!isNaN(entryId) ? entryId : rawId);
      });
    });
  };

  const update = () => {
    if (!container) return;
    const state = store.getState();
    container.innerHTML = renderJournalTableMarkup(state);

    const searchInput = container.querySelector('#journal-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        store.state.tableFilters = { query };
        const entries = store.state.journalEntries || [];
        const filtered = filterJournalEntries(entries, query);
        const tbody = container.querySelector('tbody');
        const countTag = container.querySelector('.table-count-tag');
        if (countTag) countTag.textContent = `Showing ${filtered.length} of ${entries.length} entries`;
        if (tbody) {
          tbody.innerHTML = renderRowsHtml(filtered);
          wireRows();
        }
      });
    }

    wireRows();
  };

  if (store && typeof store.subscribe === 'function') {
    store.subscribe(() => {
      const state = store.getState();
      if (state.activeView === 'journal') {
        const searchInput = container.querySelector('#journal-search');
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
