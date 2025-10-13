#!/usr/bin/env node
/**
 * Select the next N tasks from planned queue (same ordering as generateTaskQueue) and emit artifacts:
 *  - artifacts/batch_current_tasks.json
 *  - artifacts/batch_current_tasks.md
 * Flags:
 *   --size=<n> (default 5)
 *   --skip-placeholders (optional)
 *   --category=<substring> (case-insensitive contains match)
 *   --limit-impact=<n> (only include tasks with impactScore >= n)
 *   --inject-placeholders (write // TASK:<id> stub lines to artifacts/batch_placeholders/<batchId>.ts)
 *   --start (transition selected tasks to in-progress)
 *   --max-in-progress=<n> (cap total in-progress tasks after starting; only effective with --start)
 *   --dry-run (simulate; do not mutate tasks_all.json even with --start)
 *   --json-out=<file> (write the batch JSON to a custom path as well)
 *   --exclude=<id1,id2,..> (exclude specific task IDs)
 *   --only-empty (only include tasks with empty userStory & acceptanceCriteria)
 *   --empty-first (prioritize empty tasks first in ordering)
 *   --explain (emit artifacts/batch_explain.json with selection rationale)
 *   --dump-candidates (emit artifacts/batch_candidates.json with ranked candidate list)
 *   --objective=<preset> (override weights; presets: value|velocity|fill-gaps)
 *   --no-recent=<n> (exclude tasks appearing in last n batches from batch_history.ndjson)
 *   --diff-prev (emit artifacts/batch_diff.json comparing with previous batch)
 *   --enforce-policy (run checkBatchPolicy.cjs after generating summary; if violations exit 2 and skip history append/start)
 *   --min-volatility=<n> (require at least this volatility vs previous batch; implies diff)
 *   --max-volatility=<n> (require at most this volatility vs previous batch; implies diff)
 */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const TASKS_JSON = path.join(ROOT,'tasks_all.json');
const ART = path.join(ROOT,'artifacts');
if(!fs.existsSync(ART)) fs.mkdirSync(ART);

const args = process.argv.slice(2);
function valueOf(prefix){ const f = args.find(a=> a.startsWith(prefix)); return f? f.split('=')[1]: undefined; }
const size = parseInt(valueOf('--size=' )||'5',10);
const skipPlaceholders = args.includes('--skip-placeholders');
const injectPlaceholders = args.includes('--inject-placeholders');
const startFlag = args.includes('--start');
const maxInProgressRaw = valueEq('--max-in-progress=');
const maxInProgress = maxInProgressRaw ? parseInt(maxInProgressRaw,10) : NaN;
const dryRun = args.includes('--dry-run');
const jsonOut = valueEq('--json-out=');
const excludeRaw = valueEq('--exclude=');
const excludeIds = excludeRaw ? excludeRaw.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n)) : [];
const onlyEmpty = args.includes('--only-empty');
const emptyFirst = args.includes('--empty-first');
const explain = args.includes('--explain');
const dumpCandidates = args.includes('--dump-candidates');
const objective = valueEq('--objective=');
const noRecentRaw = valueEq('--no-recent=');
const diffPrev = args.includes('--diff-prev');
const enforcePolicy = args.includes('--enforce-policy');
const minVolRaw = valueEq('--min-volatility=');
const maxVolRaw = valueEq('--max-volatility=');
const minVol = minVolRaw ? parseFloat(minVolRaw) : NaN;
const maxVol = maxVolRaw ? parseFloat(maxVolRaw) : NaN;
const noRecent = noRecentRaw ? parseInt(noRecentRaw,10) : 0;
const CONFIG_FILE = path.join(ROOT,'batch_config.json');
let config = {
  weights: { impact: 1.0, priority: 0.6, placeholder: 0.25, empty: 0.15 },
  policy: { maxEmptyRatio: 0.6, maxPlaceholderRatio: 0.7 }
};
try {
  if(fs.existsSync(CONFIG_FILE)){
    const userCfg = JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8'));
    config = { ...config, ...userCfg, weights: { ...config.weights, ...(userCfg.weights||{}) }, policy: { ...config.policy, ...(userCfg.policy||{}) } };
  }
} catch(e){ console.warn('Failed to parse batch_config.json:', e.message); }
// Apply objective presets (overrides weights after config load)
if(objective){
  const presets = {
    value: { impact: 1.0, priority: 0.8, placeholder: 0.1, empty: 0.05 },
    velocity: { impact: 0.7, priority: 0.5, placeholder: 0.0, empty: 0.3 },
    'fill-gaps': { impact: 0.4, priority: 0.3, placeholder: 0.0, empty: 0.9 }
  };
  if(presets[objective]){
    config.weights = presets[objective];
  } else {
    console.warn('Unknown objective preset:', objective);
  }
}
function valueEq(prefix){ const f = args.find(a=> a.startsWith(prefix)); return f? f.split('=')[1]: undefined; }
const categoryFilter = valueEq('--category=');
const limitImpactRaw = valueEq('--limit-impact=');
const limitImpact = limitImpactRaw ? parseFloat(limitImpactRaw) : NaN;

function load(){ return JSON.parse(fs.readFileSync(TASKS_JSON,'utf8')); }

function isEmptyTask(t){
  const storyEmpty = !t.userStory || !t.userStory.trim();
  const criteriaEmpty = !Array.isArray(t.acceptanceCriteria) || t.acceptanceCriteria.length === 0;
  return storyEmpty && criteriaEmpty;
}

function buildCandidateList(tasks){
  const excluded = [];
  const candidates = [];
  // Load recent batch history if needed
  let recentIds = new Set();
  if(noRecent>0){
    const historyFile = path.join(ART,'batch_history.ndjson');
    if(fs.existsSync(historyFile)){
      const lines = fs.readFileSync(historyFile,'utf8').trim().split(/\n+/).filter(Boolean).slice(-noRecent);
      for(const l of lines){
        try { const rec = JSON.parse(l); (rec.taskIds||[]).forEach(id=> recentIds.add(id)); } catch(e){}
      }
    }
  }
  for(const t of tasks){
    const reasons = [];
    if((t.lifecycleStatus||'planned')!=='planned'){ excluded.push({id:t.id, reason:'not-planned'}); continue; }
    if(skipPlaceholders && t.placeholderAdded){ excluded.push({id:t.id, reason:'skip-placeholders'}); continue; }
    if(categoryFilter && !((t.category||'').toLowerCase().includes(categoryFilter.toLowerCase()))){ excluded.push({id:t.id, reason:'category-mismatch'}); continue; }
    if(!isNaN(limitImpact) && ((t.impactScore||0) < limitImpact)){ excluded.push({id:t.id, reason:'below-impact-threshold'}); continue; }
    if(excludeIds.length && excludeIds.includes(t.id)){ excluded.push({id:t.id, reason:'explicit-exclude'}); continue; }
    if(onlyEmpty && !isEmptyTask(t)){ excluded.push({id:t.id, reason:'not-empty'}); continue; }
    if(noRecent>0 && recentIds.has(t.id)){ excluded.push({id:t.id, reason:'recent-batch'}); continue; }
    // Survived filters -> candidate
    const impact = t.impactScore||0;
    const priority = t.priorityScore||0;
    const placeholderFactor = (!skipPlaceholders && t.placeholderAdded) ? 1 : 0;
    const emptyFactor = isEmptyTask(t) ? 1 : 0;
    const w = config.weights;
    const composite = (impact * w.impact) + (priority * w.priority) + (placeholderFactor * w.placeholder) + (emptyFactor * w.empty);
    candidates.push({ task: t, impact, priority, placeholderFactor, emptyFactor, composite });
  }
  // Sort logic: optional empty-first & placeholder precedence retained via score adjustments
  candidates.sort((a,b)=>{
    // explicit placeholder ordering before score if both differ and not skipped
    if(!skipPlaceholders && a.placeholderFactor!==b.placeholderFactor){
      return b.placeholderFactor - a.placeholderFactor; // higher placeholderFactor first
    }
    if(emptyFirst && a.emptyFactor!==b.emptyFactor){
      return b.emptyFactor - a.emptyFactor; // empties first
    }
    if(b.composite !== a.composite) return b.composite - a.composite;
    // tie-breakers
    if((b.impact - a.impact)!==0) return b.impact - a.impact;
    if((b.priority - a.priority)!==0) return b.priority - a.priority;
    return a.task.id - b.task.id;
  });
  return { candidates, excluded };
}

function order(tasks){
  return buildCandidateList(tasks).candidates.map(c=> c.task);
}

function toMarkdown(batch){
  const header = '# Current Batch\n\n| ID | Title | Impact | Priority | Placeholder | Category |\n|---|---|---|---|---|---|';
  const lines = batch.map(t=>`| ${t.id} | ${t.title.replace(/\|/g,'/')} | ${t.impactScore?.toFixed(2)??''} | ${t.priorityScore?.toFixed(2)??''} | ${t.placeholderAdded?'yes':'no'} | ${t.category||''} |`);
  return header + '\n' + lines.join('\n') + '\n';
}

function main(){
  if(!fs.existsSync(TASKS_JSON)){
    console.error('tasks_all.json missing');
    process.exit(1);
  }
  const data = load();
  const { candidates, excluded } = buildCandidateList(data.tasks);
  const ordered = candidates.map(c=> c.task);
  const batch = ordered.slice(0,size);
  const generatedAt = new Date().toISOString();
  const batchJson = {generatedAt, size: batch.length, tasks: batch};
  fs.writeFileSync(path.join(ART,'batch_current_tasks.json'), JSON.stringify(batchJson, null,2));
  if(jsonOut){
    const outPath = path.isAbsolute(jsonOut) ? jsonOut : path.join(ROOT, jsonOut);
    try { fs.writeFileSync(outPath, JSON.stringify(batchJson,null,2)); } catch(e){ console.error('Failed to write json-out file:', e.message); }
  }
  fs.writeFileSync(path.join(ART,'batch_current_tasks.md'), toMarkdown(batch));
  // Summary artifact
  const summary = {
    generatedAt,
    requestedSize: size,
    actualSize: batch.length,
    filters: {
      skipPlaceholders,
      category: categoryFilter || null,
      limitImpact: isNaN(limitImpact)? null : limitImpact,
      excludeIds,
      onlyEmpty,
      emptyFirst,
      explain,
      objective: objective || null,
      noRecent,
      diffPrev
    },
    stats: {
      plannedPool: order(load().tasks).length,
      emptyCount: batch.filter(isEmptyTask).length,
      placeholdersSelected: batch.filter(t=> t.placeholderAdded).length,
      emptySelected: batch.filter(isEmptyTask).length,
      candidateCount: candidates.length,
      excludedCount: excluded.length,
      excludedRecent: excluded.filter(e=> e.reason==='recent-batch').length
    },
    weights: config.weights
  };
  fs.writeFileSync(path.join(ART,'batch_summary.json'), JSON.stringify(summary,null,2));
  // If policy enforcement requested, run checker before proceeding with diff/history/start side-effects
  if(enforcePolicy){
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/automation/checkBatchPolicy.cjs', { stdio:'inherit' });
    } catch(e){
      // Assume checker already printed violations & proper exit code (2). Exit early without further artifacts.
      process.exit(2);
    }
  }
  // Diff previous batch if requested or volatility gating required
  let computedVolatility = null;
  const needDiff = diffPrev || !isNaN(minVol) || !isNaN(maxVol);
  if(needDiff){
    const lastFile = path.join(ART,'batch_last.json');
    let prev = null;
    if(fs.existsSync(lastFile)){
      try { prev = JSON.parse(fs.readFileSync(lastFile,'utf8')); } catch(e){}
    }
    if(prev){
      const prevIds = new Set(prev.tasks.map(t=> t.id));
      const newIds = new Set(batch.map(t=> t.id));
      const added = batch.filter(t=> !prevIds.has(t.id)).map(t=> t.id);
      const removed = prev.tasks.filter(t=> !newIds.has(t.id)).map(t=> t.id);
      const unchanged = batch.filter(t=> prevIds.has(t.id)).map(t=> t.id);
      const unionSize = new Set([...prevIds, ...newIds]).size;
      const intersectionSize = unchanged.length;
      const jaccard = unionSize === 0 ? 0 : 1 - (intersectionSize / unionSize); // volatility: 0 identical, 1 completely different
      const overlapRatio = batch.length === 0 ? 0 : (intersectionSize / batch.length);
      const diffPayload = { generatedAt, added, removed, unchanged, previousGeneratedAt: prev.generatedAt, volatility: jaccard, overlapCount: intersectionSize, overlapRatio };
      fs.writeFileSync(path.join(ART,'batch_diff.json'), JSON.stringify(diffPayload,null,2));
      computedVolatility = jaccard;
    } else if(!isNaN(minVol) || !isNaN(maxVol)) {
      console.log('[nextBatch] No previous batch available for volatility gating; gates skipped.');
    }
  }
  // Volatility gating BEFORE history append / start mutations
  if((!isNaN(minVol) || !isNaN(maxVol)) && computedVolatility !== null){
    if(!isNaN(minVol) && computedVolatility < minVol){
      console.error(`[nextBatch] Volatility ${computedVolatility.toFixed(3)} < min-volatility ${minVol}. Rejecting batch.`);
      process.exit(3);
    }
    if(!isNaN(maxVol) && computedVolatility > maxVol){
      console.error(`[nextBatch] Volatility ${computedVolatility.toFixed(3)} > max-volatility ${maxVol}. Rejecting batch.`);
      process.exit(3);
    }
  }
  if(explain){
    const candidateMap = new Map(candidates.map(c=> [c.task.id, c]));
    const rationale = batch.map(t=>{
      const entry = candidateMap.get(t.id);
      const reasons = [];
      if(t.placeholderAdded && !skipPlaceholders) reasons.push('placeholder-priority');
      if(isEmptyTask(t)) reasons.push('empty');
      if(!isNaN(limitImpact) && (t.impactScore||0) >= limitImpact) reasons.push('meets-impact-threshold');
      if(categoryFilter && (t.category||'').toLowerCase().includes(categoryFilter.toLowerCase())) reasons.push('category-match');
      reasons.push('weighted-composite');
      return {
        id: t.id,
        title: t.title,
        impact: entry.impact,
        priority: entry.priority,
        placeholder: !!t.placeholderAdded,
        empty: isEmptyTask(t),
        category: t.category||null,
        weights: config.weights,
        components: {
          impact: entry.impact * config.weights.impact,
            priority: entry.priority * config.weights.priority,
            placeholder: entry.placeholderFactor * config.weights.placeholder,
            empty: entry.emptyFactor * config.weights.empty
        },
        compositeScore: entry.composite,
        reasons
      };
    });
    const explainPayload = { generatedAt, size: batch.length, rationale, excluded, candidateSample: candidates.slice(0,20).map(c=>({id:c.task.id, composite:c.composite})), objective: objective||null };
    fs.writeFileSync(path.join(ART,'batch_explain.json'), JSON.stringify(explainPayload,null,2));
    if(excluded.length){
      fs.writeFileSync(path.join(ART,'batch_exclusions.json'), JSON.stringify({generatedAt, excludedCount: excluded.length, excluded},null,2));
    }
  }
  if(dumpCandidates){
    fs.writeFileSync(path.join(ART,'batch_candidates.json'), JSON.stringify({generatedAt, candidates: candidates.map(c=>({id:c.task.id, composite:c.composite, impact:c.impact, priority:c.priority, placeholder:c.placeholderFactor, empty:c.emptyFactor}))},null,2));
  }
  if(injectPlaceholders && batch.length){
    const phDir = path.join(ART,'batch_placeholders');
    if(!fs.existsSync(phDir)) fs.mkdirSync(phDir, { recursive: true });
    const fileName = 'placeholders_' + generatedAt.replace(/[:.]/g,'-') + '.ts';
    const lines = [];
    lines.push('// Auto-generated placeholder references for current batch');
    for(const t of batch){
      lines.push(`// TASK:${t.id} placeholder reference for: ${t.title.replace(/\r|\n/g,' ')}`);
    }
    fs.writeFileSync(path.join(phDir, fileName), lines.join('\n'));
  }
  console.log(`Batch generated with ${batch.length} tasks -> artifacts/batch_current_tasks.*`);
  // Append batch history (ledger)
  try {
    const ledgerLine = JSON.stringify({ generatedAt, taskIds: batch.map(t=> t.id), objective: objective||null, size: batch.length });
    fs.appendFileSync(path.join(ART,'batch_history.ndjson'), ledgerLine + '\n');
    fs.writeFileSync(path.join(ART,'batch_last.json'), JSON.stringify(batchJson,null,2));
    // Update trend artifact if diff (or gating) produced one
    const diffFile = path.join(ART,'batch_diff.json');
    if(fs.existsSync(diffFile)){
      const trendFile = path.join(ART,'batch_trend.json');
      let trend = { records: [] };
      if(fs.existsSync(trendFile)){
        try { trend = JSON.parse(fs.readFileSync(trendFile,'utf8')); } catch(e){ trend={records:[]}; }
      }
      let vol = null; let overlapRatio = null;
      try { const diff = JSON.parse(fs.readFileSync(diffFile,'utf8')); vol = diff.volatility; overlapRatio = diff.overlapRatio; } catch(e){}
      trend.records.push({ generatedAt, size: batch.length, volatility: vol, overlapRatio, objective: objective||null });
      if(trend.records.length>50) trend.records = trend.records.slice(-50);
      const vols = trend.records.map(r=> typeof r.volatility==='number'? r.volatility : null).filter(v=> v!==null);
      const overlaps = trend.records.map(r=> typeof r.overlapRatio==='number'? r.overlapRatio : null).filter(v=> v!==null);
      trend.stats = {
        count: trend.records.length,
        volatilityAvg: vols.length? (vols.reduce((a,b)=>a+b,0)/vols.length) : null,
        overlapAvg: overlaps.length? (overlaps.reduce((a,b)=>a+b,0)/overlaps.length) : null
      };
      fs.writeFileSync(trendFile, JSON.stringify(trend,null,2));
    }
  } catch(e){ console.warn('Failed to append batch history:', e.message); }
  // Auto-start logic
  if(startFlag && batch.length){
    const alreadyInProgress = data.tasks.filter(t=> t.lifecycleStatus === 'in-progress');
    const currentCount = alreadyInProgress.length;
    let capacity = Infinity;
    if(!isNaN(maxInProgress)){
      capacity = Math.max(0, maxInProgress - currentCount);
    }
    if(capacity === 0){
      console.log(`Capacity reached: ${currentCount} tasks already in-progress (max ${maxInProgress}). No new tasks started.`);
    } else {
      const toStart = batch.filter(t=> (t.lifecycleStatus||'planned')==='planned').slice(0, capacity === Infinity ? undefined : capacity);
      if(toStart.length===0){
        console.log('No tasks eligible to start (all already not in planned state or capacity zero).');
      } else {
        const now = new Date().toISOString();
        for(const t of toStart){
          t.lifecycleStatus = 'in-progress';
          if(!Array.isArray(t.statusHistory)) t.statusHistory = [];
            t.statusHistory.push({ date: now, status: 'in-progress', reason: 'batch-start'});
          t.updatedAt = now;
          t.updatedByScript = 'nextBatch';
        }
        if(dryRun){
          console.log(`[dry-run] Would start ${toStart.length} task(s): ${toStart.map(t=>t.id).join(', ')}`);
        } else {
          // Persist full tasks file
          data.generatedAt = now; // update generation timestamp to reflect mutation context
          fs.writeFileSync(TASKS_JSON, JSON.stringify(data, null, 2));
          console.log(`Started ${toStart.length} task(s): ${toStart.map(t=>t.id).join(', ')}`);
        }
        if(!isNaN(maxInProgress)){
          const newInProgress = data.tasks.filter(t=> t.lifecycleStatus === 'in-progress').length;
          console.log(`In-progress count: ${newInProgress}/${maxInProgress}`);
          if(newInProgress > maxInProgress){
            console.warn('Warning: in-progress count exceeded max; check logic.');
          }
          const skippedDueToCap = batch.filter(t=> (t.lifecycleStatus||'planned')==='planned').length - toStart.length;
          if(skippedDueToCap>0) console.log(`Skipped ${skippedDueToCap} planned task(s) due to capacity.`);
        }
      }
    }
  }
  if(batch.length===0) process.exit(0);
}

main();
