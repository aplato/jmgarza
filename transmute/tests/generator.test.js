import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCircleSvg } from '../src/generator.js';
import { buildStandaloneHtmlSnippet } from '../src/snippet.js';
import { DEFAULT_CONFIG, cloneConfig } from '../src/config.js';

test('generateCircleSvg is deterministic for the same seed and differs across seeds', () => {
  const svg1 = generateCircleSvg('a9f4c2107b03e89a', DEFAULT_CONFIG);
  const svg2 = generateCircleSvg('A9F4C2107B03E89A', DEFAULT_CONFIG);
  const svg3 = generateCircleSvg('7b03e89a3d18fa04', DEFAULT_CONFIG);
  assert.equal(svg1, svg2);
  assert.notEqual(svg1, svg3);
  assert.match(svg1, /^<svg[^>]+viewBox="0 0 400 400"/);
  assert.ok(!svg1.includes('NaN') && !svg1.includes('Infinity'));
});

test('generateCircleSvg centers and radially rotates node alchemical symbols with opaque backing', () => {
  const cfg = cloneConfig(DEFAULT_CONFIG);
  cfg.subcircles.spawnProbability = 1.0;
  cfg.subcircles.innerDetailWeights = { alchemicalSymbol: 100, nestedRing: 0, miniPolygon: 0, empty: 0 };
  cfg.symbols.nodeSymbolProbability = 1.0;
  cfg.lines.extendLinesWeight = 1.0;

  const svg = generateCircleSvg('1122334455667788', cfg);
  assert.match(svg, /fill="var\(--bg-card\)"/);
  assert.match(svg, /text-anchor="middle"/);
  assert.match(svg, /dominant-baseline="central"/);
  assert.match(svg, /transform="rotate\([0-9.-]+,\s*[0-9.-]+,\s*[0-9.-]+\)"/);
  assert.ok(!svg.includes('NaN'));
});

test('buildStandaloneHtmlSnippet embeds Noto Sans Symbols 2 font, theme CSS variables, and SVG', () => {
  const svg = generateCircleSvg('a9f4c2107b03e89a', DEFAULT_CONFIG);
  const lightHtml = buildStandaloneHtmlSnippet('a9f4c2107b03e89a', svg, 'light');
  const darkHtml = buildStandaloneHtmlSnippet('a9f4c2107b03e89a', svg, 'dark');

  assert.match(lightHtml, /Noto\+Sans\+Symbols\+2/);
  assert.match(lightHtml, /--bg-card:\s*#fbf7ee/i);
  assert.match(lightHtml, /--circle-stroke:\s*#2c221e/i);
  assert.match(darkHtml, /--bg-card:\s*#131a26/i);
  assert.match(darkHtml, /--circle-stroke:\s*#e2c074/i);
  assert.ok(darkHtml.includes(svg));
});

