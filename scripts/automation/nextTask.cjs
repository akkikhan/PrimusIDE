#!/usr/bin/env node
/**
 * Select the next task to work on and emit artifacts:
 *  artifacts/current_task.json
 *  artifacts/current_task.md
 *
 * Heuristic:
 *  - lifecycleStatus in [undefined, 'planned']
 *  - sort placeholderAdded desc, impactScore desc, priorityScore desc, id asc
 * Filters (optional flags):
 *  --skip-placeholders : ignore tasks with placeholderAdded
 *  --category="<substring>" : only tasks whose category includes substring (case-insensitive)
 *  --limit-impact <n> : only tasks with impactScore >= n
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TASKS_JSON = path.join(ROOT,'tasks_all.json');
const ART_DIR = path.join(ROOT,'artifacts');
if(!fs.existsSync(ART_DIR)) fs.mkdirSync(ART_DIR);

const args = process.argv.slice(2);
function flag(name){ return args.includes(name); }
function valueOf(prefix){ const f = args.find(a=> a.startsWith(prefix)); return f ? f.split('=')[1] : undefined; }

const skipPlaceholders = flag('--skip-placeholders');
const categoryFilter = valueOf('--category=');
const limitImpact = parseFloat(valueOf('--limit-impact='));

function load(){ return JSON.parse(fs.readFileSync(TASKS_JSON,'utf8')); }

function eligible(t){
  if(t.lifecycleStatus && t.lifecycleStatus !== 'planned') return false;
  if(skipPlaceholders && t.placeholderAdded) return false;
  if(categoryFilter && !(t.category||'').toLowerCase().includes(categoryFilter.toLowerCase())) return false;
  if(!isNaN(limitImpact) && (t.impactScore||0) < limitImpact) return false;
  return true;
}

function select(tasks){
  const pool = tasks.filter(eligible);
  pool.sort((a,b)=>{
    // placeholder first unless skipping
    if(a.placeholderAdded && !b.placeholderAdded && !skipPlaceholders) return -1;
    if(b.placeholderAdded && !a.placeholderAdded && !skipPlaceholders) return 1;
    // impact desc
    const i = (b.impactScore||0) - (a.impactScore||0);
    if(i!==0) return i;
    // priority desc
    const p = (b.priorityScore||0) - (a.priorityScore||0);
    if(p!==0) return p;
    return a.id - b.id;
  });
  return pool[0];
}

function writeArtifacts(task){
  const jsonPath = path.join(ART_DIR,'current_task.json');
  fs.writeFileSync(jsonPath, JSON.stringify(task,null,2));
  const mdPath = path.join(ART_DIR,'current_task.md');
  const lines = [];
  lines.push(`# Current Task: ${task.id} - ${task.title}`);
  lines.push('');
  lines.push(`Status: ${task.status}  | Lifecycle: ${task.lifecycleStatus||'planned'}  | Placeholder: ${task.placeholderAdded?'yes':'no'}`);
  lines.push(`Scores: impact=${task.impactScore} priority=${task.priorityScore} complexity=${task.complexityScore} risk=${task.riskScore}`);
  lines.push('');
  if(task.userStory){
    lines.push('## User Story');
    lines.push('');
    lines.push(task.userStory);
    lines.push('');
  }
  if(task.acceptanceCriteria && task.acceptanceCriteria.length){
    lines.push('## Acceptance Criteria');
    lines.push('');
    for(const c of task.acceptanceCriteria) lines.push(`- ${c}`);
    lines.push('');
  }
  lines.push('## Suggested Next Steps');
  lines.push('');
  if(task.placeholderAdded){
    lines.push('- Refine placeholder user story into concrete value statement.');
    lines.push('- Replace placeholder acceptance criteria with concrete measurable outcomes.');
  } else {
    lines.push('- Implement code changes referencing // TASK:' + task.id + ' in relevant modules.');
    lines.push('- Add tests validating each acceptance criterion.');
  }
  lines.push('- Run npm run tasks:pipeline after implementation to update trace & lifecycle.');
  lines.push('');
  fs.writeFileSync(mdPath, lines.join('\n'));
  return {jsonPath, mdPath};
}

function main(){
  if(!fs.existsSync(TASKS_JSON)){
    console.error('tasks_all.json missing; run pipeline first.');
    process.exit(1);
  }
  const data = load();
  const task = select(data.tasks);
  if(!task){
    console.log('No eligible tasks found (all tasks already in progress or completed).');
    process.exit(0);
  }
  writeArtifacts(task);
  console.log(`Selected task ${task.id}: ${task.title}`);
  console.log('Artifacts written to artifacts/current_task.*');
}

if(args.includes('-h') || args.includes('--help')){
  console.log(`Usage: node scripts/automation/nextTask.cjs [--skip-placeholders] [--category=<substring>] [--limit-impact=<n>]`);
  process.exit(0);
}

main();
