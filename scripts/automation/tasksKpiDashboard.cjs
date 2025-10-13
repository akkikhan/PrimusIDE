#!/usr/bin/env node
/**
 * tasksKpiDashboard.cjs
 * Generates KPI metrics for the task backlog and prints a Markdown dashboard.
 * Also writes JSON artifact to artifacts/tasks-kpi.json and markdown to artifacts/tasks-kpi.md
 */
const fs = require('fs');
const path = require('path');

function readTasks() {
  const p = path.resolve(process.cwd(), 'tasks_all.json');
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  return data.tasks;
}

function normalizeStatus(raw) {
  switch (raw) {
    case 'SPEC':
    case 'DERIVED':
      return 'PLANNED';
    case 'FUTURE':
      return 'BACKLOG';
    case 'TODO':
      return 'READY';
    case 'IMPL':
      return 'IN_PROGRESS';
    case 'DONE':
    case 'COMPLETE':
      return 'COMPLETE';
    default:
      return 'PLANNED';
  }
}

function aggregate(tasks) {
  const rawCounts = {};
  const normCounts = {};
  let priorityScores = [];
  let inProgressAging = []; // placeholder for future aging logic

  for (const t of tasks) {
    rawCounts[t.status] = (rawCounts[t.status] || 0) + 1;
    const norm = normalizeStatus(t.status);
    normCounts[norm] = (normCounts[norm] || 0) + 1;
    if (typeof t.priorityScore === 'number') priorityScores.push(t.priorityScore);
    if (norm === 'IN_PROGRESS') {
      // Extract age from creation date for later enhancements
      if (t.createdAt) {
        const ageDays = (Date.now() - new Date(t.createdAt).getTime()) / 86400000;
        inProgressAging.push(ageDays);
      }
    }
  }
  const total = tasks.length;
  const pct = obj => Object.fromEntries(Object.entries(obj).map(([k,v])=>[k, v*100/total]));

  // KPI calculations
  const actionable = (normCounts.READY || 0) + (normCounts.IN_PROGRESS || 0) + (normCounts.COMPLETE || 0);
  const actionableCompletePct = actionable === 0 ? 0 : ((normCounts.COMPLETE || 0) * 100 / actionable);
  const backlogRatio = total === 0 ? 0 : ((normCounts.BACKLOG || 0) * 100 / total);
  priorityScores.sort((a,b)=>a-b);
  const prStats = priorityScores.length ? {
    min: priorityScores[0],
    p50: priorityScores[Math.floor(priorityScores.length*0.5)],
    p90: priorityScores[Math.floor(priorityScores.length*0.9)],
    max: priorityScores[priorityScores.length-1],
    count: priorityScores.length,
  } : null;
  const agingStats = inProgressAging.length ? {
    avgDays: inProgressAging.reduce((a,b)=>a+b,0)/inProgressAging.length,
    maxDays: Math.max(...inProgressAging)
  } : null;

  return {
    total,
    rawCounts,
    rawPercents: pct(rawCounts),
    normCounts,
    normPercents: pct(normCounts),
    actionable,
    actionableCompletePct,
    backlogRatio,
    priorityStats: prStats,
    inProgressAging: agingStats
  };
}

function formatTable(title, counts, percents) {
  const rows = Object.keys(counts).sort().map(k=>`| ${k} | ${counts[k]} | ${percents[k].toFixed(2)}% |`);
  return `### ${title}\n\n| Status | Count | Percent |\n| --- | --- | --- |\n${rows.join('\n')}`;
}

function buildMarkdown(kpi) {
  const lines = [];
  lines.push(`# Tasks KPI Dashboard`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total Tasks: **${kpi.total}**`);
  lines.push('');
  lines.push(formatTable('Raw Status Distribution', kpi.rawCounts, kpi.rawPercents));
  lines.push('');
  lines.push(formatTable('Normalized Lifecycle Distribution', kpi.normCounts, kpi.normPercents));
  lines.push('');
  lines.push(`**Actionable Completion %:** ${kpi.actionableCompletePct.toFixed(2)}%`);
  lines.push(`**Backlog Ratio (BACKLOG / Total):** ${kpi.backlogRatio.toFixed(2)}%`);
  if (kpi.priorityStats) {
    const ps = kpi.priorityStats;
    lines.push('');
    lines.push(`**Priority Scores:** min=${ps.min.toFixed(2)} p50=${ps.p50.toFixed(2)} p90=${ps.p90.toFixed(2)} max=${ps.max.toFixed(2)} (n=${ps.count})`);
  }
  if (kpi.inProgressAging) {
    const a = kpi.inProgressAging;
    lines.push(`**IN_PROGRESS Aging:** avg=${a.avgDays.toFixed(1)}d max=${a.maxDays.toFixed(1)}d`);
  }
  lines.push('');
  lines.push('> Definitions: Actionable = READY + IN_PROGRESS + COMPLETE; Actionable Completion % = COMPLETE / Actionable.');
  return lines.join('\n');
}

function ensureArtifacts() {
  const dir = path.resolve(process.cwd(), 'artifacts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function main() {
  const tasks = readTasks();
  const kpi = aggregate(tasks);
  const md = buildMarkdown(kpi);
  console.log(md);
  const artifactsDir = ensureArtifacts();
  fs.writeFileSync(path.join(artifactsDir, 'tasks-kpi.json'), JSON.stringify({ generatedAt: new Date().toISOString(), ...kpi }, null, 2));
  fs.writeFileSync(path.join(artifactsDir, 'tasks-kpi.md'), md, 'utf8');
}

main();
