#!/usr/bin/env node
/**
 * Enrich tasks_all.json with userStory & acceptanceCriteria templates.
 * Default: SPEC/IMPL/TODO only.
 * Flag --all-status will also enrich DERIVED/FUTURE/etc with lighter placeholders.
 * Non-destructive: preserves existing text if already filled.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TASKS_JSON = path.join(ROOT, 'tasks_all.json');

const args = process.argv.slice(2);
const enrichAll = args.includes('--all-status');

function load(){ return JSON.parse(fs.readFileSync(TASKS_JSON,'utf8')); }
function save(data){ fs.writeFileSync(TASKS_JSON, JSON.stringify(data,null,2)+'\n','utf8'); }

function buildUserStoryFull(t){
  return `As a developer, I want ${t.title.toLowerCase()} so that Primus IDE advances toward superior intelligent coding experience.`;
}
function buildAcceptanceFull(t){
  return [
    `Given Primus IDE is running when the feature '${t.title}' is invoked then it performs its primary function without error`,
    `All interactions produce no uncaught exceptions in console`,
    `Telemetry (if applicable) records a success event`,
    `Feature adheres to performance baseline (<200ms perceived latency where applicable)`
  ];
}

function buildUserStoryLite(t){
  return `Placeholder: clarify intent for '${t.title}' (auto-generated).`;
}
function buildAcceptanceLite(t){
  return [
    `Define concrete success criteria for '${t.title}' (auto-generated placeholder).`,
    `Add performance / quality metrics once scope clarified.`
  ];
}

function shouldEnrich(status){
  if(['SPEC','IMPL','TODO'].includes(status)) return true;
  if(enrichAll) return ['DERIVED','FUTURE','BACKLOG','IDEA','RESEARCH'].includes(status);
  return false;
}

function isLiteStatus(status){
  return ['DERIVED','FUTURE','BACKLOG','IDEA','RESEARCH'].includes(status);
}

function main(){
  if(!fs.existsSync(TASKS_JSON)){
    console.error('tasks_all.json missing. Run generate:tasks first.');
    process.exit(1);
  }
  const data = load();
  let updated = 0;
  let enrichedTasks = 0;
  for(const t of data.tasks){
    if(!shouldEnrich(t.status)) continue;
    enrichedTasks++;
    const lite = isLiteStatus(t.status) && enrichAll;
    if(!t.userStory){
      t.userStory = lite ? buildUserStoryLite(t) : buildUserStoryFull(t);
      if(lite) t.placeholderAdded = true;
      updated++;
    }
    if(!t.acceptanceCriteria || t.acceptanceCriteria.length === 0){
      t.acceptanceCriteria = lite ? buildAcceptanceLite(t) : buildAcceptanceFull(t);
      if(lite) t.placeholderAdded = true;
      updated++;
    }
  }
  data.enrichedAt = new Date().toISOString();
  save(data);
  console.log(`Enriched ${updated} fields across ${enrichedTasks} targeted tasks${enrichAll ? ' (all-status mode)' : ''}.`);
}

if(args.includes('-h') || args.includes('--help')){
  console.log(`Usage: node enrichTasks.cjs [--all-status]\n\nOptions:\n  --all-status  Include DERIVED/FUTURE/BACKLOG/IDEA/RESEARCH with lite placeholders.`);
  process.exit(0);
}

main();
