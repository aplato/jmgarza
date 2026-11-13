export function resolveInitialTheme() {
  const storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('john-adame-theme') : null;
  if (storedTheme) {
    return storedTheme;
  }
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyTheme(theme, doc = document) {
  doc.documentElement.dataset.theme = theme;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('john-adame-theme', theme);
  }
}
