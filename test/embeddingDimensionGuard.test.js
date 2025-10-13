// Verifies dimension mismatch guard clears vector store on provider switch.
// Precondition: build main with PRIMUS_ENABLE_LOCAL_RANDOM=1 so localRandom registers.
// Usage: $env:PRIMUS_ENABLE_LOCAL_RANDOM='1'; npm run build:main; node test/embeddingDimensionGuard.test.js
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const distMain = path.resolve(__dirname, '../dist/main/main');
const registryPath = path.join(distMain, 'ai/embeddings/providerRegistry.js');
const telemetryPath = path.join(distMain, 'ai/embeddings/embeddingTelemetry.js');
const vectorStorePath = path.join(distMain, 'ai/retrieval/vectorStore.js');

function must(p){ if(!fs.existsSync(p)){ console.error('FAIL: missing compiled module', p); process.exit(1);} return p; }

async function run(){
  const { embeddingProviderRegistry } = await import(url.pathToFileURL(must(registryPath)).href);
  const { vectorStore } = await import(url.pathToFileURL(must(vectorStorePath)).href);
  // Sanity: initial provider placeholder 128
  const active = embeddingProviderRegistry.getActive();
  if(active.info.dimensions !== 128){ console.error('FAIL: expected initial provider dim 128 got', active.info.dimensions); process.exit(1);}  

  // Seed vector store with one pseudo vector to set dim
  vectorStore.addAll([{ id:'dummy:0', source:'dummy', values: new Array(128).fill(0.01) }]);
  const beforeSnap = vectorStore.snapshot();
  if(beforeSnap.dim !== 128 || beforeSnap.vectorCount !== 1){ console.error('FAIL: precondition vector store snapshot mismatch', beforeSnap); process.exit(1);}  

  // Ensure localRandom provider present
  const list = embeddingProviderRegistry.list().map(p=>p.id);
  if(!list.includes('localRandom')){ console.error('FAIL: localRandom not registered (need PRIMUS_ENABLE_LOCAL_RANDOM=1)'); process.exit(1);}  

  // Switch to localRandom (256 dim) -> should clear store
  embeddingProviderRegistry.setActive('localRandom');
  const afterSnap = vectorStore.snapshot();
  if(afterSnap.dim !== undefined && afterSnap.vectorCount !== 0){
    console.error('FAIL: expected vector store cleared, snapshot', afterSnap);
    process.exit(1);
  }
  console.log('PASS embedding dimension guard test');
}
run().catch(e=> { console.error('FAIL: uncaught error', e); process.exit(1); });
