#!/usr/bin/env node
/**
 * semanticDiffStub.cjs
 * Lightweight snapshot + diff stub.
 * Captures file hashes for a filtered set of source files and compares to previous snapshot.
 * Output: artifacts/semantic/semantic_diff_report.json
 * NOTE: This is a structural placeholder; future enhancement will parse ASTs.
 * Flags:
 *   --paths=glob1,glob2 (comma-separated simple suffix filters, e.g. .ts,.tsx)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const ART = path.join(ROOT,'artifacts');
const SEM_DIR = path.join(ART,'semantic');
const SNAP_FILE = path.join(SEM_DIR,'semantic_snapshot.json');
const REPORT_FILE = path.join(SEM_DIR,'semantic_diff_report.json');

const args = process.argv.slice(2);
function value(prefix){ const f=args.find(a=>a.startsWith(prefix+'=')); return f? f.split('=')[1]: undefined; }

const suffixes = (value('--paths')||'.ts,.tsx,.cjs,.js').split(',').map(s=>s.trim());

function hash(content){ return crypto.createHash('sha1').update(content).digest('hex'); }

function walk(dir, list=[]){
  const ents = fs.readdirSync(dir,{withFileTypes:true});
  for(const e of ents){
    if(e.name.startsWith('.')) continue;
    const full = path.join(dir,e.name);
    if(e.isDirectory()) walk(full,list); else list.push(full);
  }
  return list;
}

function filterFiles(all){
  return all.filter(f=> suffixes.some(s=> f.endsWith(s)))
            .filter(f=> f.includes(path.join('src'))); // only source tree
}

function snapshot(){
  const files = filterFiles(walk(ROOT));
  const map = {};
  files.forEach(f=>{
    try { const c = fs.readFileSync(f,'utf8'); map[path.relative(ROOT,f)] = {hash: hash(c), bytes: c.length}; } catch(_){}
  });
  return map;
}

function diff(prev, curr){
  const added=[]; const removed=[]; const changed=[];
  const prevKeys = new Set(Object.keys(prev));
  const currKeys = new Set(Object.keys(curr));
  currKeys.forEach(k=>{ if(!prevKeys.has(k)) added.push(k); else if(prev[k].hash!==curr[k].hash) changed.push(k); });
  prevKeys.forEach(k=>{ if(!currKeys.has(k)) removed.push(k); });
  return {added, removed, changed};
}

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

function main(){
  ensureDir(SEM_DIR);
  const curr = snapshot();
  let prev={};
  if(fs.existsSync(SNAP_FILE)) prev = JSON.parse(fs.readFileSync(SNAP_FILE,'utf8'));
  const d = diff(prev,curr);
  const report = { generatedAt: new Date().toISOString(), fileCounts: { previous: Object.keys(prev).length, current: Object.keys(curr).length }, diff: d };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report,null,2));
  fs.writeFileSync(SNAP_FILE, JSON.stringify(curr,null,2));
  console.log(`Semantic diff stub report written: ${REPORT_FILE}`);
}

main();
