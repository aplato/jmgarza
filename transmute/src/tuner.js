import { cloneConfig, formatConfigSnippet } from './config.js';

/**
 * Renders the live Developer Weight Tuner controls into `container`.
 * @param {HTMLElement} container
 * @param {import('./config.js').DEFAULT_CONFIG} config
 * @param {{
 *   onChange: (newConfig: any) => void,
 *   onReset: () => void,
 *   onCopySnippet: (snippet: string) => void
 * }} callbacks
 */
export function renderDevTuner(container, config, callbacks) {
  const working = cloneConfig(config);
  container.innerHTML = '';

  const doc = container.ownerDocument;
  const header = doc.createElement('div');
  header.className = 'tuner-header';
  header.innerHTML = `<h3 class="tuner-title">⚙️ Dev Weight Tuner</h3>`;
  container.appendChild(header);

  function addSliderRow(parent, label, min, max, step, initialValue, onInput) {
    const row = doc.createElement('label');
    row.className = 'tuner-row';

    const nameSpan = doc.createElement('span');
    nameSpan.textContent = label;

    const input = doc.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(initialValue);

    const valSpan = doc.createElement('span');
    valSpan.className = 'tuner-val';
    valSpan.textContent = Number(initialValue).toFixed(step < 1 ? 2 : 0);

    input.addEventListener('input', () => {
      const num = Number(input.value);
      valSpan.textContent = num.toFixed(step < 1 ? 2 : 0);
      onInput(num);
      callbacks.onChange(cloneConfig(working));
    });

    row.append(nameSpan, input, valSpan);
    parent.appendChild(row);
  }

  function addWeightGroup(title, weightMap) {
    const group = doc.createElement('div');
    group.className = 'tuner-group';
    const h4 = doc.createElement('h4');
    h4.className = 'tuner-group-title';
    h4.textContent = title;
    group.appendChild(h4);

    for (const [key, val] of Object.entries(weightMap)) {
      addSliderRow(group, key, 0, 100, 1, val, (nextVal) => {
        weightMap[key] = nextVal;
      });
    }
    container.appendChild(group);
  }

  addWeightGroup('Nodes Symmetry Weights', working.nodes.countWeights);
  addWeightGroup('Ring Count Weights', working.rings.countWeights);
  addWeightGroup('Ring Style Weights', working.rings.styleWeights);
  addWeightGroup('Polygon & Chord Weights', working.lines.polygonWeights);
  addWeightGroup('Subcircle Detail Weights', working.subcircles.innerDetailWeights);

  const probGroup = doc.createElement('div');
  probGroup.className = 'tuner-group';
  probGroup.innerHTML = `<h4 class="tuner-group-title">Probabilities &amp; Ratios</h4>`;
  addSliderRow(probGroup, 'extendLines', 0, 1, 0.05, working.lines.extendLinesWeight, (v) => {
    working.lines.extendLinesWeight = v;
  });
  addSliderRow(probGroup, 'secondLayer', 0, 1, 0.05, working.lines.secondLayerProbability, (v) => {
    working.lines.secondLayerProbability = v;
  });
  addSliderRow(probGroup, 'subcircleSpawn', 0, 1, 0.05, working.subcircles.spawnProbability, (v) => {
    working.subcircles.spawnProbability = v;
  });
  addSliderRow(probGroup, 'subRadiusMin', 0.05, 0.25, 0.01, working.subcircles.radiusRatioMin, (v) => {
    working.subcircles.radiusRatioMin = v;
  });
  addSliderRow(probGroup, 'subRadiusMax', 0.08, 0.30, 0.01, working.subcircles.radiusRatioMax, (v) => {
    working.subcircles.radiusRatioMax = v;
  });
  addSliderRow(probGroup, 'nodeSymbols', 0, 1, 0.05, working.symbols.nodeSymbolProbability, (v) => {
    working.symbols.nodeSymbolProbability = v;
  });
  addSliderRow(probGroup, 'centerSymbol', 0, 1, 0.05, working.symbols.centerSymbolProbability, (v) => {
    working.symbols.centerSymbolProbability = v;
  });
  container.appendChild(probGroup);

  const actions = doc.createElement('div');
  actions.className = 'tuner-actions';

  const copyBtn = doc.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'primary-btn';
  copyBtn.textContent = '📋 Copy Config Snippet';
  copyBtn.addEventListener('click', () => {
    const snippet = formatConfigSnippet(working);
    callbacks.onCopySnippet(snippet);
    copyBtn.textContent = '✔ Copied DEFAULT_CONFIG!';
    setTimeout(() => {
      copyBtn.textContent = '📋 Copy Config Snippet';
    }, 1600);
  });

  const resetBtn = doc.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'control-btn';
  resetBtn.textContent = '↺ Reset to File Defaults';
  resetBtn.addEventListener('click', () => {
    callbacks.onReset();
  });

  actions.append(copyBtn, resetBtn);
  container.appendChild(actions);
}

