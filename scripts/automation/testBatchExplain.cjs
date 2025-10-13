#!/usr/bin/env node
/**
 * Smoke test for --explain flag on nextBatch.cjs.
 * Generates a small batch with explanation JSON and prints key fields.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd){
  console.log('> '+cmd);
  execSync(cmd,{stdio:'inherit'});
}

run('node scripts/automation/nextBatch.cjs --size=3 --explain --dry-run --empty-first');
const explainFile = path.join(process.cwd(),'artifacts','batch_explain.json');
if(!fs.existsSync(explainFile)){
  console.error('batch_explain.json not found');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(explainFile,'utf8'));
console.log('Explain size:', data.size);
console.log('First rationale entry:', data.rationale[0]);
