#!/usr/bin/env node
/**
 * guardTasks.cjs (Task 742)
 * Prevent unintended task deletion or ID reuse conflicts.
 * Exits non-zero on violations unless overridden by flags.
 *
 * Flags:
 *   --allow-delete    Permit removals (still reports)
 *   --strict          Treat contentHash changes as errors (else warnings)
 *   --json            Emit machine-readable JSON summary to stdout
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const TASKS_JSON = path.join(ROOT, 'tasks_all.json');
const SNAPSHOT_DIR = path.join(ROOT, 'task-snapshots');

function loadCurrent(){
  if(!fs.existsSync(TASKS_JSON)) throw new Error('tasks_all.json missing. Run generateTasksJson first.');
  return JSON.parse(fs.readFileSync(TASKS_JSON,'utf8'));
}
function loadLatestSnapshot(){
  if(!fs.existsSync(SNAPSHOT_DIR)) return null;
  const files = fs.readdirSync(SNAPSHOT_DIR).filter(f=>f.startsWith('tasks_')).sort();
  if(!files.length) return null;
  return JSON.parse(fs.readFileSync(path.join(SNAPSHOT_DIR, files[files.length-1]),'utf8'));
}

function sha1(str){ return crypto.createHash('sha1').update(str).digest('hex'); }

function indexById(tasks){ const m = new Map(); for(const t of tasks) m.set(t.id, t); return m; }

function detectDuplicates(tasks){
  const seen = new Map();
  const dups = [];
  for(const t of tasks){
    if(seen.has(t.id)) dups.push([t.id, seen.get(t.id).title, t.title]);
    else seen.set(t.id, t);
  }
  return dups;
}

function main(){
  const allowDelete = process.argv.includes('--allow-delete');
  const strict = process.argv.includes('--strict');
  const emitJson = process.argv.includes('--json');
  const current = loadCurrent();
  const snapshot = loadLatestSnapshot();
  const curTasks = current.tasks || [];
  const snapTasks = snapshot ? (snapshot.tasks || []) : [];
  const curIdx = indexById(curTasks);
  const snapIdx = indexById(snapTasks);

  const removed = [];
  const changed = [];
  for(const oldT of snapTasks){
    if(!curIdx.has(oldT.id)) removed.push(oldT);
    else {
      const now = curIdx.get(oldT.id);
      const prevHash = oldT.contentHash || sha1(`${oldT.id}|${oldT.title}|${oldT.status}`);
      if(now.contentHash && now.contentHash !== prevHash){
        changed.push({ id: now.id, from: prevHash, to: now.contentHash, titleBefore: oldT.title, titleAfter: now.title });
      }
    }
  }

  const duplicates = detectDuplicates(curTasks);
  let exitCode = 0;
  if(duplicates.length){ exitCode = 1; }
  if(removed.length && !allowDelete){ exitCode = 1; }
  if(strict && changed.length){ exitCode = 1; }

  const report = {
    generatedAt: new Date().toISOString(),
    currentCount: curTasks.length,
    previousCount: snapTasks.length,
    removed: removed.map(r=>({id:r.id,title:r.title})),
    changed,
    duplicates: duplicates.map(d=>({id:d[0], firstTitle:d[1], secondTitle:d[2]})),
    allowDelete,
    strict,
    status: exitCode === 0 ? 'PASS' : 'FAIL'
  };

  if(emitJson){
    console.log(JSON.stringify(report,null,2));
  } else {
    console.log('# Task Guard Report');
    console.log(`Status: ${report.status}`);
    if(duplicates.length){
      console.log('Duplicate IDs:');
      duplicates.forEach(d=>console.log(`  - ${d[0]} => "${d[1]}" | "${d[2]}"`));
    }
    if(removed.length){
      console.log(`Removed (${removed.length}):`);
      removed.forEach(r=>console.log(`  - ${r.id}: ${r.title}`));
    }
    if(changed.length){
      console.log(`Changed (${changed.length}):`);
      changed.forEach(c=>console.log(`  - ${c.id}: title hash changed`));
    }
  }
  process.exit(exitCode);
}

main();
