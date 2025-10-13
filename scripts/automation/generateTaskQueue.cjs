#!/usr/bin/env node
/**
 * Generate a prioritized queue (markdown + json) of remaining planned tasks.
 * Outputs:
 *  - artifacts/tasks_queue.md
 *  - artifacts/tasks_queue.json
 * Sorting heuristic: lifecycle planned first, then placeholderAdded, then impactScore desc, priorityScore desc, id asc.
 */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const TASKS_JSON = path.join(ROOT,'tasks_all.json');
const ART = path.join(ROOT,'artifacts');
if(!fs.existsSync(ART)) fs.mkdirSync(ART);

function load(){ return JSON.parse(fs.readFileSync(TASKS_JSON,'utf8')); }

function sortTasks(tasks){
  return tasks.filter(t=> (t.lifecycleStatus||'planned')==='planned')
    .sort((a,b)=>{
      if(a.placeholderAdded && !b.placeholderAdded) return -1;
      if(b.placeholderAdded && !a.placeholderAdded) return 1;
      const i = (b.impactScore||0) - (a.impactScore||0);
      if(i!==0) return i;
      const p = (b.priorityScore||0) - (a.priorityScore||0);
      if(p!==0) return p;
      return a.id - b.id;
    });
}

function toMarkdown(list){
  const header = '# Task Queue (Planned)\n\n| # | ID | Title | Impact | Priority | Placeholder | Category |\n|---|---|---|---|---|---|---|';
  const lines = list.map((t,idx)=>`| ${idx+1} | ${t.id} | ${t.title.replace(/\|/g,'/')} | ${t.impactScore?.toFixed(2)??''} | ${t.priorityScore?.toFixed(2)??''} | ${t.placeholderAdded?'yes':'no'} | ${t.category||''} |`);
  return header + '\n' + lines.join('\n') + '\n';
}

function main(){
  if(!fs.existsSync(TASKS_JSON)){
    console.error('tasks_all.json missing');
    process.exit(1);
  }
  const data = load();
  const sorted = sortTasks(data.tasks);
  fs.writeFileSync(path.join(ART,'tasks_queue.json'), JSON.stringify({generatedAt:new Date().toISOString(), count: sorted.length, tasks: sorted.map(t=>({id:t.id,title:t.title,impact:t.impactScore,priority:t.priorityScore,placeholder:!!t.placeholderAdded}))},null,2));
  fs.writeFileSync(path.join(ART,'tasks_queue.md'), toMarkdown(sorted));
  console.log(`Queue generated with ${sorted.length} tasks -> artifacts/tasks_queue.*`);
}

main();
