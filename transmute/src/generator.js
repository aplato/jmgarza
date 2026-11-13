import { createPrng } from './prng.js';
import { DEFAULT_CONFIG, ALCHEMICAL_SYMBOLS } from './config.js';

const CX = 200;
const CY = 200;
const OUTER_R = 172;

function fmt(n) {
  return Number(n).toFixed(2);
}

/**
 * Computes the two intersection points of an infinite line through P1(x1,y1) and P2(x2,y2)
 * with a circle centered at (cx,cy) of radius R.
 */
function extendSegmentToCircle(x1, y1, x2, y2, cx, cy, R) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) {
    return [x1, y1, x2, y2];
  }
  const fx = x1 - cx;
  const fy = y1 - cy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - R * R;
  const disc = b * b - 4 * lenSq * c;
  if (disc <= 0) {
    return [x1, y1, x2, y2];
  }
  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / (2 * lenSq);
  const t2 = (-b + sqrtDisc) / (2 * lenSq);
  return [
    x1 + t1 * dx,
    y1 + t1 * dy,
    x1 + t2 * dx,
    y1 + t2 * dy,
  ];
}

function renderRingLayer(prng, r, style) {
  const parts = [];
  if (style === 'solid') {
    parts.push(
      `<circle cx="${CX}" cy="${CY}" r="${fmt(r)}" fill="none" stroke="var(--circle-stroke, currentColor)" stroke-width="1.8"/>`
    );
  } else if (style === 'double') {
    const gap = Math.max(4, r * 0.045);
    parts.push(
      `<circle cx="${CX}" cy="${CY}" r="${fmt(r)}" fill="none" stroke="var(--circle-stroke, currentColor)" stroke-width="1.8"/>`,
      `<circle cx="${CX}" cy="${CY}" r="${fmt(r - gap)}" fill="none" stroke="var(--circle-stroke, currentColor)" stroke-width="1.0" stroke-opacity="0.85"/>`
    );
  } else if (style === 'dashed') {
    const dash = prng.int(4, 10);
    const gap = prng.int(3, 7);
    parts.push(
      `<circle cx="${CX}" cy="${CY}" r="${fmt(r)}" fill="none" stroke="var(--circle-stroke, currentColor)" stroke-width="1.5" stroke-dasharray="${dash},${gap}"/>`
    );
  } else if (style === 'runeBand') {
    const bandWidth = Math.max(12, r * 0.09);
    const innerR = r - bandWidth;
    const midR = r - bandWidth / 2;
    parts.push(
      `<circle cx="${CX}" cy="${CY}" r="${fmt(r)}" fill="none" stroke="var(--circle-stroke, currentColor)" stroke-width="1.6"/>`,
      `<circle cx="${CX}" cy="${CY}" r="${fmt(innerR)}" fill="none" stroke="var(--circle-stroke, currentColor)" stroke-width="1.1"/>`
    );
    const runeCount = prng.pick([8, 12, 16, 24]);
    const fontSize = Math.max(7, bandWidth * 0.62);
    for (let i = 0; i < runeCount; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / runeCount;
      const rx = CX + midR * Math.cos(angle);
      const ry = CY + midR * Math.sin(angle);
      const deg = (angle * 180) / Math.PI + 90;
      const sym = prng.pick(ALCHEMICAL_SYMBOLS);
      parts.push(
        `<text x="${fmt(rx)}" y="${fmt(ry)}" font-size="${fmt(fontSize)}" font-family="'Noto Sans Symbols 2', sans-serif" fill="var(--circle-accent, currentColor)" text-anchor="middle" dominant-baseline="central" transform="rotate(${fmt(deg)}, ${fmt(rx)}, ${fmt(ry)})">${sym}</text>`
      );
    }
  }
  return parts.join('\n  ');
}

function renderPolygonAndChords(prng, nodes, polyType, extendLines, boundR, angleOffset = 0, radius = 120) {
  const parts = [];
  const N = nodes.length;
  const pts = angleOffset === 0
    ? nodes
    : Array.from({ length: N }, (_, i) => {
        const a = -Math.PI / 2 + angleOffset + (2 * Math.PI * i) / N;
        return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a), angle: a };
      });

  const edges = [];
  if (polyType === 'regularPolygon') {
    for (let i = 0; i < N; i++) {
      edges.push([pts[i], pts[(i + 1) % N]]);
    }
    if (N >= 6 && N % 2 === 0) {
      // Also inscribe dual overlapping polygon (e.g. hexagram / octagram)
      for (let i = 0; i < N; i++) {
        edges.push([pts[i], pts[(i + 2) % N]]);
      }
    }
  } else if (polyType === 'starPolygon') {
    const step = N >= 5 ? 2 : 1;
    for (let i = 0; i < N; i++) {
      edges.push([pts[i], pts[(i + step) % N]]);
    }
  } else if (polyType === 'radialSpokes') {
    for (let i = 0; i < N; i++) {
      edges.push([{ x: CX, y: CY }, pts[i]]);
    }
    for (let i = 0; i < N; i++) {
      edges.push([pts[i], pts[(i + 1) % N]]);
    }
  } else if (polyType === 'inscribedCross') {
    for (let i = 0; i < N; i++) {
      const opp = pts[(i + Math.floor(N / 2)) % N];
      edges.push([pts[i], opp]);
      edges.push([pts[i], pts[(i + 1) % N]]);
    }
  }

  for (const [p1, p2] of edges) {
    if (extendLines) {
      const [ex1, ey1, ex2, ey2] = extendSegmentToCircle(p1.x, p1.y, p2.x, p2.y, CX, CY, boundR);
      parts.push(
        `<line x1="${fmt(ex1)}" y1="${fmt(ey1)}" x2="${fmt(ex2)}" y2="${fmt(ey2)}" stroke="var(--circle-stroke, currentColor)" stroke-width="0.75" stroke-opacity="0.45"/>`
      );
    }
    parts.push(
      `<line x1="${fmt(p1.x)}" y1="${fmt(p1.y)}" x2="${fmt(p2.x)}" y2="${fmt(p2.y)}" stroke="var(--circle-stroke, currentColor)" stroke-width="1.35"/>`
    );
  }

  return parts.join('\n  ');
}

function renderNodeSubcircles(prng, nodes, parentR, config) {
  const parts = [];
  const spawnSubcircles = prng.chance(config.subcircles.spawnProbability);
  const placeSymbols = prng.chance(config.symbols.nodeSymbolProbability);

  if (!spawnSubcircles && !placeSymbols) {
    for (const pt of nodes) {
      parts.push(
        `<circle cx="${fmt(pt.x)}" cy="${fmt(pt.y)}" r="3.5" fill="var(--circle-accent, currentColor)"/>`
      );
    }
    return parts.join('\n  ');
  }

  const ratioMin = Math.max(0.06, Number(config.subcircles.radiusRatioMin) || 0.10);
  const ratioMax = Math.max(ratioMin, Number(config.subcircles.radiusRatioMax) || 0.18);
  const subR = parentR * prng.range(ratioMin, ratioMax);
  const detailType = prng.weighted(config.subcircles.innerDetailWeights);
  const sharedSym = prng.chance(0.45) ? prng.pick(ALCHEMICAL_SYMBOLS) : null;

  for (let i = 0; i < nodes.length; i++) {
    const pt = nodes[i];
    const deg = (pt.angle * 180) / Math.PI + 90;

    // Always draw opaque backing circle when subcircles or node symbols are active
    parts.push(
      `<circle cx="${fmt(pt.x)}" cy="${fmt(pt.y)}" r="${fmt(subR)}" fill="var(--bg-card)" stroke="var(--circle-stroke, currentColor)" stroke-width="1.4"/>`
    );

    if (detailType === 'nestedRing' || detailType === 'alchemicalSymbol') {
      parts.push(
        `<circle cx="${fmt(pt.x)}" cy="${fmt(pt.y)}" r="${fmt(subR * 0.78)}" fill="none" stroke="var(--circle-accent, currentColor)" stroke-width="0.8" stroke-opacity="0.75"/>`
      );
    } else if (detailType === 'miniPolygon') {
      const mSides = 3 + (i % 2);
      const polyPts = [];
      for (let k = 0; k < mSides; k++) {
        const a = pt.angle + (2 * Math.PI * k) / mSides;
        polyPts.push(`${fmt(pt.x + subR * 0.76 * Math.cos(a))},${fmt(pt.y + subR * 0.76 * Math.sin(a))}`);
      }
      parts.push(
        `<polygon points="${polyPts.join(' ')}" fill="none" stroke="var(--circle-accent, currentColor)" stroke-width="0.9"/>`
      );
    }

    if (placeSymbols || detailType === 'alchemicalSymbol') {
      const sym = sharedSym ?? prng.pick(ALCHEMICAL_SYMBOLS);
      const fontSize = Math.max(10, subR * 1.05);
      parts.push(
        `<text x="${fmt(pt.x)}" y="${fmt(pt.y)}" font-size="${fmt(fontSize)}" font-family="'Noto Sans Symbols 2', sans-serif" fill="var(--circle-stroke, currentColor)" text-anchor="middle" dominant-baseline="central" transform="rotate(${fmt(deg)}, ${fmt(pt.x)}, ${fmt(pt.y)})">${sym}</text>`
      );
    }
  }

  return parts.join('\n  ');
}

function renderCenterMotif(prng, innerR, config) {
  const parts = [];
  const centerR = Math.max(20, innerR * 0.42);

  parts.push(
    `<circle cx="${CX}" cy="${CY}" r="${fmt(centerR)}" fill="var(--bg-card)" stroke="var(--circle-stroke, currentColor)" stroke-width="1.5"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${fmt(centerR * 0.82)}" fill="none" stroke="var(--circle-accent, currentColor)" stroke-width="0.9" stroke-dasharray="3,2"/>`
  );

  if (prng.chance(config.symbols.centerSymbolProbability)) {
    const sym = prng.pick(ALCHEMICAL_SYMBOLS);
    const rot = prng.pick([0, 45, 90, 180]);
    parts.push(
      `<text x="${CX}" y="${CY}" font-size="${fmt(centerR * 0.95)}" font-family="'Noto Sans Symbols 2', sans-serif" fill="var(--circle-accent, currentColor)" text-anchor="middle" dominant-baseline="central" transform="rotate(${fmt(rot)}, ${CX}, ${CY})">${sym}</text>`
    );
  }

  return parts.join('\n  ');
}

/**
 * Pure deterministic procedural SVG transmutation circle generator.
 * @param {string} seed
 * @param {typeof DEFAULT_CONFIG} [config]
 * @returns {string}
 */
export function generateCircleSvg(seed, config = DEFAULT_CONFIG) {
  const normalizedSeed = String(seed ?? '0').trim().toLowerCase() || '0';
  const prng = createPrng(normalizedSeed);
  const elements = [];

  const ringCount = Math.max(2, Number(prng.weighted(config.rings.countWeights)) || 3);
  const ringRadii = [];
  for (let i = 0; i < ringCount; i++) {
    const ratio = 1 - i * (0.58 / ringCount);
    ringRadii.push(OUTER_R * ratio);
  }

  // 1. Render concentric rings
  for (let i = 0; i < ringRadii.length; i++) {
    const style = prng.weighted(config.rings.styleWeights);
    elements.push(renderRingLayer(prng, ringRadii[i], style));
  }

  // 2. Compute primary nodes on the main structural ring
  const nodeRingR = ringRadii[Math.min(1, ringRadii.length - 1)];
  const nodeCount = Math.max(3, Number(prng.weighted(config.nodes.countWeights)) || 6);
  const nodes = [];
  for (let k = 0; k < nodeCount; k++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / nodeCount;
    nodes.push({
      x: CX + nodeRingR * Math.cos(angle),
      y: CY + nodeRingR * Math.sin(angle),
      angle,
    });
  }

  // 3. Render primary and optional rotated secondary polygon/chord layers
  const polyType = prng.weighted(config.lines.polygonWeights);
  const extendLines = prng.chance(config.lines.extendLinesWeight);
  elements.push(renderPolygonAndChords(prng, nodes, polyType, extendLines, OUTER_R, 0, nodeRingR));

  if (prng.chance(config.lines.secondLayerProbability)) {
    const secondPoly = prng.weighted(config.lines.polygonWeights);
    const secondR = ringRadii[ringRadii.length - 1];
    elements.push(
      renderPolygonAndChords(prng, nodes, secondPoly, false, nodeRingR, Math.PI / nodeCount, secondR)
    );
  }

  // 4. Render node subcircles & centered/rotated alchemical symbols
  elements.push(renderNodeSubcircles(prng, nodes, nodeRingR, config));

  // 5. Render center focal motif
  elements.push(renderCenterMotif(prng, ringRadii[ringRadii.length - 1], config));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" class="transmutation-svg" data-seed="${normalizedSeed}">`,
    `  ${elements.join('\n  ')}`,
    `</svg>`,
  ].join('\n');
}

