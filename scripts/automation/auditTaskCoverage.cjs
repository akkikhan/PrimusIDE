#!/usr/bin/env node
/**
 * Audit coverage of userStory & acceptanceCriteria across tasks_all.json
 * Outputs:
 *  - Console summary table
 *  - artifacts/tasks_coverage_report.json
 *  - artifacts/tasks_coverage_report.md
 * Flags:
 *   --fail-on-gaps : exit 1 if any targeted status missing coverage
 *   --include-all  : evaluate all statuses, else only SPEC/IMPL/TODO (default) unless --all-status used downstream
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TASKS_JSON = path.join(ROOT,'tasks_all.json');
const ART_DIR = path.join(ROOT,'artifacts');
if(!fs.existsSync(ART_DIR)) fs.mkdirSync(ART_DIR);

const args = process.argv.slice(2);
const failOnGaps = args.includes('--fail-on-gaps');
const includeAll = args.includes('--include-all');

function load(){ return JSON.parse(fs.readFileSync(TASKS_JSON,'utf8')); }

const TARGET_STATUSES = ['SPEC','IMPL','TODO'];
const EXTENDED_STATUSES = ['DERIVED','FUTURE','BACKLOG','IDEA','RESEARCH'];

function isTargetStatus(status){
  if(includeAll) return TARGET_STATUSES.concat(EXTENDED_STATUSES).includes(status);
  return TARGET_STATUSES.includes(status);
}

function audit(){
  const data = load();
  const rows = [];
  for(const t of data.tasks){
    if(!isTargetStatus(t.status)) continue;
    const hasStory = !!(t.userStory && t.userStory.trim());
    const criteriaCount = Array.isArray(t.acceptanceCriteria) ? t.acceptanceCriteria.length : 0;
    const hasCriteria = criteriaCount > 0;
    if(!hasStory || !hasCriteria){
      rows.push({id:t.id,status:t.status,title:t.title.substring(0,80),hasStory,criteriaCount,placeholder:!!t.placeholderAdded});
    }
  }
  return { totalTasks: load().total, gaps: rows };
}

function toMarkdown(report){
  if(report.gaps.length === 0) return '# Task Coverage Report\n\nAll targeted tasks have user stories and acceptance criteria.\n';
  const header = '# Task Coverage Report\n\n| ID | Status | Has Story | Criteria Count | Placeholder | Title |\n|---|---|---|---|---|---|';
  const lines = report.gaps.map(r=> `| ${r.id} | ${r.status} | ${r.hasStory?'yes':'no'} | ${r.criteriaCount} | ${r.placeholder?'yes':'no'} | ${r.title.replace(/\|/g,'/')} |`);
  return header + '\n' + lines.join('\n') + '\n';
}

function main(){
  if(!fs.existsSync(TASKS_JSON)){
    console.error('tasks_all.json missing');
    process.exit(1);
  }
  const report = audit();
  const jsonPath = path.join(ART_DIR,'tasks_coverage_report.json');
  const mdPath = path.join(ART_DIR,'tasks_coverage_report.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report,null,2));
  fs.writeFileSync(mdPath, toMarkdown(report));
  if(report.gaps.length){
    console.log(`Coverage gaps: ${report.gaps.length}`);
    console.table(report.gaps.slice(0,20));
  } else {
    console.log('No coverage gaps found.');
  }
  if(failOnGaps && report.gaps.length){
    process.exit(2);
  }
}

main();
