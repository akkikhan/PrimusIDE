// Test reindex cancellation using the reindexManager IPC interface (compiled main required)
// Usage: node test/reindexCancel.test.js
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const distMain = path.resolve(__dirname, '../dist/main/main');
const reindexManagerPath = path.join(distMain, 'ai/retrieval/reindexManager.js');

function must(p){ if(!fs.existsSync(p)){ console.error('FAIL: missing compiled module', p); process.exit(1);} return p; }

async function run(){
  const { reindexManager } = await import(url.pathToFileURL(must(reindexManagerPath)).href);
  // Start a reindex
  const start = await reindexManager.startFull(/\.(ts|js)$/i, 1000);
  if(!start.started){ console.error('FAIL: could not start reindex', start); process.exit(1);}  
  const runId = start.runId;
  let sawProgress = false;
  let cancelIssued = false;
  reindexManager.on('progress', p => {
    if(p.runId === runId && p.processed > 0 && !cancelIssued){
      sawProgress = true;
      const res = reindexManager.cancel(runId);
      cancelIssued = true;
      if(!res.cancelled){ console.error('FAIL: cancellation request failed', res); process.exit(1);}  
    }
  });
  await new Promise(resolve => {
    reindexManager.on('complete', _ => resolve(null));
  });
  const summary = reindexManager.getLastSummary();
  if(!sawProgress){ console.error('FAIL: never received progress before cancel'); process.exit(1);}  
  if(!summary || summary.runId !== runId){ console.error('FAIL: missing summary'); process.exit(1);}  
  if(!summary.cancelled){ console.error('FAIL: summary.cancelled expected true', summary); process.exit(1);}  
  console.log('PASS reindex cancellation test');
}
run().catch(e=> { console.error('FAIL: uncaught error', e); process.exit(1); });
