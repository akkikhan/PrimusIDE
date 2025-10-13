#!/usr/bin/env node
/**
 * Generate tasks_matrix.md for quick visual oversight.
 * Columns: ID | Status | Lifecycle | Placeholder | Story? | Criteria Count | Title
 */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const TASKS_JSON = path.join(ROOT,'tasks_all.json');
const MATRIX_MD = path.join(ROOT,'tasks_matrix.md');

function load(){ return JSON.parse(fs.readFileSync(TASKS_JSON,'utf8')); }

function main(){
  if(!fs.existsSync(TASKS_JSON)){
    console.error('tasks_all.json missing');
    process.exit(1);
  }
  const data = load();
  const header = '# Tasks Matrix\n\n| ID | Status | Lifecycle | Placeholder | Story | Criteria | Title |\n|---|---|---|---|---|---|---|';
  const lines = data.tasks.map(t=>{
    const story = t.userStory && t.userStory.trim() ? 'yes':'no';
    const criteria = Array.isArray(t.acceptanceCriteria)? t.acceptanceCriteria.length : 0;
    const placeholder = t.placeholderAdded ? 'yes':'no';
    const lifecycle = t.lifecycleStatus || '';
    const title = (t.title||'').replace(/\|/g,'/');
    return `| ${t.id} | ${t.status} | ${lifecycle} | ${placeholder} | ${story} | ${criteria} | ${title} |`;
  });
  fs.writeFileSync(MATRIX_MD, header + '\n' + lines.join('\n') + '\n');
  console.log(`tasks_matrix.md written (${lines.length} rows).`);
}

main();
