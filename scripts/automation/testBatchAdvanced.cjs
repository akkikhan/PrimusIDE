#!/usr/bin/env node
/**
 * Smoke test for advanced batching features: --dump-candidates, --explain, policy checker.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
function run(cmd, opts={failOk:false}){ 
	console.log('> '+cmd); 
	try { execSync(cmd,{stdio:'inherit'}); }
	catch(e){ if(!opts.failOk) throw e; else console.log('[allowed-failure] command exited with code', e.status); }
}

// Generate initial batch (value objective) with candidates + explain + diff for baseline
run('node scripts/automation/nextBatch.cjs --size=4 --objective=value --explain --dump-candidates --diff-prev --dry-run');

// Generate second batch with recent exclusion + diff to produce volatility metrics
run('node scripts/automation/nextBatch.cjs --size=4 --objective=fill-gaps --no-recent=1 --explain --diff-prev --dry-run');

// Inspect explain
const explainPath = path.join(process.cwd(),'artifacts','batch_explain.json');
if(!fs.existsSync(explainPath)) throw new Error('batch_explain.json missing');
const explain = JSON.parse(fs.readFileSync(explainPath,'utf8'));
console.log('Explain rationale entries:', explain.rationale.length);
console.log('Sample composite score:', explain.rationale[0].compositeScore);

// Validate diff volatility metrics
const diffPath = path.join(process.cwd(),'artifacts','batch_diff.json');
if(fs.existsSync(diffPath)){
	const diff = JSON.parse(fs.readFileSync(diffPath,'utf8'));
	if(typeof diff.volatility !== 'number') throw new Error('volatility missing in batch_diff.json');
	console.log('Volatility:', diff.volatility, 'OverlapRatio:', diff.overlapRatio);
}

// Policy check (standalone)
run('node scripts/automation/checkBatchPolicy.cjs', { failOk:true });

// Inline enforcement test: expect possible exit 2 without crashing test (allow failure)
run('node scripts/automation/nextBatch.cjs --size=4 --explain --enforce-policy --dry-run', { failOk:true });
console.log('Advanced batch test complete.');
