#!/usr/bin/env node
/**
 * Smoke test for objective presets, recent exclusion, diff generation, and history ledger.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
function run(cmd){ console.log('> '+cmd); execSync(cmd,{stdio:'inherit'}); }

// First batch (value objective)
run('node scripts/automation/nextBatch.cjs --size=4 --objective=value --explain --diff-prev --dry-run');
// Second batch applying no-recent=1 to exclude previous batch ids and diff again
run('node scripts/automation/nextBatch.cjs --size=4 --objective=fill-gaps --no-recent=1 --explain --diff-prev --dry-run');

const diffPath = path.join(process.cwd(),'artifacts','batch_diff.json');
if(fs.existsSync(diffPath)){
  const diff = JSON.parse(fs.readFileSync(diffPath,'utf8'));
  console.log('Diff added IDs:', diff.added);
  console.log('Diff removed IDs:', diff.removed);
}

const historyPath = path.join(process.cwd(),'artifacts','batch_history.ndjson');
if(fs.existsSync(historyPath)){
  const lines = fs.readFileSync(historyPath,'utf8').trim().split(/\n+/);
  console.log('History lines:', lines.length);
}
