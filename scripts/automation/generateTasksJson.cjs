#!/usr/bin/env node
/**
 * Parse ALL_TASKS.md into structured JSON (tasks_all.json) with enrichment placeholders.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INPUT_MD = path.join(ROOT, 'ALL_TASKS.md');
const OUTPUT_JSON = path.join(ROOT, 'tasks_all.json');
const SNAPSHOT_DIR = path.join(ROOT, 'task-snapshots');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, {recursive:true}); }

function sha1(str){
  const crypto = require('crypto');
  return crypto.createHash('sha1').update(str).digest('hex');
}

function deriveLifecycle(origin){
  if(['SPEC','IMPL','TODO','DERIVED','FUTURE'].includes(origin)) return 'planned';
  return 'planned';
}

function classifySource(origin){
  switch(origin){
    case 'SPEC': return 'spec';
    case 'IMPL': return 'inline';
    case 'TODO': return 'inline';
    case 'DERIVED': return 'derived';
    case 'FUTURE': return 'future';
    default: return 'other';
  }
}

function autoTagFromTitle(title){
  const base = [];
  if(/ai|intelligence|model/i.test(title)) base.push('ai');
  if(/git|branch|commit/i.test(title)) base.push('git');
  if(/perf|performance|latency|scalability/i.test(title)) base.push('performance');
  if(/security|secret|csp|permission/i.test(title)) base.push('security');
  if(/accessibility|contrast|aria|keyboard/i.test(title)) base.push('accessibility');
  if(/test|coverage|qa|e2e/i.test(title)) base.push('testing');
  if(/plugin|extension/i.test(title)) base.push('extension');
  if(/search|symbol|index/i.test(title)) base.push('navigation');
  return Array.from(new Set(base));
}

function parse(){
  const md = fs.readFileSync(INPUT_MD,'utf8').split(/\r?\n/);
  const tasks = [];
  let currentCategory = null;
  let currentCategoryName = null;
  const catRegex = /^##\s+(\d+)\.\s+([^()]+?)(?:\s*\([^)]*\))?$/; // matches "## 1. Core Platform..."
  const altCatRegex = /^#+\s*Category\s+(\d+)\s*[:\-]\s*(.+)$/i;
  const taskRegex = /^(\d+)\.\s+(.*)$/; // capture id and rest
  const statusBracket = /\[(SPEC|IMPL|TODO|DERIVED|FUTURE)\]$/i;
  const statusParen = /\((SPEC|IMPL|TODO|DERIVED|FUTURE)\)$/i;
  let inOverview = true; // skip numbered overview list before first category heading

  const seenIds = new Set();
  for(const line of md){
    if(inOverview){
      if(catRegex.test(line) || altCatRegex.test(line)) inOverview = false; else continue;
    }
    const catMatch = line.match(catRegex) || line.match(altCatRegex);
    if(catMatch){
      currentCategory = parseInt(catMatch[1],10);
      currentCategoryName = (catMatch[2]||'').trim();
      continue;
    }
    if(!currentCategory) continue; // do not record tasks until a category heading encountered
    const tMatch = line.match(taskRegex);
    if(tMatch){
      const id = parseInt(tMatch[1],10);
      let title = tMatch[2].trim();
      let status = 'UNKNOWN';
      let sMatch = title.match(statusBracket);
      if(!sMatch) sMatch = title.match(statusParen);
      if(sMatch){
        status = sMatch[1].toUpperCase();
        title = title.replace(statusBracket,'').replace(statusParen,'').trim();
      }
      if(seenIds.has(id)) {
        // skip duplicated trailing guidance lines (e.g., Next Steps reiterating low IDs)
        continue;
      }
      seenIds.add(id);
      const originTag = status;
      const lifecycleStatus = deriveLifecycle(originTag);
      const sourceType = classifySource(originTag);
      const contentHash = sha1(`${id}|${title}|${originTag}`);
      tasks.push({
        id,
        title,
        categoryNumber: currentCategory,
        category: currentCategoryName,
        status: originTag,
        originTag,
        lifecycleStatus,
        sourceType,
        userStory: '',
        validationSteps: [],
        acceptanceCriteria: [],
        sources: [],
        tags: [],
        autoTags: autoTagFromTitle(title),
        blocked: false,
        dependencies: [],
        statusHistory: [{ date: new Date().toISOString(), status: lifecycleStatus }],
        effortEstimate: null,
        contentHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedByScript: 'generateTasksJson'
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