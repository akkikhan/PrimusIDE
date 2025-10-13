#!/usr/bin/env node
/**
 * runVerifier.cjs (skeleton)
 * Aggregates lightweight quality / readiness checks over tasks.
 * Output: artifacts/verifier/verifier_report.json
 *
 * Current Checks (baseline):
 *  - in-progress task missing userStory -> missing_story (warn)
 *  - in-progress task missing acceptanceCriteria -> missing_criteria (warn)
 *  - done task without code refs -> done_without_code_refs (warn)
 *  - done task still flagged placeholderAdded -> done_with_placeholder_story (warn)
 *  - planned task with code refs (auto-complete candidate) -> planned_with_code_refs (info)
 *
 * Severity Levels (initial heuristic):
 *  - error: (reserved for future hard failures: policy breach, security issue)
 *  - warn: potential quality gap
 *  - info: notable situation but not a problem
 *
 * Flags (future roadmap – not yet implemented):
 *  --fail-on-warn      exit non-zero if any warnings
 *  --fail-on-info      treat info as warnings
 *  --task=<id>         focus verification on a single task id
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TASKS_FILE = path.join(ROOT, 'tasks_all.json');
const TRACE_FILE = path.join(ROOT, 'trace_map.json');
const ART = path.join(ROOT, 'artifacts');
const VER_DIR = path.join(ART, 'verifier');
const REPORT_FILE = path.join(VER_DIR, 'verifier_report.json');
const SYMBOL_DIFF_FILE = path.join(ROOT,'artifacts','semantic','semantic_symbol_diff.json');

function loadJson(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

function main(){
  if(!fs.existsSync(TASKS_FILE)){
    console.error('tasks_all.json missing – run pipeline first');
    process.exit(1);
  }
  const all = loadJson(TASKS_FILE).tasks || [];
  const trace = fs.existsSync(TRACE_FILE) ? loadJson(TRACE_FILE) : {};
  const symbolDiff = fs.existsSync(SYMBOL_DIFF_FILE) ? loadJson(SYMBOL_DIFF_FILE).diff : null;

  const issues = [];
  const readiness = {}; // taskId -> score details
  for(const t of all){
    const idStr = String(t.id);
    const refs = trace[idStr]?.files || [];
    const hasRefs = refs.length > 0;
    const lifecycle = t.lifecycleStatus || 'planned';

    // Compute partial readiness components
    const storyOk = !!t.userStory && !t.placeholderAdded;
    const criteriaOk = Array.isArray(t.acceptanceCriteria) && t.acceptanceCriteria.length>0;
  // refs already defined above
    const substantiveRefs = refs.filter(r=> r.path && !/placeholder|autopilot|batchReferences/i.test(r.path)).length;
    const refsQuality = hasRefs ? (substantiveRefs>0 ? 1 : 0.4) : 0;
    // crude change impact (if symbol diff has breaking changes touching files this task references)
    let breakImpact = 0;
    if(symbolDiff && symbolDiff.breakingSymbols){
      const fileSet = new Set(refs.map(r=> r.path));
      const touchedBreaking = symbolDiff.breakingSymbols.some(sym=>{
        const file = sym.split('::')[0];
        return fileSet.has(file);
      });
      breakImpact = touchedBreaking ? -0.3 : 0; // penalty
    }
    const baseScore = (storyOk?0.3:0) + (criteriaOk?0.3:0) + refsQuality*0.3 + 0.1; // 0.1 baseline
    const score = Math.max(0, Math.min(1, baseScore + breakImpact));
    readiness[t.id] = { score: Number(score.toFixed(3)), components: { storyOk, criteriaOk, refsQuality, breakImpact } };

    // in-progress quality readiness
    if(lifecycle === 'in-progress'){
      if(!t.userStory){
        issues.push(issue(t, 'missing_story', 'warn', 'In-progress task has no userStory text'));
      }
      if(!Array.isArray(t.acceptanceCriteria) || t.acceptanceCriteria.length === 0){
        issues.push(issue(t, 'missing_criteria', 'warn', 'In-progress task has no acceptance criteria entries'));
      }
    }

    // done validation
    if(lifecycle === 'done'){
      if(!hasRefs){
        issues.push(issue(t, 'done_without_code_refs', 'warn', 'Task marked done but no code references captured'));
      }
      if(t.placeholderAdded){
        issues.push(issue(t, 'done_with_placeholder_story', 'warn', 'Task done but story/criteria still placeholder'));
      }
    }

    // planned but already has refs (auto-complete candidate)
    if(lifecycle === 'planned' && hasRefs){
      issues.push(issue(t, 'planned_with_code_refs', 'info', 'Planned task already has code references (consider starting / verifying)'));
    }
  }

  const summary = summarize(issues);
  // Aggregate readiness distribution
  const readinessValues = Object.values(readiness).map(r=> r.score);
  const avgReadiness = readinessValues.length? (readinessValues.reduce((a,b)=>a+b,0)/readinessValues.length) : 0;
  ensureDir(VER_DIR);
  const report = { generatedAt: new Date().toISOString(), counts: summary.counts, breakdown: summary.breakdown, issues, readiness: { tasks: readiness, average: Number(avgReadiness.toFixed(3)) } };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report,null,2));
  console.log(`Verifier report written: ${REPORT_FILE}`);
  // Non-zero exit reserved for future flags; always 0 now.
}

function issue(task, code, severity, message){
  return {
    taskId: task.id,
    lifecycleStatus: task.lifecycleStatus || 'planned',
    code,
    severity,
    message
  };
}

function summarize(issues){
  const counts = { total: issues.length, error:0, warn:0, info:0 };
  const breakdown = {};
  for(const i of issues){
    counts[i.severity]++;
    breakdown[i.code] = (breakdown[i.code]||0)+1;
  }
  return { counts, breakdown };
}

main();
