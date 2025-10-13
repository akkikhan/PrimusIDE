#!/usr/bin/env node
/**
 * Spec-Kit Task Generator
 * Reads plan JSON files produced by generate-plan.js and explodes tasks into individual task JSON files in /tasks.
 * Usage: node scripts/spec-kit/generate-tasks.js plans/*.plan.json
 */

const fs = require('fs');
const path = require('path');

function main() {
  const planFiles = process.argv.slice(2);
  if (!planFiles.length) {
    console.error('No plan files provided. Usage: node scripts/spec-kit/generate-tasks.js plans/*.plan.json');
    process.exit(1);
  }
  const tasksDir = path.join(process.cwd(), 'tasks');
  if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });

  planFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
    plan.tasks.forEach(t => {
      const taskPath = path.join(tasksDir, `${t.id}.task.json`);
      let existing = null;
      if (fs.existsSync(taskPath)) {
        try { existing = JSON.parse(fs.readFileSync(taskPath, 'utf8')); } catch (_) {}
      }
      const merged = {
        id: t.id,
        specId: plan.specId,
        title: t.title,
        source: t.source,
        status: existing?.status || 'pending',
        assignee: existing?.assignee || null,
        created: existing?.created || new Date().toISOString(),
        updated: new Date().toISOString(),
        description: existing?.description || ''
      };
      fs.writeFileSync(taskPath, JSON.stringify(merged, null, 2));
      console.log(`Wrote task: ${taskPath}`);
    });
  });
}

if (require.main === module) {
  main();
}
