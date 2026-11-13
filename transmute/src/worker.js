import { generateCircleSvg } from './generator.js';

globalThis.onmessage = (event) => {
  const data = event?.data;
  if (!data || data.type !== 'GENERATE_BATCH') {
    return;
  }

  const { requestId, configVersion, seeds, config } = data;
  const items = (seeds ?? []).map((seed) => ({
    seed,
    svg: generateCircleSvg(seed, config),
  }));

  globalThis.postMessage({
    type: 'BATCH_READY',
    requestId,
    configVersion,
    items,
  });
};

