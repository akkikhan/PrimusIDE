// Script to clean up console statements
const fs = require('fs');
const path = require('path');

class ConsoleCleanup {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.stats = {
      filesProcessed: 0,
      consolesRemoved: 0,
      consolesKept: 0,
      errors: []
    };
  }

  // Patterns to remove (debug logs)
  removePatterns = [
    /console\.log\s*\([^)]*\);?\s*$/gm,
    /console\.debug\s*\([^)]*\);?\s*$/gm,
    /console\.trace\s*\([^)]*\);?\s*$/gm,
    /console\.time\s*\([^)]*\);?\s*$/gm,
    /console\.timeEnd\s*\([^)]*\);?\s*$/gm,
  ];

  // Patterns to keep but improve (errors and warnings)
  improvePatterns = [
    {
      pattern: /console\.error\s*\(([^)]+)\)/g,
      replacement: (match, args) => {
        // Keep error logging but make it production-safe
        if (process.env.NODE_ENV === 'production') {
          return `if (process.env.NODE_ENV !== 'production') console.error(${args})`;
        }
        return match;
      }
    },
    {
      pattern: /console\.warn\s*\(([^)]+)\)/g,
      replacement: (match, args) => {
        // Keep warnings but make them conditional
        if (process.env.NODE_ENV === 'production') {
          return `if (process.env.NODE_ENV !== 'production') console.warn(${args})`;
        }
        return match;
      }
    }
  ];

  processFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      let changesMade = false;

      // Remove debug console statements
      this.removePatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, '');
          this.stats.consolesRemoved += matches.length;
          changesMade = true;
        }
      });

      // Improve error/warning statements
      this.improvePatterns.forEach(({ pattern, replacement }) => {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, replacement);
          this.stats.consolesKept += matches.length;
          changesMade = true;
        }
      });

      // Clean up empty lines left behind
      content = content.replace(/^\s*\n\s*\n\s*\n/gm, '\n\n');

      if (changesMade) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Cleaned: ${path.relative(this.rootDir, filePath)}`);
      }

      this.stats.filesProcessed++;
    } catch (error) {
      this.stats.errors.push({ file: filePath, error: error.message });
    }
  }

  processDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules and other build directories
        if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
          this.processDirectory(filePath);
        }
      } else if (stat.isFile()) {
        // Process JS/TS files
        if (/\.(js|jsx|ts|tsx)$/.test(file)) {
          this.processFile(filePath);
        }
      }
    });
  }

  run() {
    console.log('🧹 Starting console cleanup...\n');
    this.processDirectory(this.rootDir);
    
    console.log('\n📊 Cleanup Complete!');
    console.log(`Files processed: ${this.stats.filesProcessed}`);
    console.log(`Console statements removed: ${this.stats.consolesRemoved}`);
    console.log(`Console statements improved: ${this.stats.consolesKept}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      this.stats.errors.forEach(({ file, error }) => {
        console.log(`  ${file}: ${error}`);
      });
    }
  }
}

// Run the cleanup
const srcDir = path.join(__dirname, '..', 'src');
const cleanup = new ConsoleCleanup(srcDir);
cleanup.run();
