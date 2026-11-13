import { generateCryptoSeed } from './prng.js';
import { DEFAULT_CONFIG, cloneConfig } from './config.js';
import { generateCircleSvg } from './generator.js';

export const PAGE_SIZE = 12;

/**
 * Coordinates ahead-of-scroll page pre-generation with a background Web Worker.
 * Always keeps one full page of `{ seed, svg }` items buffered ahead of the user's scroll.
 *
 * @param {{
 *   pageSize?: number,
 *   config?: typeof DEFAULT_CONFIG,
 *   workerAdapter?: (req: any) => void
 * }} [options]
 */
export function createPagePregenerator(options = {}) {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  let activeConfig = cloneConfig(options.config ?? DEFAULT_CONFIG);
  let configVersion = 1;
  let nextRequestId = 1;
  let activeRequestId = 0;
  let bufferedPage = null;
  let pendingResolvers = [];

  let browserWorker = null;
  const sendToWorker =
    options.workerAdapter ??
    ((req) => {
      if (!browserWorker && typeof globalThis.Worker === 'function') {
        try {
          browserWorker = new globalThis.Worker(new URL('./worker.js', import.meta.url), {
            type: 'module',
          });
          browserWorker.onmessage = (ev) => handleWorkerMessage(ev.data);
          browserWorker.onerror = () => {
            browserWorker = null;
          };
        } catch {
          browserWorker = null;
        }
      }
      if (browserWorker) {
        browserWorker.postMessage(req);
      } else {
        queueMicrotask(() => {
          handleWorkerMessage({
            type: 'BATCH_READY',
            requestId: req.requestId,
            configVersion: req.configVersion,
            items: req.seeds.map((seed) => ({
              seed,
              svg: generateCircleSvg(seed, req.config),
            })),
          });
        });
      }
    });

  function dispatchPrefetch() {
    const requestId = nextRequestId++;
    activeRequestId = requestId;
    const seeds = Array.from({ length: pageSize }, () => generateCryptoSeed());
    sendToWorker({
      type: 'GENERATE_BATCH',
      requestId,
      configVersion,
      seeds,
      config: activeConfig,
    });
  }

  function handleWorkerMessage(msg) {
    if (!msg || msg.type !== 'BATCH_READY') {
      return;
    }
    if (msg.configVersion !== configVersion || msg.requestId !== activeRequestId) {
      return;
    }

    activeRequestId = 0;

    if (pendingResolvers.length > 0) {
      const resolve = pendingResolvers.shift();
      // Immediately start pre-generating the next page before resolving
      dispatchPrefetch();
      resolve(msg.items);
    } else {
      bufferedPage = msg.items;
    }
  }

  function takeNextPage() {
    if (bufferedPage !== null) {
      const ready = bufferedPage;
      bufferedPage = null;
      // Immediately start pre-generating the subsequent page in the background
      dispatchPrefetch();
      return Promise.resolve(ready);
    }

    return new Promise((resolve) => {
      pendingResolvers.push(resolve);
      if (activeRequestId === 0) {
        dispatchPrefetch();
      }
    });
  }

  function peekBufferedCount() {
    return bufferedPage ? bufferedPage.length : 0;
  }

  function updateConfig(newConfig) {
    activeConfig = cloneConfig(newConfig);
    configVersion += 1;
    bufferedPage = null;
    dispatchPrefetch();
  }

  function renderSeedsNow(seeds) {
    return (seeds ?? []).map((seed) => ({
      seed,
      svg: generateCircleSvg(seed, activeConfig),
    }));
  }

  // Kick off initial background pre-generation immediately
  dispatchPrefetch();

  return {
    takeNextPage,
    peekBufferedCount,
    updateConfig,
    renderSeedsNow,
    handleWorkerMessage,
  };
}

