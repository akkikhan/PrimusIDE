// Script to replace console.log statements with logger
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const LOGGER_IMPORT = "import { logger } from '@shared/logger';";

// Patterns to replace
const replacements = [
  { pattern: /console\.log\(/g, replacement: 'logger.debug(' },
  { pattern: /console\.error\(/g, replacement: 'logger.error(' },
  { pattern: /console\.warn\(/g, replacement: 'logger.warn(' },
  { pattern: /console\.info\(/g, replacement: 'logger.info(' },
  { pattern: /console\.debug\(/g, replacement: 'logger.debug(' },
];

function cleanupFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Skip test files for now
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return false;
  }

  // Check if file has console statements
  const hasConsole = replacements.some(r => r.pattern.test(content));
  
  if (hasConsole) {
    // Apply replacements
    replacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });

    // Add import if not present and file was modified
    if (modified && !content.includes("from '@shared/logger'")) {
      // Find the first import statement or start of file
      const importMatch = content.match(/^import .* from/m);
      if (importMatch) {
        const index = content.indexOf(importMatch[0]);
        content = content.slice(0, index) + LOGGER_IMPORT + '\n' + content.slice(index);
      } else {
        content = LOGGER_IMPORT + '\n\n' + content;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Cleaned: ${path.basename(filePath)}`);
      return true;
    }
  }
  
  return false;
}

// Find all TypeScript/JavaScript files
const srcPath = path.join(__dirname, '..', 'src');
const files = glob.sync('**/*.{ts,tsx,js,jsx}', { 
  cwd: srcPath,
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
});

console.log(`🔍 Found ${files.length} files to check...`);

let cleanedCount = 0;
files.forEach(file => {
  const fullPath = path.join(srcPath, file);
  if (cleanupFile(fullPath)) {
    cleanedCount++;
  }
});

console.log(`\n✅ Cleaned ${cleanedCount} files`);
console.log('📝 Next steps:');
console.log('1. Run: npm run build');
console.log('2. Test the application');
console.log('3. Check that logging still works in development mode');
