// Rollback script - Remove logger imports temporarily
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Pattern to remove logger imports and restore console
const patterns = [
  { pattern: /import { logger } from '@shared\/logger';\n/g, replacement: '' },
  { pattern: /logger\.debug\(/g, replacement: 'console.log(' },
  { pattern: /logger\.error\(/g, replacement: 'console.error(' },
  { pattern: /logger\.warn\(/g, replacement: 'console.warn(' },
  { pattern: /logger\.info\(/g, replacement: 'console.info(' },
];

function rollbackFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  patterns.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Rolled back: ${path.basename(filePath)}`);
    return true;
  }
  
  return false;
}

// Find all TypeScript/JavaScript files
const srcPath = path.join(__dirname, '..', 'src');
const files = glob.sync('**/*.{ts,tsx,js,jsx}', { 
  cwd: srcPath,
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
});

console.log(`🔄 Rolling back ${files.length} files...`);

let rolledBackCount = 0;
files.forEach(file => {
  const fullPath = path.join(srcPath, file);
  if (rollbackFile(fullPath)) {
    rolledBackCount++;
  }
});

console.log(`\n✅ Rolled back ${rolledBackCount} files`);
console.log('📝 The logger system needs proper webpack/tsconfig configuration first');
