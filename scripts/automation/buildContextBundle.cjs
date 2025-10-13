#!/usr/bin/env node
/**
 * buildContextBundle.cjs
 * Creates a context bundle for a set of task IDs (or default: current batch file, or top N impact tasks).
 * Output: artifacts/context/context_bundle_<timestamp>.json
 * Flags:
 *   --tasks=1,2,3   explicit list
 *   --top=N         take top N planned tasks by impactScore
 *   --from-batch    use artifacts/batch_current_tasks.json
 */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const ART = path.join(ROOT,'artifacts');
const CONTEXT_DIR = path.join(ART,'context');
const TASKS_FILE = path.join(ROOT,'tasks_all.json');
const BATCH_FILE = path.join(ART,'batch_current_tasks.json');
const TRACE_FILE = path.join(ROOT,'trace_map.json');

const args = process.argv.slice(2);
function flag(f){ return args.includes(f); }
function value(prefix){ const f=args.find(a=>a.startsWith(prefix+'=')); return f? f.split('=')[1]: undefined; }

function loadJSON(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }

function selectTaskIds(all){
  const tasksArg = value('--tasks');
  if(tasksArg){
    return tasksArg.split(',').map(s=>parseInt(s.trim(),10)).filter(Boolean);
  }
  if(flag('--from-batch') && fs.existsSync(BATCH_FILE)){
    try { return loadJSON(BATCH_FILE).tasks.map(t=> t.id); } catch(_){}
  }
  const top = parseInt(value('--top')||'0',10);
  if(top>0){
    return all.filter(t=> (t.lifecycleStatus||'planned')==='planned')
              .sort((a,b)=> (b.impactScore||0)-(a.impactScore||0))
              .slice(0,top)
              .map(t=> t.id);
  }
  return [];
}

function build(){
  if(!fs.existsSync(TASKS_FILE)) throw new Error('tasks_all.json missing; run pipeline first');
  const all = loadJSON(TASKS_FILE).tasks;
  const trace = fs.existsSync(TRACE_FILE) ? loadJSON(TRACE_FILE) : {};
  const ids = selectTaskIds(all);
  if(ids.length===0){
    console.error('No task IDs selected (provide --tasks, --top, or --from-batch).');
    process.exit(1);
  }
  const chosen = all.filter(t=> ids.includes(t.id));
  const summaries = chosen.map(t=>{
    const tr = trace[String(t.id)];
    const files = tr && tr.files ? tr.files.map(f=>({path: f.path, occurrences: f.occurrences||1})) : [];
    return {
      id: t.id,
      title: t.title,
      lifecycleStatus: t.lifecycleStatus,
      status: t.status,
      userStory: t.userStory,
      acceptanceCriteria: t.acceptanceCriteria,
      impactScore: t.impactScore,
      priorityScore: t.priorityScore,
      riskScore: t.riskScore,
      complexityScore: t.complexityScore,
      placeholderAdded: t.placeholderAdded,
      hasCodeRefs: !!(tr && tr.files && tr.files.length),
      files
    };
  });
  const relatedFileSet = new Set();
  summaries.forEach(s=> (s.files||[]).forEach(f=> relatedFileSet.add(f.path)));
  const bundle = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'buildContextBundle',
      taskCount: summaries.length
    },
    tasks: summaries,
    relatedFiles: Array.from(relatedFileSet).sort(),
    stats: {
      tasksWithRefs: summaries.filter(s=> s.hasCodeRefs).length,
      tasksWithoutRefs: summaries.filter(s=> !s.hasCodeRefs).length
    }
  };
  if(!fs.existsSync(CONTEXT_DIR)) fs.mkdirSync(CONTEXT_DIR,{recursive:true});
  const outPath = path.join(CONTEXT_DIR, `context_bundle_${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(bundle,null,2));
  console.log(`Context bundle written: ${outPath}`);
}

build();
