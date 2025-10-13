#!/usr/bin/env node
/**
 * Scan repository for inline task references // TASK:<id> and build trace_map.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TRACE_FILE = path.join(ROOT, 'trace_map.json');

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'task-snapshots', 'gherkin-features']);
const TASK_REF_REGEX = /TASK:(\d+)/g;

function walk(dir, files){
  for(const entry of fs.readdirSync(dir)){
    if(EXCLUDE_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if(stat.isDirectory()) walk(full, files);
    else if(stat.isFile()) files.push(full);
  }
}

function main(){
  const files = [];
  walk(ROOT, files);
  const map = {};
  for(const file of files){
    const rel = path.relative(ROOT, file).replace(/\\/g,'/');
    const content = fs.readFileSync(file,'utf8');
    let match;
    while((match = TASK_REF_REGEX.exec(content))){
      const id = match[1];
      if(!map[id]) map[id] = [];
      map[id].push({ file: rel, index: match.index });
    }
  }
  fs.writeFileSync(TRACE_FILE, JSON.stringify({generatedAt:new Date().toISOString(), references: map}, null, 2),'utf8');
  console.log('Trace map written to', path.relative(ROOT, TRACE_FILE));
}

main();
