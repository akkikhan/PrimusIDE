#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Generate tasks from plan JSON files. Each heading (level 2+) becomes a task.
 * Usage: node scripts/spec-kit/generate-tasks.cjs plans/*.plan.json
 */

function main() {
  const patterns = process.argv.slice(2);
  if (!patterns.length) {
    console.error('No plan files provided');
    process.exit(1);
  }
  const outDir = path.join(process.cwd(), 'tasks');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  patterns.forEach(pattern => {
    const dir = path.dirname(pattern);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.plan.json'));
    files.forEach(file => {
      const full = path.join(dir, file);
      const plan = JSON.parse(fs.readFileSync(full, 'utf8'));
      const baseName = file.replace('.plan.json', '');
      let counter = 0;
      plan.headings.filter(h => h.level <= 3).forEach(h => {
        counter += 1;
        const task = {
          plan: file,
          ref: `${baseName}#${counter}`,
            title: h.text,
          status: 'pending',
          level: h.level,
          createdAt: new Date().toISOString()
        };
        const outPath = path.join(outDir, `${baseName}-${counter}.task.json`);
        fs.writeFileSync(outPath, JSON.stringify(task, null, 2));
        console.log('Generated task', outPath);
      });
    });
  });
}

main();