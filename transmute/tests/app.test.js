import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCardDescriptor, initApp } from '../src/app.js';
import { hexToBase85, decode } from '../src/base85.js';

function createFakeDom() {
  function makeElement(tagName) {
    const el = {
      tagName: tagName.toUpperCase(),
      className: '',
      id: '',
      hidden: false,
      disabled: false,
      draggable: false,
      type: '',
      title: '',
      value: '',
      textContent: '',
      innerHTML: '',
      dataset: {},
      attributes: {},
      children: [],
      listeners: {},
      classList: {
        toggle(cls, force) {
          const set = new Set(el.className.split(/\s+/).filter(Boolean));
          const add = force !== undefined ? Boolean(force) : !set.has(cls);
          if (add) set.add(cls);
          else set.delete(cls);
          el.className = [...set].join(' ');
        },
        add(cls) {
          this.toggle(cls, true);
        },
        remove(cls) {
          this.toggle(cls, false);
        },
      },
      setAttribute(k, v) {
        this.attributes[k] = String(v);
      },
      addEventListener(type, fn) {
        (this.listeners[type] ??= []).push(fn);
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      append(...nodes) {
        this.children.push(...nodes);
      },
      querySelectorAll(selector) {
        const results = [];
        const cls = selector.startsWith('.') ? selector.slice(1) : null;
        function walk(node) {
          for (const ch of node.children ?? []) {
            if (cls && ch.className.split(/\s+/).includes(cls)) {
              results.push(ch);
            }
            walk(ch);
          }
        }
        walk(el);
        return results;
      },
    };
    return el;
  }

  const elementsById = {
    'workspace-layout': makeElement('div'),
    'favorites-section': makeElement('section'),
    'favorites-grid': makeElement('div'),
    'gallery-grid': makeElement('div'),
    'stream-count': makeElement('span'),
    'pregen-status': makeElement('span'),
    'toggle-tuner-btn': makeElement('button'),
    'toggle-theme-btn': makeElement('button'),
    'dev-tuner-drawer': makeElement('aside'),
    'dev-tuner-content': makeElement('div'),
    'scroll-sentinel': makeElement('div'),
  };

  const doc = {
    documentElement: { dataset: {} },
    createElement(tag) {
      const el = makeElement(tag);
      el.ownerDocument = doc;
      return el;
    },
    getElementById(id) {
      const el = elementsById[id] ?? null;
      if (el) el.ownerDocument = doc;
      return el;
    },
  };

  return { doc, elementsById };
}

test('createCardDescriptor computes reorder boundary states for pinned favorites vs stream cards', () => {
  const firstFav = createCardDescriptor(
    { seed: 'a9f4c2107b03e89a', svg: '<svg/>' },
    { isFavorite: true, isPinnedShelf: true, index: 0, totalFavorites: 3 }
  );
  assert.equal(firstFav.canMoveLeft, false);
  assert.equal(firstFav.canMoveRight, true);

  const lastFav = createCardDescriptor(
    { seed: '7b03e89a3d18fa04', svg: '<svg/>' },
    { isFavorite: true, isPinnedShelf: true, index: 2, totalFavorites: 3 }
  );
  assert.equal(lastFav.canMoveLeft, true);
  assert.equal(lastFav.canMoveRight, false);

  const streamCard = createCardDescriptor(
    { seed: '3d18fa04c48100f2', svg: '<svg/>' },
    { isFavorite: false, isPinnedShelf: false }
  );
  assert.equal(streamCard.canMoveLeft, false);
  assert.equal(streamCard.canMoveRight, false);
});

test('initApp renders seed-badge with 10 Base85 (Z85) characters and no # while keeping hex data-seed', async () => {
  const { doc, elementsById } = createFakeDom();
  await initApp(doc);

  const cards = elementsById['gallery-grid'].children;
  assert.ok(cards.length > 0);

  for (const card of cards) {
    const hexSeed = card.dataset.seed;
    assert.match(hexSeed, /^[0-9a-f]{16}$/);

    const badges = card.querySelectorAll('.seed-badge');
    assert.equal(badges.length, 1);
    const badgeText = badges[0].textContent;
    assert.ok(!badgeText.startsWith('#'));
    assert.equal(badgeText, hexToBase85(hexSeed));
    assert.equal(badgeText.length, 10);
    assert.match(badgeText, /^[0-9a-zA-Z.:+=^!/*?&<>()\[\]{}@%$#-]{10}$/);
    assert.equal(decode(badgeText).length, 8);
    assert.equal(badges[0].title, `Seed: #${hexSeed}`);
  }
});

test('index.html and styles.css configure JetBrains Mono font stack for seed-badge without extra Noto script families', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(html, /family=JetBrains\+Mono:wght@400;500/);
  assert.match(html, /family=Noto\+Sans\+Symbols\+2/);
  assert.ok(!html.includes('family=Noto+Sans+Egyptian+Hieroglyphs'));
  assert.ok(!html.includes('family=Noto+Sans+SC'));

  const badgeRuleMatch = css.match(/\.seed-badge\s*\{[^}]+\}/);
  assert.ok(badgeRuleMatch, '.seed-badge rule must exist in styles.css');
  assert.match(badgeRuleMatch[0], /'JetBrains Mono',\s*monospace/);
});

