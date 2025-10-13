// Test provider switch & multi-slice telemetry for localRandom provider.
// Precondition: build main and set PRIMUS_ENABLE_LOCAL_RANDOM=1 before running.
// Usage:
//   $env:PRIMUS_ENABLE_LOCAL_RANDOM='1'; npm run build:main; node test/embeddingProviderSwitch.test.js

import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const distMain = path.resolve(__dirname, '../dist/main/main');
const registryPath = path.join(distMain, 'ai/embeddings/providerRegistry.js');
const telemetryPath = path.join(distMain, 'ai/embeddings/embeddingTelemetry.js');
const indexerPath = path.join(distMain, 'ai/retrieval/indexer.js');

function must(modPath) {
  if (!fs.existsSync(modPath)) {
    console.error('FAIL: missing compiled module', modPath);
    process.exit(1);
  }
  return modPath;
}

async function run() {
  const { embeddingProviderRegistry } = await import(url.pathToFileURL(must(registryPath)).href);
  const { onEmbeddingBatch } = await import(url.pathToFileURL(must(telemetryPath)).href);
  const { buildFileChunksAsync } = await import(url.pathToFileURL(must(indexerPath)).href);

  const list = embeddingProviderRegistry.list().map(p => p.id);
  if (!list.includes('localRandom')) {
    console.error('FAIL: localRandom provider not registered (ensure PRIMUS_ENABLE_LOCAL_RANDOM=1 & rebuilt)');
    process.exit(1);
  }

  // Switch to localRandom (should not implicitly reindex here, we only test embedding pipeline output)
  embeddingProviderRegistry.setActive('localRandom');
  // Force small batch size to test multi-slice telemetry: set batch size to 16
  embeddingProviderRegistry.setBatchSize(16);

  const events = [];
  onEmbeddingBatch(e => events.push(e));

  // Create synthetic large text list via buildFileChunksAsync substitute: we can directly call embedBatch
  // Simulate by calling embedBatch with 45 entries so we expect 3 events (16 + 16 + 13)
  const texts = Array.from({ length: 45 }, (_, i) => `multi slice sample text number ${i}`);
  const t0 = Date.now();
  const resp = await embeddingProviderRegistry.embedBatch({ texts });
  const t1 = Date.now();

  if (resp.vectors.length !== 45) {
    console.error('FAIL: Expected 45 vectors got', resp.vectors.length);
    process.exit(1);
  }
  if (resp.dimensions !== 256) {
    console.error('FAIL: Expected dimension 256 for localRandom got', resp.dimensions);
    process.exit(1);
  }
  // Telemetry: ensure at least 3 events and correct aggregation
  if (events.length !== 3) {
    console.error('FAIL: Expected 3 telemetry events got', events.length);
    process.exit(1);
  }
  const totalItemsOk = events.every(e => e.totalItems === 45);
  if (!totalItemsOk) {
    console.error('FAIL: totalItems mismatch in telemetry events', events);
    process.exit(1);
  }
  const batchSizes = events.map(e => e.batchSize);
  if (batchSizes[0] !== 16 || batchSizes[1] !== 16 || batchSizes[2] !== 13) {
    console.error('FAIL: Unexpected batch size sequence', batchSizes);
    process.exit(1);
  }
  const elapsed = t1 - t0;
  if (elapsed < 0) {
    console.error('FAIL: negative timing?');
    process.exit(1);
  }
  console.log('PASS provider switch & telemetry multi-slice test');
}

run().catch(e => { console.error('FAIL: Uncaught error', e); process.exit(1); });
