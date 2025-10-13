#!/usr/bin/env node
/**
 * Smoke test for autopilot --auto and new batch pass-through flags.
 */
const { execSync } = require('child_process');
function run(cmd){
  console.log('> ' + cmd);
  try { execSync(cmd,{stdio:'inherit'}); } catch(e){ console.error('Command failed:', e.message); }
}

run('node scripts/automation/autopilot.cjs --auto --size=3 --dry-run --empty-first --max-in-progress=4 --limit-impact=3');
run('node scripts/automation/autopilot.cjs --iterations=1 --size=2 --dry-run --only-empty --exclude=1,2,3');
