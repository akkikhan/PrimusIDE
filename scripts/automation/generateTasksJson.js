#!/usr/bin/env node
/**
 * Parse ALL_TASKS.md into structured JSON (tasks_all.json) with enrichment placeholders.
 * - Robust against category heading variations.
 * - Assumes tasks are numbered sequentially: ^<number>. <title>
 * - Extracts status tokens in square brackets at end of title like [IMPL], [TODO], etc.
 * - Category determined from the most recent 'Category <n>:' heading above task.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INPUT_MD = path.join(ROOT, 'ALL_TASKS.md');
const OUTPUT_JSON = path.join(ROOT, 'tasks_all.json');
const SNAPSHOT_DIR = path.join(ROOT, 'task-snapshots');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, {recursive:true}); }

function parse(){
  const md = fs.readFileSync(INPUT_MD,'utf8').split(/\r?\n/);
  const tasks = [];
  let currentCategory = null;
  let currentCategoryName = null;
  const catRegex = /^#+\s*Category\s+(\d+)\s*[:\-]\s*(.+)$/i;
  const taskRegex = /^(\d+)\.\s+(.*)$/; // capture id and rest
  const statusRegex = /\[(SPEC|IMPL|TODO|DERIVED|FUTURE)\]$/i;

  for(const line of md){
    const catMatch = line.match(catRegex);
    if(catMatch){
      currentCategory = parseInt(catMatch[1],10);
      currentCategoryName = catMatch[2].trim();
      continue;
    }
    const tMatch = line.match(taskRegex);
    if(tMatch){
      const id = parseInt(tMatch[1],10);
      let title = tMatch[2].trim();
      let status = 'UNKNOWN';
      const sMatch = title.match(statusRegex);
      if(sMatch){
        status = sMatch[1].toUpperCase();
        title = title.replace(statusRegex,'').trim();
      }
      tasks.push({
        id,
        title,
        categoryNumber: currentCategory,
        category: currentCategoryName,
        status,
        userStory: '',
        validationSteps: [],
        acceptanceCriteria: [],
        sources: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }
  return tasks;
}

function writeJSON(tasks){
  const out = { generatedAt: new Date().toISOString(), total: tasks.length, tasks };
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(out,null,2),'utf8');
  console.log(`Wrote ${tasks.length} tasks to ${path.relative(ROOT, OUTPUT_JSON)}`);
}

function writeSnapshot(tasks){
  ensureDir(SNAPSHOT_DIR);
  const file = path.join(SNAPSHOT_DIR, `tasks_${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({total: tasks.length, tasks}, null, 2),'utf8');
  console.log('Snapshot saved:', path.relative(ROOT,file));
}

function main(){
  if(!fs.existsSync(INPUT_MD)){
    console.error('Missing ALL_TASKS.md');
    process.exit(1);
  }
  const tasks = parse();
  writeJSON(tasks);
  if(process.argv.includes('--snapshot')) writeSnapshot(tasks);
}

main();
