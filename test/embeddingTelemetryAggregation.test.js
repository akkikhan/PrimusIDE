// Test that embedding batch telemetry aggregates into provider metrics (embeddingBatches, embeddingItems, embeddingTimeMs)
// Precondition: build main with PRIMUS_ENABLE_LOCAL_RANDOM=1 to register localRandom provider.
// Usage:
//   $env:PRIMUS_ENABLE_LOCAL_RANDOM='1'; npm run build:main; node test/embeddingTelemetryAggregation.test.js
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const distMain = path.resolve(__dirname, '../dist/main/main');
const registryPath = path.join(distMain, 'ai/embeddings/providerRegistry.js');
const metricsModulePath = path.join(distMain, 'ai/embeddings/embeddingMetrics.js'); // headless metrics aggregator

function must(p){ if(!fs.existsSync(p)){ console.error('FAIL: missing compiled module', p); process.exit(1);} return p; }

async function run(){
  // Import metrics module (no Electron dependency) to ensure aggregation side-effects registered
  const metricsMod = await import(url.pathToFileURL(must(metricsModulePath)).href);
  const { embeddingProviderRegistry } = await import(url.pathToFileURL(must(registryPath)).href);

  if(!embeddingProviderRegistry.list().some(p=>p.id==='localRandom')){
    console.error('FAIL: localRandom not registered; set PRIMUS_ENABLE_LOCAL_RANDOM=1');
    process.exit(1);
  }
  embeddingProviderRegistry.setActive('localRandom');
  embeddingProviderRegistry.setBatchSize(32);

  // Perform two batches so metrics increment
  const texts1 = Array.from({length:40}, (_,i)=>`alpha ${i}`);
  const texts2 = Array.from({length:25}, (_,i)=>`beta ${i}`);
  await embeddingProviderRegistry.embedBatch({ texts: texts1 });
  await embeddingProviderRegistry.embedBatch({ texts: texts2 });

  // Metrics persisted asynchronously every 15s; we can read in-memory by re-importing metrics file or using a stats IPC.
  // Simplest approach: trigger stats IPC via direct ipcMain handler invocation is complex outside Electron runtime.
  // Instead read metrics persistence file after forcing a manual metrics flush by touching provider registry again (persist timer might not have fired yet).

  // Force immediate persistence so we don't rely on 15s interval
  if(metricsMod.forcePersistProviderMetrics){ metricsMod.forcePersistProviderMetrics(); }

  const metricsFile = path.join(process.cwd(),'artifacts','ai','metrics.json');
  if(!fs.existsSync(metricsFile)){
    console.error('FAIL: metrics file not found (persistence interval maybe not elapsed)');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(metricsFile,'utf8'));
  const rec = raw.providers.find(p=> p.providerId==='localRandom');
  if(!rec){ console.error('FAIL: metrics for localRandom not found', raw.providers.map(p=>p.providerId)); process.exit(1);}  
  if(!rec.embeddingBatches || rec.embeddingBatches < 2){ console.error('FAIL: expected embeddingBatches>=2 got', rec.embeddingBatches); process.exit(1);}  
  if(!rec.embeddingItems || rec.embeddingItems < (texts1.length + texts2.length)){ console.error('FAIL: embeddingItems too low', rec.embeddingItems); process.exit(1);}  
  if(typeof rec.embeddingTimeMs !== 'number' || rec.embeddingTimeMs <= 0){ console.error('FAIL: embeddingTimeMs missing/invalid', rec.embeddingTimeMs); process.exit(1);}  
  console.log('PASS embedding telemetry aggregation test');
}
run().catch(e=> { console.error('FAIL: uncaught error', e); process.exit(1); });
