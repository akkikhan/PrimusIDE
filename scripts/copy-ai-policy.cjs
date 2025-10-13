#!/usr/bin/env node
const { copyFileSync, existsSync, mkdirSync } = require('fs');
const path = require('path');

const src = path.join(process.cwd(), 'ai.policy.json');
const destDir = path.join(process.cwd(), 'dist');
const dest = path.join(destDir, 'ai.policy.json');
try {
  if(!existsSync(src)) {
    console.error('[copy-ai-policy] source ai.policy.json missing');
    process.exit(0); // non-fatal
  }
  mkdirSync(destDir, { recursive: true });
  copyFileSync(src, dest);
  console.log('[copy-ai-policy] copied ai.policy.json -> dist/');
} catch(e){
  console.error('[copy-ai-policy] failed', e);
  process.exit(1);
}
