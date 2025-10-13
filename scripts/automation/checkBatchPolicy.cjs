#!/usr/bin/env node
/**
 * Batch policy checker.
 * Reads batch_summary.json (and optional batch_config.json) and enforces policy thresholds.
 * Exit codes:
 *  0 success
 *  2 policy violation(s)
 */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const SUMMARY = path.join(ROOT,'artifacts','batch_summary.json');
const CONFIG = path.join(ROOT,'batch_config.json');

let summary; let config = { policy: { maxEmptyRatio: 0.6, maxPlaceholderRatio: 0.7 } };
try { summary = JSON.parse(fs.readFileSync(SUMMARY,'utf8')); } catch(e){
  console.error('Failed to read batch_summary.json:', e.message);
  process.exit(1);
}
try {
  if(fs.existsSync(CONFIG)){
    const userCfg = JSON.parse(fs.readFileSync(CONFIG,'utf8'));
    if(userCfg.policy) config.policy = { ...config.policy, ...userCfg.policy };
  }
} catch(e){ console.warn('Failed to parse batch_config.json:', e.message); }

const batchSize = summary.actualSize || 0;
if(batchSize === 0){
  console.log('No tasks in batch; nothing to enforce.');
  process.exit(0);
}
const empty = summary.stats.emptySelected || 0;
const placeholders = summary.stats.placeholdersSelected || 0;
const emptyRatio = empty / batchSize;
const placeholderRatio = placeholders / batchSize;

const violations = [];
if(emptyRatio > config.policy.maxEmptyRatio){
  violations.push({ policy: 'maxEmptyRatio', value: emptyRatio, limit: config.policy.maxEmptyRatio });
}
if(placeholderRatio > config.policy.maxPlaceholderRatio){
  violations.push({ policy: 'maxPlaceholderRatio', value: placeholderRatio, limit: config.policy.maxPlaceholderRatio });
}

if(violations.length){
  console.error('Batch policy violations:', JSON.stringify(violations,null,2));
  process.exit(2);
} else {
  console.log('Batch policy OK. EmptyRatio=' + emptyRatio.toFixed(2) + ' PlaceholderRatio=' + placeholderRatio.toFixed(2));
}
