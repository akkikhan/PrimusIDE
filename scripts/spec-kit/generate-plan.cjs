#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

/**
 * Generate plan files (one per spec) extracting front-matter and headings.
 * Usage: node scripts/spec-kit/generate-plan.cjs specs/*.spec.md
 */

function parseHeadings(content) {
  const lines = content.split(/\r?\n/);
  return lines
    .filter(l => l.startsWith('#'))
    .map(l => {
      const match = /^(#+)\s+(.*)/.exec(l.trim());
      if (!match) return null;
      return { level: match[1].length, text: match[2] };
    })
    .filter(Boolean);
}

function main() {
  const patterns = process.argv.slice(2);
  if (!patterns.length) {
    console.error('No spec files provided');
    process.exit(1);
  }
  const outDir = path.join(process.cwd(), 'plans');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  patterns.forEach(pattern => {
    // Simple glob expansion for specs/*.spec.md
    const [dir, filePattern] = [path.dirname(pattern), path.basename(pattern).replace('*', '')];
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.spec.md'));
    files.forEach(file => {
      const full = path.join(dir, file);
      const raw = fs.readFileSync(full, 'utf8');
      const parsed = matter(raw);
      const headings = parseHeadings(parsed.content);
      const plan = {
        specFile: file,
        title: parsed.data.title || file.replace('.spec.md', ''),
        status: parsed.data.status || 'draft',
        created: parsed.data.created || null,
        updated: parsed.data.updated || null,
        description: parsed.data.description || '',
        headings,
        generatedAt: new Date().toISOString()
      };
      const outPath = path.join(outDir, file.replace('.spec.md', '.plan.json'));
      fs.writeFileSync(outPath, JSON.stringify(plan, null, 2));
      console.log('Generated plan', outPath);
    });
  });
}

main();