/**
 * Standalone HTML + CSS snippet builder for copying a transmutation circle card with its active theme tokens.
 */

export const THEME_TOKENS = Object.freeze({
  light: {
    bgPage: '#f5efe1',
    bgCard: '#fbf7ee',
    circleStroke: '#2c221e',
    circleAccent: '#9e2a2b',
    borderCard: '#d8cbb8',
  },
  dark: {
    bgPage: '#0b0f17',
    bgCard: '#131a26',
    circleStroke: '#e2c074',
    circleAccent: '#38bdf8',
    borderCard: '#263248',
  },
});

/**
 * Builds a self-contained HTML snippet containing the SVG, Google Fonts import for U+1F700 symbols,
 * and scoped CSS variables matching the active theme ('light' | 'dark').
 * @param {string} seed
 * @param {string} svgMarkup
 * @param {'light' | 'dark'} [theme]
 * @returns {string}
 */
export function buildStandaloneHtmlSnippet(seed, svgMarkup, theme = 'dark') {
  const palette = THEME_TOKENS[theme === 'light' ? 'light' : 'dark'];
  return [
    `<!-- Transmutation Circle (Seed: #${seed}, Theme: ${theme}) -->`,
    `<style>`,
    `  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2&display=swap');`,
    `  .transmutation-circle-card[data-seed="${seed}"] {`,
    `    --bg-card: ${palette.bgCard};`,
    `    --circle-stroke: ${palette.circleStroke};`,
    `    --circle-accent: ${palette.circleAccent};`,
    `    background: var(--bg-card);`,
    `    color: var(--circle-stroke);`,
    `    border: 1px solid ${palette.borderCard};`,
    `    border-radius: 12px;`,
    `    padding: 16px;`,
    `    max-width: 360px;`,
    `    box-sizing: border-box;`,
    `  }`,
    `  .transmutation-circle-card[data-seed="${seed}"] svg {`,
    `    width: 100%;`,
    `    height: auto;`,
    `    display: block;`,
    `  }`,
    `</style>`,
    `<div class="transmutation-circle-card" data-seed="${seed}">`,
    svgMarkup,
    `</div>`,
  ].join('\n');
}

