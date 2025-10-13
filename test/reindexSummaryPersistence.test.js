// Test reindex summary persistence (non-cancelled run)
// Precondition: build main. Usage: node test/reindexSummaryPersistence.test.js
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const distMain = path.resolve(__dirname, '../dist/main/main');
const reindexManagerPath = path.join(distMain, 'ai/retrieval/reindexManager.js');

function must(p){ if(!fs.existsSync(p)){ console.error('FAIL: missing compiled module', p); process.exit(1);} return p; }

async function run(){
  const { reindexManager } = await import(url.pathToFileURL(must(reindexManagerPath)).href);
  // Start reindex restricted to js/ts for speed
  const start = await reindexManager.startFull(/\.(ts|js)$/i, 1000);
  if(!start.started){ console.error('FAIL: could not start reindex', start); process.exit(1);}  
  const runId = start.runId;
  await new Promise(resolve => reindexManager.on('complete', resolve));
  const summary = reindexManager.getLastSummary();
  if(!summary){ console.error('FAIL: no summary persisted'); process.exit(1);}  
  if(summary.runId !== runId){ console.error('FAIL: runId mismatch in summary', summary.runId, runId); process.exit(1);}  
  if(summary.cancelled){ console.error('FAIL: expected non-cancelled summary', summary); process.exit(1);}  
  if(typeof summary.totalFiles !== 'number' || summary.totalFiles === 0){ console.error('FAIL: totalFiles invalid', summary.totalFiles); process.exit(1);}  
  if(typeof summary.vectors !== 'number'){ console.error('FAIL: vectors missing', summary.vectors); process.exit(1);}  
  if(!summary.completedAt){ console.error('FAIL: completedAt timestamp missing', summary); process.exit(1);}  
  if(summary.durationMs <= 0){ console.error('FAIL: non-positive duration', summary.durationMs); process.exit(1);}  
  console.log('PASS reindex summary persistence test');
}
run().catch(e=> { console.error('FAIL: uncaught error', e); process.exit(1); });
