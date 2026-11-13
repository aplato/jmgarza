/**
 * Default procedural generation parameters, outcome weights, and Unicode Alchemical Symbols (U+1F700..U+1F77F).
 */

export const ALCHEMICAL_SYMBOLS = Object.freeze([
  '\u{1F700}', // 🜀 Quintessence
  '\u{1F701}', // 🜁 Air
  '\u{1F702}', // 🜂 Fire
  '\u{1F703}', // 🜃 Earth
  '\u{1F704}', // 🜄 Water
  '\u{1F705}', // 🜅 Aquafortis
  '\u{1F706}', // 🜆 Aqua Regia
  '\u{1F708}', // 🜈 Aqua Vitae
  '\u{1F709}', // 🜉 Vinegar
  '\u{1F70D}', // 🜍 Sulfur
  '\u{1F70E}', // 🜎 Philosophers Sulfur
  '\u{1F70F}', // 🜏 Black Sulfur
  '\u{1F714}', // 🜔 Salt
  '\u{1F715}', // 🜕 Nitre
  '\u{1F716}', // 🜖 Vitriol
  '\u{1F71A}', // 🜚 Gold
  '\u{1F71B}', // 🜛 Silver
  '\u{1F71C}', // 🜜 Iron Ore
  '\u{1F720}', // 🜠 Copper Antimoniate
  '\u{1F727}', // 🜧 Sublimate of Tartar
  '\u{1F728}', // 🜨 Verdigris
  '\u{1F72C}', // 🜬 Sublimate of Antimony
  '\u{1F732}', // 🜲 Regulus
  '\u{1F736}', // 🜶 Alkali
  '\u{1F738}', // 🜸 Marcasite
  '\u{1F73A}', // 🜺 Arsenic
  '\u{1F73B}', // 🜻 Realgar
  '\u{1F746}', // 🝆 Oil
  '\u{1F74D}', // 🝍 Tutia
  '\u{1F75E}', // 🝞 Sublimation
  '\u{1F763}', // 🝣 Purify
  '\u{1F770}', // 🝰 Day-Night
]);

export const DEFAULT_CONFIG = {
  rings: {
    countWeights: {
      2: 20,
      3: 50,
      4: 30,
    },
    styleWeights: {
      solid: 40,
      double: 30,
      dashed: 15,
      runeBand: 15,
    },
  },
  nodes: {
    countWeights: {
      3: 15,
      4: 20,
      5: 20,
      6: 25,
      8: 15,
      12: 5,
    },
  },
  lines: {
    polygonWeights: {
      regularPolygon: 35,
      starPolygon: 35,
      radialSpokes: 15,
      inscribedCross: 15,
    },
    extendLinesWeight: 0.55,
    secondLayerProbability: 0.65,
  },
  subcircles: {
    spawnProbability: 0.65,
    radiusRatioMin: 0.10,
    radiusRatioMax: 0.18,
    innerDetailWeights: {
      alchemicalSymbol: 45,
      nestedRing: 25,
      miniPolygon: 20,
      empty: 10,
    },
  },
  symbols: {
    nodeSymbolProbability: 0.75,
    centerSymbolProbability: 0.80,
  },
};

/**
 * Deep-clones a procedural configuration object.
 * @param {typeof DEFAULT_CONFIG} [config]
 * @returns {typeof DEFAULT_CONFIG}
 */
export function cloneConfig(config = DEFAULT_CONFIG) {
  return JSON.parse(JSON.stringify(config));
}

/**
 * Formats a configuration object as a ready-to-paste ES module export snippet for `src/config.js`.
 * @param {typeof DEFAULT_CONFIG} config
 * @returns {string}
 */
export function formatConfigSnippet(config) {
  return `export const DEFAULT_CONFIG = ${JSON.stringify(config, null, 2)};\n`;
}

