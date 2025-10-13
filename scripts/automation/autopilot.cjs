#!/usr/bin/env node
/**
 * Autopilot (MVP)
 * Iteratively:
 *  1. Generate batch (or reuse existing) of planned tasks.
 *  2. For each task in batch:
 *     - If already done -> skip.
 *     - If not started -> mark in-progress (OPTIONAL: currently just logs to avoid large-scale mutation without human review).
 *     - Ensure placeholder trace reference exists.
 *  3. Run pipeline after batch instrumentation.
 * Flags:
 *   --size=N (batch size, default 5)
 *   --iterations=M (loop count, default 1)
 *   --dry-run (no lifecycle changes, just simulate)
 *   --start (actually start tasks lifecycle)
 *   --auto-complete (mark done if new code ref appears vs previous trace)
 *   --max-in-progress=N (skip starting if cap reached)
 *   --require-story (skip tasks missing userStory text)
 *   --require-criteria (skip tasks missing acceptanceCriteria entries)
 *   --skip-code-ref (exclude tasks already having hasCodeRefs=true)
 *   --no-pipeline (skip pipeline runs for speed)
 *   --log (append NDJSON progress lines to artifacts/autopilot_log.ndjson)
 *   --rollback-on-fail (if pipeline fails, revert lifecycle changes in this iteration)
 *   --readiness-threshold=0.75 (run verifier after pipeline; only auto-complete tasks whose readiness >= threshold and with no blocking warnings)
 *   --adaptive-objective (dynamically choose batch --objective based on volatility & empty ratio trends)
 *   --policy-enforce (append --enforce-policy to batch generation; handle violations adaptively)
 * NOTE: Still does NOT implement semantic code generation; acts as governance + orchestration layer.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const ART = path.join(ROOT,'artifacts');
const BATCH_FILE = path.join(ART,'batch_current_tasks.json');
const TASKS_FILE = path.join(ROOT,'tasks_all.json');
const AUTOPILOT_PLACEHOLDER = path.join(ROOT,'src','placeholder','autopilotReferences.ts');

const args = process.argv.slice(2);
function flag(name){ return args.includes(name); }
function value(prefix,def){ const f=args.find(a=>a.startsWith(prefix+'=')); return f? f.split('=')[1]: def; }
const size = parseInt(value('--size', '5'),10);
const iterations = parseInt(value('--iterations','1'),10);
const dryRun = flag('--dry-run');
const doStart = flag('--start');
const skipPipeline = flag('--no-pipeline');
const autoComplete = flag('--auto-complete');
const requireStory = flag('--require-story');
const requireCriteria = flag('--require-criteria');
const skipCodeRef = flag('--skip-code-ref');
const logProgress = flag('--log');
const rollbackOnFail = flag('--rollback-on-fail');
const maxInProgress = parseInt(value('--max-in-progress','0'),10); // 0 = no cap
const readinessThreshold = parseFloat(value('--readiness-threshold','-1')); // negative = disabled
const adaptiveObjective = flag('--adaptive-objective');
const policyEnforce = flag('--policy-enforce');
const statefulAdaptive = flag('--stateful-adaptive');
const explorationInterval = parseInt(value('--explore-interval','5'),10); // every N iterations attempt exploration
const adaptiveVolatility = flag('--adaptive-volatility');
const fullAuto = flag('--full-auto');
// New pass-through batch selection flags
const categoryFilter = value('--category');
const limitImpact = value('--limit-impact');
const excludeIds = value('--exclude');
const onlyEmpty = flag('--only-empty');
const emptyFirst = flag('--empty-first');
const LOG_FILE = path.join(ART,'autopilot_log.ndjson');
const RUN_SUMMARY_FILE = path.join(ART,'autopilot_run_summary.json');
const AUTOPILOT_STATE_FILE = path.join(ART,'autopilot_state.json');
const autoMode = flag('--auto'); // overrides iterations; loop until exhaustion/cap
// Dry-run auto safety: limit iterations unless explicitly disabled or overridden
const disableDryRunLimit = flag('--no-dry-run-limit');
const dryRunLimit = parseInt(value('--dry-run-limit','5'),10); // default 5 loops in dry-run auto mode

let previousTrace = {};
// Expand full-auto composite flag
if(fullAuto){
  if(!args.includes('--auto')) args.push('--auto');
  if(!args.includes('--adaptive-objective')) args.push('--adaptive-objective');
  if(!args.includes('--policy-enforce')) args.push('--policy-enforce');
  if(!args.includes('--stateful-adaptive')) args.push('--stateful-adaptive');
  if(!args.includes('--adaptive-volatility')) args.push('--adaptive-volatility');
}
function loadPreviousTrace(){
  const traceFile = path.join(ROOT,'trace_map.json');
  if(fs.existsSync(traceFile)){
    try { previousTrace = JSON.parse(fs.readFileSync(traceFile,'utf8')); } catch(e){ previousTrace={}; }
  }
}

function run(cmd){ console.log('> '+cmd); execSync(cmd,{stdio:'inherit'}); }
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

function loadJSON(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }

function generateBatch(){
  // Decide objective adaptively if requested
  let objectiveFlag = '';
  let decisionContext = { lastVol:null, volatilityAvg:null, emptyRatio:null, placeholderRatio:null, lastObjective:null };
  if(adaptiveObjective || statefulAdaptive){
    // Read trend & summary to pick objective
    const trendFile = path.join(ART,'batch_trend.json');
    let volatilityAvg = null; let lastVol = null; let lastObjective = null; let emptyRatio = null; let placeholderRatio = null;
    try {
      if(fs.existsSync(trendFile)){
        const trend = JSON.parse(fs.readFileSync(trendFile,'utf8'));
        volatilityAvg = trend.stats?.volatilityAvg;
        const last = trend.records?.[trend.records.length-1];
        if(last){ lastVol = last.volatility; lastObjective = last.objective; }
      }
      const summaryFile = path.join(ART,'batch_summary.json');
      if(fs.existsSync(summaryFile)){
        const sum = JSON.parse(fs.readFileSync(summaryFile,'utf8'));
        if(sum.actualSize>0){
          emptyRatio = (sum.stats.emptySelected||0)/sum.actualSize;
          placeholderRatio = (sum.stats.placeholdersSelected||0)/sum.actualSize;
        }
      }
    } catch(e){ /* ignore */ }
    decisionContext = { lastVol, volatilityAvg, emptyRatio, placeholderRatio, lastObjective };
    // Base heuristic (legacy adaptive)
    const baseHeuristic = ()=>{
      if(lastVol !== null){
        if(lastVol > 0.75) return 'value';
        else if(emptyRatio !== null && emptyRatio < 0.2) return 'velocity';
        return 'fill-gaps';
      }
      return 'value';
    };
    objectiveFlag = baseHeuristic();

    // Stateful momentum + exploration overlays
    if(statefulAdaptive){
      let state = null;
      if(fs.existsSync(AUTOPILOT_STATE_FILE)){
        try { state = JSON.parse(fs.readFileSync(AUTOPILOT_STATE_FILE,'utf8')); } catch(e){ state=null; }
      }
      // Initialize counters
      let consecutiveHighVol = state?.consecutiveHighVol || 0;
      let consecutiveLowVol = state?.consecutiveLowVol || 0;
      let explorationCount = state?.explorationCount || 0;
      let iteration = (state?.iteration || 0) + 1;
      const lastTwo = state?.recentObjectives || [];
      if(lastVol !== null){
        if(lastVol > 0.75) { consecutiveHighVol++; consecutiveLowVol = 0; }
        else if(lastVol < 0.35) { consecutiveLowVol++; consecutiveHighVol = 0; }
        else { consecutiveHighVol = 0; consecutiveLowVol = 0; }
      }
      // Momentum adjustments
      if(consecutiveHighVol >= 2) objectiveFlag = 'value'; // dampen volatility
      else if(consecutiveLowVol >= 3 && (emptyRatio||0) > 0.25) objectiveFlag = 'fill-gaps';
      // Exploration trigger
      const doExplore = (iteration % explorationInterval === 0);
      if(doExplore){
        const choices = ['value','velocity','fill-gaps'];
        // Remove last two distinct objectives to encourage diversity
        const banned = new Set(lastTwo.slice(-2));
        const candidates = choices.filter(c=> !banned.has(c));
        const pick = candidates[Math.floor(Math.random()*candidates.length)];
        objectiveFlag = pick;
        explorationCount++;
      }
      decisionContext.stateful = { consecutiveHighVol, consecutiveLowVol, explorationCount, iteration, explored: doExplore };
      decisionContext.recentObjectives = (lastTwo.concat(objectiveFlag)).slice(-5);
    }
  }
  let batchCmd = `node scripts/automation/nextBatch.cjs --size=${size}`;
  if(objectiveFlag) batchCmd += ` --objective=${objectiveFlag}`;
  if(categoryFilter) batchCmd += ` --category=${categoryFilter}`;
  if(limitImpact) batchCmd += ` --limit-impact=${limitImpact}`;
  if(excludeIds) batchCmd += ` --exclude=${excludeIds}`;
  if(onlyEmpty) batchCmd += ` --only-empty`;
  if(emptyFirst) batchCmd += ` --empty-first`;
  if(policyEnforce) batchCmd += ' --enforce-policy';
  // attempt mild volatility range if adaptive to avoid stagnation (ignore exit code 3 if gating fails, we'll retry relaxed)
  // Volatility management
  if(adaptiveObjective) batchCmd += ' --diff-prev --min-volatility=0.10 --max-volatility=0.95';
  // Adaptive volatility refinement overlays base gating if enabled
  if(adaptiveVolatility){
    let prior = null;
    if(fs.existsSync(AUTOPILOT_STATE_FILE)){
      try { prior = JSON.parse(fs.readFileSync(AUTOPILOT_STATE_FILE,'utf8')); } catch(_){ prior=null; }
    }
    const currentVol = decisionContext.lastVol;
    // Use prior adaptive band if exists
    let minV = prior?.volatilityBand?.min ?? 0.10;
    let maxV = prior?.volatilityBand?.max ?? 0.95;
    let stabilityStreak = prior?.volatilityBand?.stabilityStreak ?? 0;
    if(currentVol != null){
      // If within current band comfortably (margin 0.1) increase streak
      if(currentVol > (minV+0.05) && currentVol < (maxV-0.05)) stabilityStreak++; else stabilityStreak=0;
      // Tighten band after stability
      if(stabilityStreak>=2){
        const center = (minV+maxV)/2;
        const span = (maxV-minV)*0.85; // shrink 15%
        minV = Math.max(0, center - span/2);
        maxV = Math.min(0.99, center + span/2);
        stabilityStreak = 0; // reset after tightening
      }
      // If currentVol outside band widen
      if(currentVol < minV){ minV = Math.max(0, currentVol - 0.05); }
      if(currentVol > maxV){ maxV = Math.min(0.99, currentVol + 0.05); }
      if((maxV-minV) < 0.15){ // ensure reasonable width
        const widen = (0.15-(maxV-minV))/2;
        minV = Math.max(0, minV - widen);
        maxV = Math.min(0.99, maxV + widen);
      }
    }
    // Append/replace min/max volatility flags
    batchCmd += ` --diff-prev --min-volatility=${minV.toFixed(2)} --max-volatility=${maxV.toFixed(2)}`;
    decisionContext.volatilityBand = { min:minV, max:maxV, stabilityStreak };
  }
  // respect dry-run + start forwarding when autopilot intends lifecycle mutations
  if(doStart) batchCmd += ` --start`; // nextBatch will no-op if dry-run isn't passed but we emulate via skipping workTask starts if not doStart
  if(maxInProgress>0) batchCmd += ` --max-in-progress=${maxInProgress}`;
  if(dryRun) batchCmd += ` --dry-run`;
  try {
    run(batchCmd);
  } catch(e){
    const code = e.status;
    if(code === 2 && policyEnforce){
      console.log('[autopilot] Policy violation detected, attempting fallback objective=velocity');
      try { run(batchCmd.replace(/--objective=[^\s]+/,' --objective=velocity')); }
      catch(e2){ console.error('[autopilot] fallback velocity batch failed'); throw e2; }
    } else if(code === 3 && adaptiveObjective){
      console.log('[autopilot] Volatility gating rejection; retrying without gates.');
      const ungated = batchCmd.replace(/ --min-volatility=[^\s]+/,'').replace(/ --max-volatility=[^\s]+/,'');
      try { run(ungated); }
      catch(e3){ console.error('[autopilot] ungated retry failed'); throw e3; }
    } else {
      throw e;
    }
  }
  let tasks=[]; try { tasks = loadJSON(BATCH_FILE).tasks; } catch(e){ console.error('[autopilot] Failed to load batch file', e.message); }
  // Persist state snapshot for external adaptive consumers
  try {
    let prior = {};
    if(fs.existsSync(AUTOPILOT_STATE_FILE)){
      try { prior = JSON.parse(fs.readFileSync(AUTOPILOT_STATE_FILE,'utf8')); } catch(_){}
    }
    const state = Object.assign({}, prior, {
      time: new Date().toISOString(),
      objective: objectiveFlag || null,
      lastObjective: decisionContext.lastObjective ?? prior.lastObjective ?? null,
      lastVol: decisionContext.lastVol,
      volatilityAvg: decisionContext.volatilityAvg,
      emptyRatio: decisionContext.emptyRatio,
      placeholderRatio: decisionContext.placeholderRatio,
      recentObjectives: decisionContext.recentObjectives || prior.recentObjectives || [],
      consecutiveHighVol: decisionContext.stateful?.consecutiveHighVol ?? prior.consecutiveHighVol ?? 0,
      consecutiveLowVol: decisionContext.stateful?.consecutiveLowVol ?? prior.consecutiveLowVol ?? 0,
      explorationCount: decisionContext.stateful?.explorationCount ?? prior.explorationCount ?? 0,
      iteration: decisionContext.stateful?.iteration ?? ((prior.iteration||0)+1),
      exploredThisIteration: decisionContext.stateful?.explored || false,
      volatilityBand: decisionContext.volatilityBand || prior.volatilityBand || null
    });
    ensureDir(ART);
    fs.writeFileSync(AUTOPILOT_STATE_FILE, JSON.stringify(state,null,2));
  } catch(err){ console.error('[autopilot] failed writing state', err.message); }
  return tasks;
}

function loadTasksAll(){ return loadJSON(TASKS_FILE).tasks; }

function appendPlaceholderRefs(taskIds){
  ensureDir(path.dirname(AUTOPILOT_PLACEHOLDER));
  let existing = '';
  if(fs.existsSync(AUTOPILOT_PLACEHOLDER)) existing = fs.readFileSync(AUTOPILOT_PLACEHOLDER,'utf8');
  const lines = taskIds.map(id=>`// TASK:${id} (autopilot placeholder)`);
  const marker = '// <autopilot-generated>'; 
  const block = marker+'\n'+lines.join('\n')+'\n';
  if(existing.includes(marker)){
    // replace block
    existing = existing.replace(new RegExp(marker+'[\s\S]*?$'),'') + block;
  } else {
    existing += '\n'+block;
  }
  const exportLine = 'export const autopilotTaskIds = '+JSON.stringify(taskIds)+';\n';
  const final = existing + exportLine;
  fs.writeFileSync(AUTOPILOT_PLACEHOLDER, final);
}

function log(lineObj){
  if(!logProgress) return;
  ensureDir(ART);
  fs.appendFileSync(LOG_FILE, JSON.stringify(lineObj)+"\n");
}

function simulateStart(task){
  const id = task.id;
  console.log(`[autopilot] start candidate ${id}`);
  log({phase:'start-eval', id, time: new Date().toISOString()});
  if(!dryRun && doStart){
    run(`node scripts/automation/workTask.cjs start ${id}`);
    log({phase:'started', id, time: new Date().toISOString()});
  }
}

function markComplete(task){
  const id = task.id;
  console.log(`[autopilot] auto-complete candidate ${id}`);
  log({phase:'complete-eval', id, time: new Date().toISOString()});
  if(!dryRun){
    run(`node scripts/automation/workTask.cjs complete ${id}`);
    log({phase:'completed', id, time: new Date().toISOString()});
  }
}

function countInProgress(all){
  return all.filter(t=> t.lifecycleStatus==='in-progress').length;
}

function loop(){
  loadPreviousTrace();
  const stats = { iterations: 0, started: 0, completed: 0, skippedCapacity:0, emptyBatches:0, dryRun, auto: autoMode, maxItersPlanned:0, earlyStop:false, earlyStopReason:null };
  const maxIters = autoMode ? 1000 : iterations; // sane safety cap for auto
  stats.maxItersPlanned = maxIters;
  for(let i=1;i<=maxIters;i++){
    stats.iterations = i;
    const displayTotal = autoMode ? maxIters : iterations;
    console.log(`\n=== Autopilot Iteration ${i}/${displayTotal}${autoMode?' (auto)':''} ===`);
    const batch = generateBatch();
    if(batch.length===0){
      console.log('No tasks available for batch. Exiting loop.');
      stats.emptyBatches++;
      stats.earlyStop = true;
      stats.earlyStopReason = 'empty-batch';
      break;
    }
    const allTasks = loadTasksAll();
    const beforeLifecycle = {};
    batch.forEach(t=> beforeLifecycle[t.id]=t.lifecycleStatus);
    const planned = batch.filter(t=> (t.lifecycleStatus||'planned')==='planned');
    if(planned.length===0) console.log('All tasks in batch already started/done.');
    const activeCount = countInProgress(allTasks);
    if(maxInProgress>0 && activeCount>=maxInProgress){
      console.log(`[autopilot] in-progress cap reached (${activeCount} >= ${maxInProgress}), skipping starts this iteration`);
      stats.skippedCapacity++;
    } else {
      planned.forEach(task=>{
        if(skipCodeRef && task.hasCodeRefs) return;
        if(requireStory && !task.userStory) return;
        if(requireCriteria && (!task.acceptanceCriteria || task.acceptanceCriteria.length===0)) return;
        if(maxInProgress>0 && countInProgress(loadTasksAll())>=maxInProgress) return;
        simulateStart(task);
        stats.started++;
      });
    }
    appendPlaceholderRefs(batch.map(t=> t.id));
    let pipelineFailed = false;
    if(!skipPipeline){
      try { run('node scripts/automation/tasksPipeline.cjs --no-snapshot'); }
      catch(e){ pipelineFailed = true; console.error('[autopilot] pipeline failed', e.message); }
    }
    // Auto-complete heuristic: if task previously had no refs and now appears in placeholder file we still cannot claim completion; skip until real refs added.
    if(autoComplete && !pipelineFailed){
      // Optionally run verifier to fetch readiness scores if threshold enabled
      let readinessMap = null; let blockingTaskIds = new Set();
      if(readinessThreshold >= 0){
        try {
          run('npm run tasks:verify');
          const reportPath = path.join(ART,'verifier','verifier_report.json');
            if(fs.existsSync(reportPath)){
              const rep = JSON.parse(fs.readFileSync(reportPath,'utf8'));
              readinessMap = rep.readiness?.tasks || {};
              // collect tasks with blocking warnings
              const blockingCodes = new Set(['missing_story','missing_criteria','done_without_code_refs']);
              (rep.issues||[]).forEach(is=>{ if(blockingCodes.has(is.code)) blockingTaskIds.add(is.taskId); });
            }
        } catch(e){ console.error('[autopilot] verifier invocation failed', e.message); }
      }
      // load trace after pipeline
      let newTrace = {};
      const traceFile = path.join(ROOT,'trace_map.json');
      if(fs.existsSync(traceFile)) newTrace = JSON.parse(fs.readFileSync(traceFile,'utf8'));
      batch.forEach(task=>{
        const idStr = String(task.id);
        const prev = previousTrace[idStr];
        const now = newTrace[idStr];
        if(!prev && now && now.files && now.files.length>0 && !dryRun){
          // Only mark complete if it was in-progress (not just planned) and refs are beyond autopilot placeholder file
          const hasNonPlaceholder = now.files.some(f=> !f.path.includes('autopilotReferences') && !f.path.includes('batchReferences'));
          if(hasNonPlaceholder && (task.lifecycleStatus==='in-progress')){
            let gateOk = true;
            if(readinessThreshold >=0 && readinessMap){
              const r = readinessMap[task.id];
              const score = r? r.score : 0;
              if(score < readinessThreshold){ gateOk = false; console.log(`[autopilot] readiness gate failed for ${task.id} score=${score} < ${readinessThreshold}`); }
              if(blockingTaskIds.has(task.id)){ gateOk = false; console.log(`[autopilot] blocking warnings present for ${task.id}`); }
            }
            if(gateOk){
              markComplete(task);
              stats.completed++;
            }
          }
        }
      });
      previousTrace = newTrace;
    }
    if(pipelineFailed && rollbackOnFail && !dryRun){
      console.log('[autopilot] rolling back lifecycle changes for this iteration');
      batch.forEach(task=>{
        const before = beforeLifecycle[task.id];
        if(before && before!==task.lifecycleStatus){
          // naive rollback using reset/start/complete mapping
          if(before==='planned') run(`node scripts/automation/workTask.cjs reset ${task.id}`);
          if(before==='in-progress') run(`node scripts/automation/workTask.cjs start ${task.id}`);
          if(before==='done') run(`node scripts/automation/workTask.cjs complete ${task.id}`);
        }
      });
    }
    if(autoMode){
      // termination checks: cap reached OR no planned tasks remain
      const remainingPlanned = loadTasksAll().filter(t=> (t.lifecycleStatus||'planned')==='planned').length;
      if(maxInProgress>0 && countInProgress(loadTasksAll())>=maxInProgress){
        console.log('[autopilot:auto] max in-progress reached; stopping.');
        stats.earlyStop = true; stats.earlyStopReason = 'max-in-progress-reached';
        break;
      }
      if(remainingPlanned===0){
        console.log('[autopilot:auto] no remaining planned tasks; stopping.');
        stats.earlyStop = true; stats.earlyStopReason = 'no-planned-tasks';
        break;
      }
      // Dry-run safety limiter: in dry-run auto mode tasks never transition -> termination conditions above won't trigger.
      if(dryRun && !disableDryRunLimit){
        if(i >= dryRunLimit){
          console.log(`[autopilot:auto] dry-run limit ${dryRunLimit} reached; stopping early. Use --no-dry-run-limit or --dry-run-limit=N to override.`);
          stats.earlyStop = true; stats.earlyStopReason = 'dry-run-limit';
          break;
        }
      }
    }
  }
  try {
    ensureDir(ART);
    fs.writeFileSync(RUN_SUMMARY_FILE, JSON.stringify(stats,null,2));
  } catch(e){ console.error('Failed to write run summary', e.message); }
}

function summary(){
  // Load run summary for accurate iteration count if available
  let finalStats = null;
  try { if(fs.existsSync(RUN_SUMMARY_FILE)) finalStats = JSON.parse(fs.readFileSync(RUN_SUMMARY_FILE,'utf8')); } catch(e){}
  const iterReported = finalStats? finalStats.iterations : iterations;
  console.log(`Autopilot complete. Iterations executed: ${iterReported}${autoMode?` / planned cap ${finalStats?finalStats.maxItersPlanned: (autoMode?1000:iterations)}`:''}. Dry-run: ${dryRun}. Start flag: ${doStart}. Auto-complete: ${autoComplete}`);
  if(finalStats && finalStats.earlyStop){
    console.log(`Early stop reason: ${finalStats.earlyStopReason}`);
  }
  if(logProgress) console.log(`Progress log: ${LOG_FILE}`);
  console.log('Artifacts touched: batch_current_tasks.*, batch_summary.json, trace_map.json, autopilotReferences.ts, autopilot_run_summary.json');
}

loop();
summary();
