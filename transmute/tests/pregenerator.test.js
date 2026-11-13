import test from 'node:test';
import assert from 'node:assert/strict';
import { createPagePregenerator } from '../src/pregenerator.js';
import { DEFAULT_CONFIG, cloneConfig } from '../src/config.js';
import { generateCircleSvg } from '../src/generator.js';

test('pregenerator immediately queues next page in background after first page is taken', async () => {
  const dispatched = [];
  let pregen;
  pregen = createPagePregenerator({
    pageSize: 4,
    config: DEFAULT_CONFIG,
    workerAdapter: (req) => {
      dispatched.push(req);
      queueMicrotask(() => {
        pregen.handleWorkerMessage({
          type: 'BATCH_READY',
          requestId: req.requestId,
          configVersion: req.configVersion,
          items: req.seeds.map((seed) => ({ seed, svg: generateCircleSvg(seed, req.config) })),
        });
      });
    },
  });

  // Page 1 is requested; once resolved, Page 2 is automatically pre-generating
  const page1 = await pregen.takeNextPage();
  assert.equal(page1.length, 4);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(pregen.peekBufferedCount(), 4);

  // Taking Page 2 returns the already pre-generated buffer and triggers Page 3
  const page2 = await pregen.takeNextPage();
  assert.equal(page2.length, 4);
  assert.notDeepEqual(page1.map((i) => i.seed), page2.map((i) => i.seed));
  assert.ok(dispatched.length >= 3);
});

test('pregenerator discards stale worker batches when configVersion advances', async () => {
  const pendingRequests = [];
  const pregen = createPagePregenerator({
    pageSize: 3,
    config: DEFAULT_CONFIG,
    workerAdapter: (req) => pendingRequests.push(req),
  });

  const staleReq = pendingRequests[0];
  const updated = cloneConfig(DEFAULT_CONFIG);
  updated.rings.styleWeights.solid = 99;
  pregen.updateConfig(updated);

  // Stale response from configVersion 1 arrives after updateConfig (which bumped to version 2)
  pregen.handleWorkerMessage({
    type: 'BATCH_READY',
    requestId: staleReq.requestId,
    configVersion: staleReq.configVersion,
    items: [{ seed: 'stale', svg: '<svg/>' }],
  });
  assert.equal(pregen.peekBufferedCount(), 0);

  // Fresh response from configVersion 2 is accepted
  const freshReq = pendingRequests[pendingRequests.length - 1];
  pregen.handleWorkerMessage({
    type: 'BATCH_READY',
    requestId: freshReq.requestId,
    configVersion: freshReq.configVersion,
    items: freshReq.seeds.map((seed) => ({ seed, svg: generateCircleSvg(seed, freshReq.config) })),
  });
  assert.equal(pregen.peekBufferedCount(), 3);
});

