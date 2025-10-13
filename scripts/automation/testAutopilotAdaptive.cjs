#!/usr/bin/env node
/**
 * Test adaptive autopilot features: --adaptive-objective, --policy-enforce, volatility gating.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
function run(cmd){ console.log('> '+cmd); try { execSync(cmd,{stdio:'inherit'}); } catch(e){ console.log('[allowed-failure] code', e.status); } }

// Prime one batch for baseline history
run('node scripts/automation/nextBatch.cjs --size=3 --objective=value --diff-prev --dry-run');
// Run adaptive autopilot dry-run for a few iterations
run('node scripts/automation/autopilot.cjs --auto --dry-run --adaptive-objective --policy-enforce --skip-code-ref --no-pipeline --size=3 --dry-run-limit=3');

// Inspect trend
const trendFile = path.join(process.cwd(),'artifacts','batch_trend.json');
if(fs.existsSync(trendFile)){
  const trend = JSON.parse(fs.readFileSync(trendFile,'utf8'));
  console.log('Trend records:', trend.records.length, 'Avg volatility:', trend.stats?.volatilityAvg);
}
console.log('Adaptive autopilot test complete.');
