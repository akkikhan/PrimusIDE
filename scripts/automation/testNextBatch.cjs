#!/usr/bin/env node
/**
 * Lightweight smoke test for nextBatch.cjs flags.
 * Usage: node scripts/automation/testNextBatch.cjs
 */
const { execSync } = require('child_process');
function run(cmd){
  console.log('> ' + cmd);
  try {
    const out = execSync(cmd,{stdio:'pipe'}).toString();
    console.log(out.trim());
  } catch(e){
    console.error('Command failed', e.status, e.message);
    if(e.stdout) console.error(e.stdout.toString());
    if(e.stderr) console.error(e.stderr.toString());
  }
}

run('node scripts/automation/nextBatch.cjs --size=3');
run('node scripts/automation/nextBatch.cjs --size=2 --skip-placeholders');
run('node scripts/automation/nextBatch.cjs --size=2 --inject-placeholders');
run('node scripts/automation/nextBatch.cjs --size=2 --start --max-in-progress=4');
run('node scripts/automation/nextBatch.cjs --size=2 --category=Core');
run('node scripts/automation/nextBatch.cjs --size=2 --limit-impact=5');
run('node scripts/automation/nextBatch.cjs --size=2 --dry-run --start --max-in-progress=3');
run('node scripts/automation/nextBatch.cjs --size=3 --exclude=1,2,3');
run('node scripts/automation/nextBatch.cjs --size=3 --only-empty');
run('node scripts/automation/nextBatch.cjs --size=3 --empty-first');
run('node scripts/automation/nextBatch.cjs --size=2 --json-out=artifacts/custom_batch.json');
