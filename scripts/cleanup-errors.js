#!/usr/bin/env node

/**
 * ERROR CLEANUP SCRIPT
 * Systematically fixes console errors, warnings, and code issues
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const ISSUES_FOUND = [];
const FIXES_APPLIED = [];

// Issue patterns to find and fix
const PATTERNS = [
  {
    name: 'Incomplete console.error',
    pattern: /console\.error\s*$/m,
    fix: (line) => line.replace(/console\.error\s*$/, "console.error('Error:', error);"),
    severity: 'error'
  },
  {
    name: 'Incomplete console.warn', 
    pattern: /console\.warn\s*$/m,
    fix: (line) => line.replace(/console\.warn\s*$/, "console.warn('Warning:', error);"),
    severity: 'warning'
  },
  {
    name: 'Missing error message',
    pattern: /console\.(error|warn)\(\s*error\s*\)/,
    fix: (line) => line.replace(/console\.(error|warn)\(\s*error\s*\)/, "console.$1('Error occurred:', error)"),
    severity: 'warning'
  },
  {
    name: 'Any type without annotation',
    pattern: /catch\s*\(e\)/,
    fix: (line) => line.replace(/catch\s*\(e\)/, 'catch (e: any)'),
    severity: 'type'
  },
  {
    name: 'Unhandled promise rejection',
    pattern: /\.then\([^)]*\)\s*;/,
    fix: (line) => line + '.catch(err => console.error("Promise rejected:", err));',
    severity: 'error',
    checkNext: true
  }
];

// File extensions to process
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Helper functions
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  fix: (msg) => console.log(chalk.green('🔧'), msg)
};

/**
 * Recursively find all source files
 */
function findSourceFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.git' && item !== 'dist') {
        findSourceFiles(fullPath, files);
      }
    } else if (FILE_EXTENSIONS.includes(path.extname(item))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Analyze a file for issues
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  lines.forEach((line, index) => {
    PATTERNS.forEach(pattern => {
      if (pattern.pattern.test(line)) {
        issues.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          pattern: pattern.name,
          severity: pattern.severity,
          fix: pattern.fix
        });
      }
    });
  });
  
  return issues;
}

/**
 * Fix issues in a file
 */
function fixFile(filePath, issues) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let fixed = false;
  
  // Sort issues by line number in reverse to avoid index shifting
  issues.sort((a, b) => b.line - a.line);
  
  issues.forEach(issue => {
    const lineIndex = issue.line - 1;
    const originalLine = lines[lineIndex];
    const fixedLine = issue.fix(originalLine);
    
    if (originalLine !== fixedLine) {
      lines[lineIndex] = fixedLine;
      fixed = true;
      
      FIXES_APPLIED.push({
        file: issue.file,
        line: issue.line,
        before: originalLine.trim(),
        after: fixedLine.trim()
      });
    }
  });
  
  if (fixed) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return true;
  }
  
  return false;
}

/**
 * Main cleanup function
 */
async function cleanupErrors() {
  console.log(chalk.cyan('\n🧹 Starting Error Cleanup\n'));
  
  // Find all source files
  log.info('Finding source files...');
  const files = findSourceFiles(SRC_DIR);
  log.info(`Found ${files.length} source files`);
  
  // Analyze files
  console.log(chalk.cyan('\n📊 Analyzing Files\n'));
  
  let totalIssues = 0;
  const fileIssues = {};
  
  for (const file of files) {
    const issues = analyzeFile(file);
    if (issues.length > 0) {
      fileIssues[file] = issues;
      totalIssues += issues.length;
      ISSUES_FOUND.push(...issues);
    }
  }
  
  // Report findings
  console.log(chalk.cyan('\n📋 Issues Found\n'));
  
  const issueCounts = {};
  ISSUES_FOUND.forEach(issue => {
    issueCounts[issue.pattern] = (issueCounts[issue.pattern] || 0) + 1;
  });
  
  Object.entries(issueCounts).forEach(([pattern, count]) => {
    const severity = PATTERNS.find(p => p.name === pattern)?.severity;
    const icon = severity === 'error' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
    console.log(`  ${icon} ${pattern}: ${count}`);
  });
  
  console.log(`\n  Total issues: ${totalIssues}`);
  
  // Fix issues
  if (totalIssues > 0) {
    console.log(chalk.cyan('\n🔧 Applying Fixes\n'));
    
    let filesFixed = 0;
    for (const [file, issues] of Object.entries(fileIssues)) {
      if (fixFile(file, issues)) {
        filesFixed++;
        const relativePath = path.relative(SRC_DIR, file);
        log.fix(`Fixed ${issues.length} issues in ${relativePath}`);
      }
    }
    
    console.log(chalk.green(`\n✅ Fixed ${FIXES_APPLIED.length} issues in ${filesFixed} files\n`));
    
    // Show sample fixes
    if (FIXES_APPLIED.length > 0) {
      console.log(chalk.cyan('Sample Fixes:\n'));
      FIXES_APPLIED.slice(0, 5).forEach(fix => {
        const relativePath = path.relative(SRC_DIR, fix.file);
        console.log(`  ${relativePath}:${fix.line}`);
        console.log(`    ${chalk.red('- ' + fix.before)}`);
        console.log(`    ${chalk.green('+ ' + fix.after)}\n`);
      });
    }
  } else {
    console.log(chalk.green('\n✅ No issues found! Code is clean.\n'));
  }
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    filesAnalyzed: files.length,
    issuesFound: ISSUES_FOUND.length,
    fixesApplied: FIXES_APPLIED.length,
    issues: ISSUES_FOUND,
    fixes: FIXES_APPLIED
  };
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'error-cleanup-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  log.info('Report saved to error-cleanup-report.json');
}

// Install dependencies if needed
try {
  require.resolve('chalk');
} catch (e) {
  console.log('Installing chalk...');
  require('child_process').execSync('npm install --save-dev chalk', {
    stdio: 'inherit'
  });
}

// Run cleanup
cleanupErrors().catch(err => {
  log.error(`Cleanup failed: ${err.message}`);
  process.exit(1);
});
