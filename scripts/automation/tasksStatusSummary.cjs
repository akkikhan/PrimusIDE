#!/usr/bin/env node
// tasksStatusSummary.cjs
// Generates status distribution summary from tasks_all.json
// Outputs Markdown table to stdout and writes artifact JSON to artifacts/tasks-status-summary.json

const fs = require('fs');
const path = require('path');

function loadTasks() {
  const tasksPath = path.resolve(process.cwd(), 'tasks_all.json');
  const raw = fs.readFileSync(tasksPath, 'utf8');
  const data = JSON.parse(raw);
  return data;
}

function computeDistribution(data) {
  const total = data.total || data.tasks.length;
  const counts = {};
  for (const t of data.tasks) {
    counts[t.status] = (counts[t.status] || 0) + 1;
  }
  const percent = Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, (v * 100 / total)])
  );
  return { total, counts, percent };
}

function toMarkdown(dist) {
  const headers = ['Status', 'Count', 'Percent'];
  const rows = Object.entries(dist.counts)
    .sort((a,b)=> a[0].localeCompare(b[0]))
    .map(([status, count]) => {
      const pct = dist.percent[status];
      return `| ${status} | ${count} | ${pct.toFixed(2)}% |`;
    });
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(()=> '---').join(' | ')} |`,
    ...rows,
    `| TOTAL | ${dist.total} | 100.00% |`
  ].join('\n');
}

function ensureArtifactsDir() {
  const artifactsDir = path.resolve(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });
  return artifactsDir;
}

function main() {
  const data = loadTasks();
  const dist = computeDistribution(data);
  const md = toMarkdown(dist);
  console.log(md); // stdout
  const artifactsDir = ensureArtifactsDir();
  const outPath = path.join(artifactsDir, 'tasks-status-summary.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), ...dist }, null, 2));
}

main();
