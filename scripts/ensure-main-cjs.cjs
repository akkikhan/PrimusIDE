// Ensure Electron main entry is CommonJS (.cjs) under package.type=module
// Copies dist/main/main/main.js -> dist/main/main/main.cjs if source exists
// and removes stale incompatible .cjs if content differs.
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(process.cwd(), 'dist', 'main', 'main');
const jsPath = path.join(distDir, 'main.js');
const cjsPath = path.join(distDir, 'main.cjs');

try {
  if (!fs.existsSync(jsPath)) {
    console.warn('[ensure-main-cjs] source not found:', jsPath);
    process.exit(0);
  }
  const src = fs.readFileSync(jsPath);
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(cjsPath, src);
  console.log('[ensure-main-cjs] wrote', cjsPath, 'from', jsPath, `(${src.length} bytes)`);
} catch (e) {
  console.error('[ensure-main-cjs] failed:', e && e.message);
  process.exit(1);
}
