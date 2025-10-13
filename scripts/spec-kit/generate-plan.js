#!/usr/bin/env node
/**
 * Spec-Kit Plan Generator
 * Reads spec markdown files (with frontmatter + sections) and produces a consolidated plan JSON file per spec.
 * Usage: node scripts/spec-kit/generate-plan.js specs/*.spec.md
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

function parseSections(body) {
  const lines = body.split(/\r?\n/);
  const sections = {};
  let current = null;
  for (const line of lines) {
    const headingMatch = line.match(/^#\s+(.+)/);
    if (headingMatch) {
      current = headingMatch[1].trim();
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  }
  for (const key of Object.keys(sections)) {
    sections[key] = sections[key].join('\n').trim();
  }
  return sections;
}

function deriveList(sectionText) {
  if (!sectionText) return [];
  const out = [];
  sectionText.split(/\r?\n/).forEach(l => {
    const m = l.match(/^[-*+]\s+(.*)/) || l.match(/^\d+\.\s+(.*)/);
    if (m) out.push(m[1].trim());
  });
  return out;
}

function deriveTasks(specId, goals, requirements) {
  const tasks = [];
  let idx = 1;
  for (const g of goals) {
    tasks.push({ id: `${specId}-g${idx}`, title: g, source: 'goal', status: 'pending' });
    idx++;
  }
  idx = 1;
  for (const r of requirements) {
    tasks.push({ id: `${specId}-r${idx}`, title: r, source: 'requirement', status: 'pending' });
    idx++;
  }
  return tasks;
}

function main() {
  const specFiles = process.argv.slice(2);
  if (!specFiles.length) {
    console.error('No spec files provided. Usage: node scripts/spec-kit/generate-plan.js specs/*.spec.md');
    process.exit(1);
  }
  const plansDir = path.join(process.cwd(), 'plans');
  if (!fs.existsSync(plansDir)) fs.mkdirSync(plansDir, { recursive: true });

  specFiles.forEach(file => {
    if (!fs.existsSync(file)) return; // glob shells may pass non-matching patterns literally
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = matter(raw);
    const { data, content } = parsed;
    const sections = parseSections(content);
    const goals = deriveList(sections['Goals']);
    const requirements = deriveList(sections['Requirements']);
    const plan = {
      specId: data.id,
      name: data.name,
      version: data.version || '0.1.0',
      status: data.status || 'draft',
      priority: data.priority || 'medium',
      type: data.type || 'feature',
      created: data.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      summary: sections['Summary'] || '',
      problem: sections['Problem'] || '',
      goals,
      requirements,
      tasks: deriveTasks(data.id, goals, requirements)
    };
    const outPath = path.join(plansDir, `${data.id}.plan.json`);
    fs.writeFileSync(outPath, JSON.stringify(plan, null, 2));
    console.log(`Generated plan: ${outPath}`);
  });
}

if (require.main === module) {
  main();
}
