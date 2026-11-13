export const store = {
  state: {
    activeStopIndex: 0,
    activeView: 'story',
    isPlaying: false,
    theme: 'dark',
    posterFilters: { query: '' },
    tableFilters: { query: '' },
    selectedMovieKey: null,
    lightboxPhoto: null,
    dataset: null,
    stops: [],
    chapters: [],
    movies: [],
    journalEntries: []
  },
  subscribers: [],
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  },
  getState() {
    const stops = this.state.stops || [];
    const activeIndex = this.state.activeStopIndex || 0;
    const activeStop = stops[activeIndex] || (this.state.dataset?.stops && this.state.dataset.stops[activeIndex]) || {};
    return {
      ...this.state,
      stop: activeStop,
      activeStop: activeStop,
      currentStopIndex: activeIndex,
      totalStops: stops.length || 380,
      activeDate: activeStop.date || activeStop.dateDisplay || '',
      activeLocation: activeStop.location || ''
    };
  },
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.subscribers.forEach(callback => callback(this.getState()));
  },
  setStopIndex(index) {
    const maxIndex = (this.state.stops && this.state.stops.length > 0) ? this.state.stops.length - 1 : 379;
    if (index < 0) index = 0;
    if (index > maxIndex) index = maxIndex;
    this.state.activeStopIndex = index;
    this.subscribers.forEach(callback => callback(this.getState()));
  },
  selectMovieAndJump(entryId) {
    // If entryId corresponds to an entry, find its stopIndex
    if (this.state.dataset && this.state.dataset.entries) {
      const entry = this.state.dataset.entries.find(e => e.entryId === entryId || e.movieNumber === entryId);
      if (entry && entry.stopIndex !== undefined) {
        this.state.activeStopIndex = entry.stopIndex;
      } else {
        this.state.activeStopIndex = entryId;
      }
    } else {
      this.state.activeStopIndex = entryId;
    }
    this.state.activeView = 'story';
    this.subscribers.forEach(callback => callback(this.getState()));
  },
  setView(view) {
    this.state.activeView = view;
    this.subscribers.forEach(callback => callback(this.getState()));
  },
  setTheme(theme) {
    this.state.theme = theme;
    this.subscribers.forEach(callback => callback(this.getState()));
  },
  togglePlayback() {
    this.state.isPlaying = !this.state.isPlaying;
    this.subscribers.forEach(callback => callback(this.getState()));
  },
  setChapter(chapterIndexOrId) {
    if (!this.state.chapters) return;
    let ch;
    if (typeof chapterIndexOrId === 'number') {
      ch = this.state.chapters[chapterIndexOrId];
    } else {
      ch = this.state.chapters.find(c => c.id === chapterIndexOrId);
    }
    if (ch && ch.startStopIndex !== undefined) {
      this.setStopIndex(ch.startStopIndex);
    }
  },
  updatePosterFilters(partial) {
    this.state.posterFilters = { ...this.state.posterFilters, ...partial };
    this.subscribers.forEach(callback => callback(this.getState()));
  },
  updateTableFilters(partial) {
    this.state.tableFilters = { ...this.state.tableFilters, ...partial };
    this.subscribers.forEach(callback => callback(this.getState()));
  }
};

export function createStore(dataset = {}, initialTheme = 'dark') {
  store.state.dataset = dataset;
  store.state.theme = initialTheme;
  store.state.stops = dataset.stops || [];
  store.state.chapters = dataset.chapters || [];

  // Normalize movie viewings list (for Poster Wall)
  if (Array.isArray(dataset.movies)) {
    store.state.movies = dataset.movies;
  } else if (dataset.entries) {
    const moviesDict = dataset.movies || {};
    store.state.movies = dataset.entries
      .filter(e => e.movieNumber !== null)
      .map(e => {
        const movieMeta = moviesDict[e.movieKey] || {};
        return {
          entryId: e.entryId,
          movieNumber: e.movieNumber,
          title: e.movieTitle || movieMeta.title || '',
          year: movieMeta.year || '',
          rating: movieMeta.imdbRating || '',
          category: movieMeta.genre || '',
          genre: movieMeta.genre || '',
          plot: movieMeta.plot || '',
          cast: movieMeta.actors || '',
          director: movieMeta.director || '',
          posterUrl: movieMeta.posterUrl || '',
          location: e.location || '',
          date: e.date || '',
          dateDisplay: e.dateDisplay || '',
          note: e.note || ''
        };
      });
  } else {
    store.state.movies = [];
  }

  // Normalize journal entries list (for Journal Table)
  if (Array.isArray(dataset.journalEntries)) {
    store.state.journalEntries = dataset.journalEntries;
  } else if (dataset.entries) {
    store.state.journalEntries = dataset.entries.map(e => ({
      entryId: e.entryId,
      rowNumber: e.rowNumber,
      date: e.date,
      dateDisplay: e.dateDisplay,
      location: e.location,
      movieNumber: e.movieNumber,
      movieTitle: e.movieTitle,
      title: e.movieTitle || (e.note ? 'Journal Note' : e.location),
      note: e.note || '',
      isInterpolated: e.isInterpolated
    }));
  } else {
    store.state.journalEntries = [];
  }

  return store;
}
