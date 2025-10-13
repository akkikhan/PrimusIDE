// Validate that a successful (non-cancelled) reindex run persists summary and lastSummary returns it.
// Precondition: main compiled (npm run build:main or full build)
// Usage: node test/reindexSummary.test.js
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const distMain = path.resolve(__dirname, '../dist/main/main');
const reindexManagerPath = path.join(distMain, 'ai/retrieval/reindexManager.js');

function must(p){ if(!fs.existsSync(p)){ console.error('FAIL: missing compiled module', p); process.exit(1);} return p; }

async function run(){
  const { reindexManager } = await import(url.pathToFileURL(must(reindexManagerPath)).href);
  // Start with small limit so it completes fast
  const start = await reindexManager.startFull(/\.(ts|js)$/i, 30);
  if(!start.started){ console.error('FAIL: could not start reindex', start); process.exit(1);}  
  const runId = start.runId;
  await new Promise(resolve => reindexManager.on('complete', resolve));
  const summary = reindexManager.getLastSummary();
  if(!summary){ console.error('FAIL: no summary returned'); process.exit(1);}  
  if(summary.runId !== runId){ console.error('FAIL: runId mismatch', summary.runId, runId); process.exit(1);}  
  if(summary.cancelled){ console.error('FAIL: expected non-cancelled summary', summary); process.exit(1);}  
  if(typeof summary.vectors !== 'number'){ console.error('FAIL: vectors missing', summary); process.exit(1);}  
  // Check persisted file
  const filePath = path.join(process.cwd(), 'artifacts','ai','reindex-summary.json');
  if(!fs.existsSync(filePath)){ console.error('FAIL: persisted summary file missing', filePath); process.exit(1);}  
  const disk = JSON.parse(fs.readFileSync(filePath,'utf8'));
  if(disk.runId !== runId){ console.error('FAIL: persisted runId mismatch', disk.runId, runId); process.exit(1);}  
  console.log('PASS reindex summary persistence test');
}
run().catch(e=> { console.error('FAIL: uncaught error', e); process.exit(1); });
