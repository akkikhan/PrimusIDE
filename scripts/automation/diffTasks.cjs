#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CURRENT_JSON = path.join(ROOT, 'tasks_all.json');
const SNAPSHOT_DIR = path.join(ROOT, 'task-snapshots');
const STATUS_LOG = path.join(ROOT, 'status-transitions.log');

function loadLatestSnapshot(){
  if(!fs.existsSync(SNAPSHOT_DIR)) return null;
  const files = fs.readdirSync(SNAPSHOT_DIR).filter(f=>f.startsWith('tasks_') && f.endsWith('.json')).sort();
  if(!files.length) return null;
  const latest = files[files.length-1];
  return JSON.parse(fs.readFileSync(path.join(SNAPSHOT_DIR, latest),'utf8'));
}

function indexById(arr){
  const map = new Map();
  for(const t of arr) map.set(t.id, t);
  return map;
}

function main(){
  if(!fs.existsSync(CURRENT_JSON)){
    console.error('Run generateTasksJson first.');
    process.exit(1);
  }
  const current = JSON.parse(fs.readFileSync(CURRENT_JSON,'utf8'));
  const snap = loadLatestSnapshot();
  const nowTasks = current.tasks || [];
  const prevTasks = snap ? (snap.tasks || []) : [];

  const nowIdx = indexById(nowTasks);
  const prevIdx = indexById(prevTasks);

  const added = [];
  const removed = [];
  const statusChanges = [];
  for(const t of nowTasks){
    if(!prevIdx.has(t.id)) added.push(t);
    else {
      const prev = prevIdx.get(t.id);
      if(prev.status !== t.status) statusChanges.push({id:t.id, from:prev.status, to:t.status, title:t.title});
    }
  }
  for(const t of prevTasks){ if(!nowIdx.has(t.id)) removed.push(t); }

  const lines = [];
  lines.push('# Task Diff Report');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Current Total: ${nowTasks.length}`);
  if(snap) lines.push(`Previous Total: ${prevTasks.length}`); else lines.push('Previous Total: (none)');
  lines.push('');
  lines.push(`Added: ${added.length}`);
  if(added.length){
    lines.push('## Added');
    for(const a of added){ lines.push(`- ${a.id}: ${a.title} [${a.status}]`); }
  }
  if(statusChanges.length){
    lines.push('');
    lines.push('## Status Changes');
    for(const c of statusChanges){ lines.push(`- ${c.id}: ${c.from} -> ${c.to} (${c.title})`); }
  // append transitions to log
  const logLines = statusChanges.map(c=>`${new Date().toISOString()}\t${c.id}\t${c.from}\t${c.to}\t${c.title}`);
  fs.appendFileSync(STATUS_LOG, logLines.join('\n')+'\n','utf8');
  }
  if(removed.length){
    lines.push('');
    lines.push('## Removed (unexpected)');
    for(const r of removed){ lines.push(`- ${r.id}: ${r.title} [${r.status}]`); }
  }
  console.log(lines.join('\n'));
}

main();