#!/usr/bin/env node
/**
 * tasksStatusBoardWatch.cjs
 * Watches task source files and regenerates the status board artifacts on change.
 */
const path = require('path');
const { spawn } = require('child_process');
let chokidar;
try { chokidar = require('chokidar'); } catch { console.error('Please install chokidar: npm i -D chokidar'); process.exit(1); }

const ROOT = process.cwd();
const WATCH_FILES = [
  path.join(ROOT,'tasks_all.json'),
  path.join(ROOT,'artifacts','tasks-kpi.json')
];

let running = false; let queued = false;
function run(){
  if(running){ queued = true; return; }
  running = true; console.log('[watch] generating...');
  const child = spawn(process.execPath, ['scripts/automation/tasksStatusBoard.cjs'], { stdio:'inherit' });
  child.on('exit', code => {
    running = false; console.log('[watch] generation complete code='+code);
    if(queued){ queued=false; run(); }
  });
}

console.log('[watch] Watching task sources for changes...');
const watcher = chokidar.watch(WATCH_FILES, { ignoreInitial:true, awaitWriteFinish:{ stabilityThreshold:250, pollInterval:50 } });
watcher.on('add', run).on('change', run).on('unlink', run);
run();
