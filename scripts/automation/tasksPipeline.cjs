#!/usr/bin/env node
/**
 * tasksPipeline.cjs
 * End-to-end automation orchestrator for ALL_TASKS workflow.
 * Steps:
 *  1. generateTasksJson (with optional --snapshot)
 *  2. enrichTasks
 *  3. scoreTasks
 *  4. generateTraceMap
 *  5. postProcess (add hasCodeRefs, adjust lifecycleStatus if referenced)
 *  6. guardTasks (strict mode unless --no-strict)
 *  7. diffTasks (emit to console)
 *  8. exportGherkin (optional if script exists)
 *  9. write consolidated pipeline_report.json
 * Flags:
 *   --no-snapshot   Skip snapshot creation
 *   --allow-delete  Pass through to guard script to allow deletions
 *   --no-strict     Guard does not treat content changes as failure
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TASKS_JSON = path.join(ROOT,'tasks_all.json');
const TRACE_MAP = path.join(ROOT,'trace_map.json');
const REPORT = path.join(ROOT,'pipeline_report.json');

function run(cmd){
  console.log(`\n>> ${cmd}`);
  execSync(cmd,{stdio:'inherit'});
}

function loadJSON(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }

function postProcess(){
  if(!fs.existsSync(TASKS_JSON)) throw new Error('tasks_all.json missing before postProcess');
  const tasksData = loadJSON(TASKS_JSON);
  const trace = fs.existsSync(TRACE_MAP) ? loadJSON(TRACE_MAP) : {references:{}};
  const refIds = new Set(Object.keys(trace.references));
  let adjusted = 0; let annotated = 0;
  for(const t of tasksData.tasks){
    const hadRefs = refIds.has(String(t.id));
    if(hadRefs){
      t.hasCodeRefs = true; annotated++;
      if(t.lifecycleStatus === 'planned' && !['FUTURE','DERIVED'].includes(t.originTag)){
        // leave spec tasks; only adjust if reference indicates work began
      }
      if(t.lifecycleStatus === 'planned' && ['SPEC','DERIVED','TODO','IMPL'].includes(t.originTag)){
        // heuristic: code reference implies at least in-progress
        t.lifecycleStatus = 'in-progress';
        t.statusHistory.push({date:new Date().toISOString(), status:'in-progress'});
        adjusted++;
      }
    } else {
      t.hasCodeRefs = false;
    }
  }
  tasksData.postProcessedAt = new Date().toISOString();
  fs.writeFileSync(TASKS_JSON, JSON.stringify(tasksData,null,2),'utf8');
  return { adjusted, annotated };
}

function main(){
  const args = process.argv.slice(2);
  const snapshot = !args.includes('--no-snapshot');
  const allowDelete = args.includes('--allow-delete');
  const strict = !args.includes('--no-strict');
  const genCmd = `node scripts/automation/generateTasksJson.cjs${snapshot?' --snapshot':''}`;
  run(genCmd);
  run('node scripts/automation/enrichTasks.cjs');
  run('node scripts/automation/scoreTasks.cjs');
  run('node scripts/automation/generateTraceMap.cjs');
  const pp = postProcess();
  // guard
  let guardCmd = 'node scripts/automation/guardTasks.cjs';
  if(allowDelete) guardCmd += ' --allow-delete';
  if(strict) guardCmd += ' --strict';
  // capture guard JSON
  guardCmd += ' --json';
  let guardReport;
  try {
    guardReport = JSON.parse(execSync(guardCmd,{encoding:'utf8'}));
  } catch(e){
    console.error('Guard script failed. Output may not be JSON compliant.');
    console.error(e.message);
    process.exit(1);
  }
  // diff (non-fatal)
  try { run('node scripts/automation/diffTasks.cjs'); } catch(e){ console.warn('diffTasks failed:', e.message); }
  // gherkin optional
  if(fs.existsSync(path.join(ROOT,'scripts','automation','exportGherkin.cjs'))){
    try { run('node scripts/automation/exportGherkin.cjs'); } catch(e){ console.warn('exportGherkin failed:', e.message); }
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    snapshotCreated: snapshot,
    postProcess: pp,
    guard: guardReport,
    tasksCount: fs.existsSync(TASKS_JSON) ? loadJSON(TASKS_JSON).tasks.length : 0
  };
  fs.writeFileSync(REPORT, JSON.stringify(summary,null,2),'utf8');
  console.log('\nPipeline complete. Report written to', path.relative(ROOT, REPORT));
}

main();
