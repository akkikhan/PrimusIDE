#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TASKS_JSON = path.join(ROOT, 'tasks_all.json');
const OUT_DIR = path.join(ROOT, 'gherkin-features');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function sanitize(str){ return str.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase(); }

function main(){
  if(!fs.existsSync(TASKS_JSON)){
    console.error('tasks_all.json not found. Run generateTasksJson first.');
    process.exit(1);
  }
  ensureDir(OUT_DIR);
  const data = JSON.parse(fs.readFileSync(TASKS_JSON,'utf8'));
  const byCat = new Map();
  for(const t of data.tasks){
    if(!byCat.has(t.categoryNumber)) byCat.set(t.categoryNumber, { name: t.category, tasks: []});
    byCat.get(t.categoryNumber).tasks.push(t);
  }
  for(const [catNum, info] of byCat.entries()){
    const fileName = `category-${catNum}-${sanitize(info.name||'category')}.feature`;
    const lines = [];
    lines.push(`Feature: Category ${catNum} - ${info.name}`);
    lines.push('  # Auto-generated from tasks_all.json');
    lines.push('');
    info.tasks.sort((a,b)=>a.id-b.id).forEach(task => {
      lines.push(`  Scenario: ${task.id} ${task.title}`);
      lines.push('    Given the task is defined in the backlog');
      lines.push('    When implementation is executed');
      lines.push('    Then acceptance criteria are satisfied');
      lines.push('');
    });
    fs.writeFileSync(path.join(OUT_DIR, fileName), lines.join('\n'),'utf8');
  }
  console.log(`Exported ${byCat.size} feature files to ${path.relative(ROOT, OUT_DIR)}`);
}

main();