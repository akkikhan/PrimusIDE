#!/usr/bin/env node
/**
 * Mutate a task's lifecycleStatus and statusHistory.
 * Usage:
 *   node scripts/automation/workTask.cjs start <id>
 *   node scripts/automation/workTask.cjs complete <id>
 *   node scripts/automation/workTask.cjs reset <id>
 * Flags:
 *   --force : allow start on in-progress; allow complete on done (no-op)
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TASKS_JSON = path.join(ROOT,'tasks_all.json');

const args = process.argv.slice(2);
if(args.length < 2 || ['-h','--help'].includes(args[0])){
  console.log(`Usage: workTask <action> <id>\nActions: start | complete | reset`);
  process.exit(0);
}
const action = args[0];
const id = parseInt(args[1],10);
const force = args.includes('--force');

if(!['start','complete','reset'].includes(action)){
  console.error('Invalid action');
  process.exit(1);
}
if(isNaN(id)){
  console.error('Invalid id');
  process.exit(1);
}

function load(){ return JSON.parse(fs.readFileSync(TASKS_JSON,'utf8')); }
function save(data){ fs.writeFileSync(TASKS_JSON, JSON.stringify(data,null,2)+'\n'); }

function pushStatus(t,newStatus){
  t.lifecycleStatus = newStatus;
  if(!Array.isArray(t.statusHistory)) t.statusHistory = [];
  t.statusHistory.push({date:new Date().toISOString(), status:newStatus});
  t.updatedAt = new Date().toISOString();
  t.updatedByScript = 'workTask';
}

function main(){
  if(!fs.existsSync(TASKS_JSON)){
    console.error('tasks_all.json missing');
    process.exit(1);
  }
  const data = load();
  const task = data.tasks.find(t=> t.id === id);
  if(!task){
    console.error(`Task ${id} not found`);
    process.exit(1);
  }
  const current = task.lifecycleStatus || 'planned';
  if(action === 'start'){
    if(current !== 'planned' && !force){
      console.error(`Cannot start task ${id}; current lifecycle=${current}`);
      process.exit(2);
    }
    pushStatus(task,'in-progress');
  } else if(action === 'complete'){
    if(!['in-progress','verifying','planned'].includes(current) && !force){
      console.error(`Cannot complete task ${id}; lifecycle=${current}`);
      process.exit(2);
    }
    pushStatus(task,'done');
  } else if(action === 'reset'){
    if(current === 'planned' && !force){
      console.error(`Task ${id} already planned.`);
      process.exit(2);
    }
    pushStatus(task,'planned');
  }
  save(data);
  console.log(`Task ${id} lifecycle updated to ${task.lifecycleStatus}`);
}

main();
