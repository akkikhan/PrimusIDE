#!/usr/bin/env node
/**
 * Basic integrity test for tasks_all.json (ESM)
 * Run with: node test/tasks_integrity.test.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TASKS = path.join(__dirname, '..', 'tasks_all.json');

function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1);} }

function main(){
  assert(fs.existsSync(TASKS), 'tasks_all.json missing');
  const data = JSON.parse(fs.readFileSync(TASKS,'utf8'));
  assert(Array.isArray(data.tasks), 'tasks array missing');
  const ids = data.tasks.map(t=>t.id);
  const sorted = [...ids].sort((a,b)=>a-b);
  const dup = sorted.find((v,i)=>i && v===sorted[i-1]);
  assert(!dup, 'Duplicate task id '+dup);
  const required = ['title','category','status','contentHash'];
  for(const t of data.tasks.slice(0,50)){
    for(const f of required){ assert(f in t, `Missing field ${f} in id ${t.id}`); }
  }
  console.log('PASS: tasks_all.json integrity basic checks OK (sampled).');
}

main();
