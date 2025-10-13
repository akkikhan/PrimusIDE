#!/usr/bin/env node
// Simple packaging preflight: ensure icon & policy & build config present
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function fail(msg){ console.error('[verify-pack] FAIL:', msg); process.exitCode = 1; }
function ok(msg){ console.log('[verify-pack] OK:', msg); }
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  if(!pkg.build) fail('package.json missing build config'); else ok('build config present');
  // icon
  const iconPath = path.join(root,'build-resources','icon.ico');
  if(fs.existsSync(iconPath)){ ok('icon.ico present'); } else fail('icon.ico missing (add build-resources/icon.ico)');
  // policy
  const policyPath = path.join(root,'ai.policy.json');
  if(fs.existsSync(policyPath)) ok('ai.policy.json present'); else fail('ai.policy.json missing');
  // dist dirs check hint
  if(!fs.existsSync(path.join(root,'dist','main'))) console.warn('[verify-pack] dist/main missing (run npm run build)');
  if(process.exitCode) {
    console.error('\nOne or more required assets missing. Aborting.');
  } else {
    console.log('\nAll critical packaging prerequisites satisfied.');
  }
} catch(e){ fail('Exception: '+ e.message); }
