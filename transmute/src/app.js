import { DEFAULT_CONFIG, cloneConfig } from './config.js';
import { buildStandaloneHtmlSnippet } from './snippet.js';
import { createStore } from './store.js';
import { createPagePregenerator, PAGE_SIZE } from './pregenerator.js';
import { renderDevTuner } from './tuner.js';
import { hexToBase85 } from './base85.js';

/**
 * Computes pure card metadata including reorder boundary states.
 * @param {{ seed: string, svg: string }} item
 * @param {{ isFavorite: boolean, isPinnedShelf: boolean, index?: number, totalFavorites?: number }} options
 */
export function createCardDescriptor(item, options) {
  const isPinned = Boolean(options?.isPinnedShelf);
  const idx = options?.index ?? 0;
  const total = options?.totalFavorites ?? 0;
  return {
    seed: item.seed,
    isFavorite: Boolean(options?.isFavorite),
    isPinnedShelf: isPinned,
    canMoveLeft: isPinned && idx > 0,
    canMoveRight: isPinned && idx < total - 1,
  };
}

async function copyTextToClipboard(text) {
  if (globalThis.navigator?.clipboard?.writeText) {
    await globalThis.navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

/**
 * Initializes the Transmute Gallery application in the browser.
 * @param {Document} [rootDoc]
 */
export async function initApp(rootDoc = globalThis.document) {
  if (!rootDoc) return;

  const store = createStore();
  let activeConfig = cloneConfig(DEFAULT_CONFIG);
  const pregenerator = createPagePregenerator({
    pageSize: PAGE_SIZE,
    config: activeConfig,
  });

  const streamSeeds = [];
  let draggedFavIndex = null;
  let isAppendingPage = false;

  const workspaceLayout = rootDoc.getElementById('workspace-layout');
  const favoritesSection = rootDoc.getElementById('favorites-section');
  const favoritesGrid = rootDoc.getElementById('favorites-grid');
  const galleryGrid = rootDoc.getElementById('gallery-grid');
  const streamCountEl = rootDoc.getElementById('stream-count');
  const pregenStatusEl = rootDoc.getElementById('pregen-status');
  const toggleTunerBtn = rootDoc.getElementById('toggle-tuner-btn');
  const toggleThemeBtn = rootDoc.getElementById('toggle-theme-btn');
  const devTunerDrawer = rootDoc.getElementById('dev-tuner-drawer');
  const devTunerContent = rootDoc.getElementById('dev-tuner-content');
  const scrollSentinel = rootDoc.getElementById('scroll-sentinel');

  function applyTheme(theme) {
    rootDoc.documentElement.dataset.theme = theme;
    if (toggleThemeBtn) {
      toggleThemeBtn.textContent = theme === 'dark' ? '☀️ Light (Parchment)' : '🌙 Dark (Obsidian)';
    }
  }

  function applyDevDrawer(isOpen) {
    if (!devTunerDrawer || !workspaceLayout || !toggleTunerBtn) return;
    devTunerDrawer.hidden = !isOpen;
    workspaceLayout.classList.toggle('with-drawer', isOpen);
    toggleTunerBtn.setAttribute('aria-expanded', String(isOpen));
  }

  function buildCardElement(item, options) {
    const desc = createCardDescriptor(item, options);
    const article = rootDoc.createElement('article');
    article.className = `circle-card${desc.isFavorite ? ' is-favorite' : ''}`;
    article.dataset.seed = desc.seed;
    article.setAttribute('role', 'listitem');

    if (desc.isPinnedShelf) {
      article.draggable = true;
      article.addEventListener('dragstart', (ev) => {
        draggedFavIndex = options.index;
        ev.dataTransfer?.setData('text/plain', desc.seed);
      });
      article.addEventListener('dragend', () => {
        draggedFavIndex = null;
        article.classList.remove('drag-over');
      });
      article.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        article.classList.add('drag-over');
      });
      article.addEventListener('dragleave', () => {
        article.classList.remove('drag-over');
      });
      article.addEventListener('drop', (ev) => {
        ev.preventDefault();
        article.classList.remove('drag-over');
        if (draggedFavIndex !== null && draggedFavIndex !== options.index) {
          store.reorderFavorites(draggedFavIndex, options.index);
          renderFavoritesShelf();
        }
        draggedFavIndex = null;
      });
    }

    const viewport = rootDoc.createElement('div');
    viewport.className = 'svg-viewport';
    viewport.innerHTML = item.svg;

    const footer = rootDoc.createElement('div');
    footer.className = 'card-footer';

    const seedBadge = rootDoc.createElement('span');
    seedBadge.className = 'seed-badge';
    seedBadge.textContent = hexToBase85(desc.seed);
    seedBadge.title = `Seed: #${desc.seed}`;

    const actions = rootDoc.createElement('div');
    actions.className = 'card-actions';

    if (desc.isPinnedShelf) {
      const leftBtn = rootDoc.createElement('button');
      leftBtn.type = 'button';
      leftBtn.className = 'icon-btn';
      leftBtn.textContent = '←';
      leftBtn.title = 'Move favorite earlier';
      leftBtn.disabled = !desc.canMoveLeft;
      leftBtn.addEventListener('click', () => {
        store.moveFavorite(desc.seed, -1);
        renderFavoritesShelf();
      });

      const rightBtn = rootDoc.createElement('button');
      rightBtn.type = 'button';
      rightBtn.className = 'icon-btn';
      rightBtn.textContent = '→';
      rightBtn.title = 'Move favorite later';
      rightBtn.disabled = !desc.canMoveRight;
      rightBtn.addEventListener('click', () => {
        store.moveFavorite(desc.seed, 1);
        renderFavoritesShelf();
      });

      actions.append(leftBtn, rightBtn);
    }

    const copyHtmlBtn = rootDoc.createElement('button');
    copyHtmlBtn.type = 'button';
    copyHtmlBtn.className = 'icon-btn';
    copyHtmlBtn.textContent = '📋 HTML';
    copyHtmlBtn.title = 'Copy standalone HTML + CSS snippet for this circle';
    copyHtmlBtn.addEventListener('click', async () => {
      const snippet = buildStandaloneHtmlSnippet(desc.seed, item.svg, store.getTheme());
      await copyTextToClipboard(snippet);
      copyHtmlBtn.textContent = '✔ Copied';
      setTimeout(() => {
        copyHtmlBtn.textContent = '📋 HTML';
      }, 1400);
    });

    const favBtn = rootDoc.createElement('button');
    favBtn.type = 'button';
    favBtn.className = `icon-btn${desc.isFavorite ? ' fav-active' : ''}`;
    favBtn.textContent = desc.isFavorite ? '★' : '☆';
    favBtn.title = desc.isFavorite ? 'Remove from saved favorites' : 'Save seed to favorites';
    favBtn.addEventListener('click', () => {
      store.toggleFavorite(desc.seed);
      renderFavoritesShelf();
      syncStreamFavoriteBadges();
    });

    actions.append(copyHtmlBtn, favBtn);
    footer.append(seedBadge, actions);
    article.append(viewport, footer);
    return article;
  }

  function renderFavoritesShelf() {
    if (!favoritesSection || !favoritesGrid) return;
    const favSeeds = store.getFavorites();
    favoritesSection.hidden = favSeeds.length === 0;
    favoritesGrid.innerHTML = '';

    const renderedItems = pregenerator.renderSeedsNow(favSeeds);
    renderedItems.forEach((item, index) => {
      const cardEl = buildCardElement(item, {
        isFavorite: true,
        isPinnedShelf: true,
        index,
        totalFavorites: renderedItems.length,
      });
      favoritesGrid.appendChild(cardEl);
    });
  }

  function syncStreamFavoriteBadges() {
    if (!galleryGrid) return;
    const favSet = new Set(store.getFavorites());
    for (const cardEl of galleryGrid.querySelectorAll('.circle-card')) {
      const seed = cardEl.dataset.seed ?? '';
      const isFav = favSet.has(seed);
      cardEl.classList.toggle('is-favorite', isFav);
      const btns = cardEl.querySelectorAll('.icon-btn');
      const favBtn = btns[btns.length - 1];
      if (favBtn) {
        favBtn.classList.toggle('fav-active', isFav);
        favBtn.textContent = isFav ? '★' : '☆';
      }
    }
  }

  function rerenderStreamInPlace() {
    if (!galleryGrid) return;
    const favSet = new Set(store.getFavorites());
    const updatedItems = pregenerator.renderSeedsNow(streamSeeds);
    galleryGrid.innerHTML = '';
    for (const item of updatedItems) {
      galleryGrid.appendChild(
        buildCardElement(item, {
          isFavorite: favSet.has(item.seed),
          isPinnedShelf: false,
        })
      );
    }
  }

  async function appendNextPage() {
    if (isAppendingPage || !galleryGrid) return;
    isAppendingPage = true;
    try {
      if (pregenStatusEl) {
        pregenStatusEl.textContent = 'Buffer: Pre-generating next page…';
      }

      const pageItems = await pregenerator.takeNextPage();
      const favSet = new Set(store.getFavorites());
      for (const item of pageItems) {
        streamSeeds.push(item.seed);
        galleryGrid.appendChild(
          buildCardElement(item, {
            isFavorite: favSet.has(item.seed),
            isPinnedShelf: false,
          })
        );
      }

      if (streamCountEl) {
        streamCountEl.textContent = `${streamSeeds.length} circles generated`;
      }
      if (pregenStatusEl) {
        pregenStatusEl.textContent = `Buffer: ${PAGE_SIZE} ready ahead of scroll`;
      }
    } finally {
      isAppendingPage = false;
    }
  }

  // 1. Apply saved or system preferred theme
  applyTheme(store.getTheme());
  applyDevDrawer(store.getDevPanelOpen());

  toggleThemeBtn?.addEventListener('click', () => {
    applyTheme(store.toggleTheme());
  });

  toggleTunerBtn?.addEventListener('click', () => {
    const nextOpen = store.setDevPanelOpen(!store.getDevPanelOpen());
    applyDevDrawer(nextOpen);
  });

  // 2. Render Dev Weight Tuner
  function mountTuner() {
    if (!devTunerContent) return;
    renderDevTuner(devTunerContent, activeConfig, {
      onChange: (newCfg) => {
        activeConfig = newCfg;
        pregenerator.updateConfig(activeConfig);
        renderFavoritesShelf();
        rerenderStreamInPlace();
      },
      onReset: () => {
        activeConfig = cloneConfig(DEFAULT_CONFIG);
        pregenerator.updateConfig(activeConfig);
        mountTuner();
        renderFavoritesShelf();
        rerenderStreamInPlace();
      },
      onCopySnippet: async (snippet) => {
        await copyTextToClipboard(snippet);
      },
    });
  }
  mountTuner();

  // 3. Render Pinned Favorites FIRST before loading procedural gallery stream
  renderFavoritesShelf();

  // 4. Render initial page & set up IntersectionObserver to append pre-generated pages ahead of scroll
  await appendNextPage();

  if (scrollSentinel && typeof globalThis.IntersectionObserver === 'function') {
    const observer = new globalThis.IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          appendNextPage();
        }
      },
      { rootMargin: '800px 0px' }
    );
    observer.observe(scrollSentinel);
  }
}

if (typeof document !== 'undefined' && document.getElementById('gallery-grid')) {
  initApp(document);
}

