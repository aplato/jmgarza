const KEY_FAVORITES = 'transmute.favorites';
const KEY_THEME = 'transmute.theme';
const KEY_DEV_PANEL = 'transmute.devPanelOpen';

/**
 * Creates a persistent store for ordered favorite seeds, theme preference, and dev drawer state.
 * @param {{ storage?: Storage, prefersDark?: () => boolean }} [options]
 */
export function createStore(options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  const prefersDark =
    options.prefersDark ??
    (() => Boolean(globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches));

  function getFavorites() {
    try {
      const raw = storage?.getItem(KEY_FAVORITES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const seen = new Set();
      const clean = [];
      for (const item of parsed) {
        const s = String(item ?? '').trim();
        if (s && !seen.has(s)) {
          seen.add(s);
          clean.push(s);
        }
      }
      return clean;
    } catch {
      return [];
    }
  }

  function saveFavorites(list) {
    try {
      storage?.setItem(KEY_FAVORITES, JSON.stringify(list));
    } catch {
      // Ignore storage quota errors
    }
    return list;
  }

  function isFavorite(seed) {
    const normalized = String(seed ?? '').trim();
    return getFavorites().includes(normalized);
  }

  function toggleFavorite(seed) {
    const normalized = String(seed ?? '').trim();
    const list = getFavorites();
    const idx = list.indexOf(normalized);
    if (idx >= 0) {
      list.splice(idx, 1);
      saveFavorites(list);
      return { isFavorited: false, favorites: list };
    }
    list.push(normalized);
    saveFavorites(list);
    return { isFavorited: true, favorites: list };
  }

  function reorderFavorites(fromIndex, toIndex) {
    const list = getFavorites();
    if (
      !Number.isInteger(fromIndex) ||
      !Number.isInteger(toIndex) ||
      fromIndex < 0 ||
      fromIndex >= list.length ||
      toIndex < 0 ||
      toIndex >= list.length ||
      fromIndex === toIndex
    ) {
      return list;
    }
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    return saveFavorites(list);
  }

  function moveFavorite(seed, direction) {
    const normalized = String(seed ?? '').trim();
    const list = getFavorites();
    const idx = list.indexOf(normalized);
    if (idx < 0) return list;
    const targetIdx = idx + (direction < 0 ? -1 : 1);
    return reorderFavorites(idx, targetIdx);
  }

  function getTheme() {
    try {
      const saved = storage?.getItem(KEY_THEME);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return prefersDark() ? 'dark' : 'light';
  }

  function setTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    try {
      storage?.setItem(KEY_THEME, next);
    } catch {
      // Ignore
    }
    return next;
  }

  function toggleTheme() {
    return setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function getDevPanelOpen() {
    try {
      return storage?.getItem(KEY_DEV_PANEL) === 'true';
    } catch {
      return false;
    }
  }

  function setDevPanelOpen(open) {
    const flag = Boolean(open);
    try {
      storage?.setItem(KEY_DEV_PANEL, String(flag));
    } catch {
      // Ignore
    }
    return flag;
  }

  return {
    getFavorites,
    isFavorite,
    toggleFavorite,
    reorderFavorites,
    moveFavorite,
    getTheme,
    setTheme,
    toggleTheme,
    getDevPanelOpen,
    setDevPanelOpen,
  };
}

