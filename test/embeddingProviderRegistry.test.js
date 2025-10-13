// Minimal runtime test for embedding provider registry & telemetry
// Usage:
//   npm run build:main && node test/embeddingProviderRegistry.test.js
// (Requires compiled files in dist/main)

import { existsSync } from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const distRegistryPath = path.resolve(__dirname, '../dist/main/main/ai/embeddings/providerRegistry.js');
const distTelemetryPath = path.resolve(__dirname, '../dist/main/main/ai/embeddings/embeddingTelemetry.js');

async function loadDist(modulePath, label) {
  if (!existsSync(modulePath)) {
    console.error(`FAIL: Missing compiled ${label} at ${modulePath}. Run: npm run build:main`);
    process.exit(1);
  }
  return import(url.pathToFileURL(modulePath).href);
}

async function testErrorCases(embeddingProviderRegistry) {
  console.log('🧪 Testing error cases for embedBatch...');

  // Test 1: Empty texts array - should throw or return empty
  try {
    const resp = await embeddingProviderRegistry.embedBatch({ texts: [], metadata: { purpose: 'test' } });
    if (resp.vectors.length !== 0) {
      console.error('FAIL: Empty texts should return 0 vectors, got ' + resp.vectors.length);
      process.exit(1);
    }
    console.log('✅ Empty texts handled correctly');
  } catch (err) {
    console.error('FAIL: Unexpected error on empty texts: ' + err.message);
    process.exit(1);
  }

  // Test 2: Non-string input - should throw
  try {
    await embeddingProviderRegistry.embedBatch({ texts: [123], metadata: { purpose: 'test' } });
    console.error('FAIL: Non-string input should throw error');
    process.exit(1);
  } catch (err) {
    if (!err.message.includes('string')) {
      console.error('FAIL: Expected string validation error, got: ' + err.message);
      process.exit(1);
    }
    console.log('✅ Non-string input throws correctly');
  }

  // Test 3: Invalid metadata - should handle gracefully or throw specific error
  try {
    const resp = await embeddingProviderRegistry.embedBatch({ texts: ['test'], metadata: null });
    console.log('✅ Null metadata handled (no crash)');
  } catch (err) {
    console.error('FAIL: Null metadata should not crash, got: ' + err.message);
    process.exit(1);
  }
}

async function testEdgeCases(embeddingProviderRegistry, info) {
  console.log('🧪 Testing edge cases for embedBatch...');

  // Test 1: Single text
  const singleResp = await embeddingProviderRegistry.embedBatch({ texts: ['single'], metadata: { purpose: 'test' } });
  if (singleResp.vectors.length !== 1 || singleResp.vectors[0].length !== info.dimensions) {
    console.error('FAIL: Single text should return 1 vector of correct dimensions');
    process.exit(1);
  }
  console.log('✅ Single text embedding correct');

  // Test 2: Empty string text
  const emptyStrResp = await embeddingProviderRegistry.embedBatch({ texts: [''], metadata: { purpose: 'test' } });
  if (emptyStrResp.vectors.length !== 1) {
    console.error('FAIL: Empty string should return 1 vector');
    process.exit(1);
  }
  console.log('✅ Empty string embedding handled');

  // Test 3: Very long text (boundary ~1000 chars)
  const longText = 'a'.repeat(1000);
  const longResp = await embeddingProviderRegistry.embedBatch({ texts: [longText], metadata: { purpose: 'test' } });
  if (longResp.vectors.length !== 1 || longResp.vectors[0].length !== info.dimensions) {
    console.error('FAIL: Long text should return valid vector');
    process.exit(1);
  }
  console.log('✅ Long text embedding correct');
}

async function run() {
  const { embeddingProviderRegistry } = await loadDist(distRegistryPath, 'providerRegistry');
  const { onEmbeddingBatch } = await loadDist(distTelemetryPath, 'embeddingTelemetry');

  const info = embeddingProviderRegistry.getActive().info;
  if (!info || info.id !== 'hashPlaceholder') {
    console.error('FAIL: Expected default provider id hashPlaceholder, got', info && info.id); 
    process.exit(1);
  }
  const events = [];
  onEmbeddingBatch(e => events.push(e));

  const texts = Array.from({ length: 20 }, (_, i) => `sample text ${i}`);
  const resp = await embeddingProviderRegistry.embedBatch({ texts, metadata: { purpose: 'test' } });

  if (resp.vectors.length !== texts.length) {
    console.error(`FAIL: Expected ${texts.length} vectors, got ${resp.vectors.length}`);
    process.exit(1);
  }
  if (resp.dimensions !== info.dimensions) {
    console.error(`FAIL: Dimension mismatch expected ${info.dimensions} got ${resp.dimensions}`);
    process.exit(1);
  }
  const first = resp.vectors[0];
  if (first.length !== info.dimensions) {
    console.error('FAIL: First vector dimension mismatch'); 
    process.exit(1);
  }
  const mag = Math.sqrt(first.reduce((s, v) => s + v * v, 0));
  if (Math.abs(mag - 1) > 0.05) {
    console.error('FAIL: First vector not normalized magnitude=', mag);
    process.exit(1);
  }

  if (events.length !== 2) {
    console.error('FAIL: Expected 2 telemetry events, got', events.length); 
    process.exit(1);
  }
  if (events.some(e => e.totalItems !== texts.length)) {
    console.error('FAIL: Telemetry totalItems mismatch'); 
    process.exit(1);
  }

  await testErrorCases(embeddingProviderRegistry);
  await testEdgeCases(embeddingProviderRegistry, info);
  console.log('PASS all embeddingProviderRegistry tests including errors and edges');
}

run().catch(err => { console.error('FAIL: Uncaught error', err); process.exit(1); });
