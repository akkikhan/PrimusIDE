#!/usr/bin/env node
/**
 * scoreTasks.cjs
 * Derive priority, complexity, risk scores heuristically and write back into tasks_all.json
 * Non-destructive: adds score fields if absent or if --force provided.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TASKS_JSON = path.join(ROOT, 'tasks_all.json');

function load(){ return JSON.parse(fs.readFileSync(TASKS_JSON,'utf8')); }
function save(data){ fs.writeFileSync(TASKS_JSON, JSON.stringify(data,null,2),'utf8'); }

// Simple keyword heuristics for weighting
const priorityKeywords = [
  [/\b(ai|intelligence|reasoning)\b/i, 4],
  [/\b(lsp|definition|references|rename)\b/i, 3],
  [/performance|latency|scalability/i, 3],
  [/security|secret|risk/i, 4],
  [/telemetry|metrics|observability/i, 2],
  [/accessibility|a11y|contrast/i, 2]
];
const complexityKeywords = [
  [/multi-file|refactor|index|graph/i, 4],
  [/semantic|embedding|vector/i, 4],
  [/real-time|collaboration/i, 3],
  [/dashboard|visualization/i, 2],
  [/heuristic|scoring|model/i, 3]
];
const riskKeywords = [
  [/deletion|guard|security|secret/i, 4],
  [/refactor|rename|organize imports/i, 3],
  [/automation|generated/i, 2],
  [/performance|metrics/i, 2]
];

function score(title, list){
  let s = 1;
  const factors = [];
  for(const rule of list){
    if(Array.isArray(rule)) { const [re,val]=rule; if(re.test(title)){ s += val; factors.push(re.source); } }
    else if(rule instanceof RegExp){ if(rule.test(title)){ s += 2; factors.push(rule.source); } }
  }
  return { value: Math.min(s,10), factors };
}

function normalizeCategory(cat){
  if(!cat) return 1;
  if(cat <= 5) return 1.1; // core/platform/editor
  if(cat <= 10) return 1.05; // mid-tier
  if(cat <= 18) return 1.0; // general
  if(cat <= 23) return 1.0;
  if(cat <= 26) return 1.2; // advanced parity
  if(cat <= 28) return 1.15; // reporting / automation expansions
  return 1.0;
}

function main(){
  if(!fs.existsSync(TASKS_JSON)){
    console.error('tasks_all.json missing.');
    process.exit(1);
  }
  const force = process.argv.includes('--force');
  const data = load();
  let updated = 0;
  for(const t of data.tasks){
    if(!force && t.priorityScore && t.complexityScore && t.riskScore) continue;
    const {value:baseP, factors:pf} = score(t.title, priorityKeywords);
    const {value:baseC, factors:cf} = score(t.title, complexityKeywords);
    const {value:baseR, factors:rf} = score(t.title, riskKeywords);
    const mult = normalizeCategory(t.categoryNumber);
    t.priorityScore = Math.round(baseP * mult * 100)/100;
    t.complexityScore = Math.round(baseC * mult * 100)/100;
    t.riskScore = Math.round(baseR * mult * 100)/100;
    // Derived composite (higher is more urgent impact)
    t.impactScore = Math.round((t.priorityScore * 0.5 + t.riskScore * 0.3 + (10 - t.complexityScore)*0.2)*100)/100;
    if(force || !t.priorityFactors) t.priorityFactors = pf;
    if(force || !t.complexityFactors) t.complexityFactors = cf;
    if(force || !t.riskFactors) t.riskFactors = rf;
    if(!t.updatedByScript) t.updatedByScript = 'scoreTasks'; else t.updatedByScript = 'scoreTasks';
    updated++;
  }
  data.scoredAt = new Date().toISOString();
  save(data);
  console.log(`Scored ${updated} tasks.`);
}

main();
