import assert from 'assert';
import { globalCommandRegistry } from '../src/renderer/commanding/CommandRegistry.js';
import { fuzzyMatch } from '../src/renderer/commanding/fuzzy.js';

// Register sample commands
const samples = [
  { id: 'file.new', title: 'New File', category: 'File', action: () => {} },
  { id: 'file.open', title: 'Open File', category: 'File', action: () => {} },
  { id: 'view.toggleTerminal', title: 'Toggle Terminal', category: 'View', action: () => {} },
  { id: 'theme.toggle', title: 'Toggle Theme', category: 'View', action: () => {} },
  { id: 'git.show', title: 'Show Source Control', category: 'Git', action: () => {} }
];
samples.forEach(c => globalCommandRegistry.register(c));

// Execute some to populate recent
globalCommandRegistry.execute('file.open');
globalCommandRegistry.execute('theme.toggle');
globalCommandRegistry.execute('file.new');

// Fuzzy search tests
const list = globalCommandRegistry.list();
const results = fuzzyMatch('op fi', list, c => `${c.title} ${c.category}`);
assert(results.length > 0, 'Should return at least one fuzzy result');
assert(results[0].item.id === 'file.open', 'file.open should rank highest for query "op fi"');

// Recent commands ordering
const recent = globalCommandRegistry.getRecent();
assert(recent[0].id === 'file.new', 'Most recently executed should be first');

console.log('CommandPalette tests passed:', { fuzzyTop: results[0].item.id, recentFirst: recent[0].id });

console.log('🧪 Testing error and edge cases for CommandPalette...');

// Test 1: Duplicate registration - should throw or ignore
try {
  globalCommandRegistry.register({ id: 'file.new', title: 'New File', category: 'File', action: () => {} });
  console.error('FAIL: Duplicate registration should throw or log error');
  process.exit(1);
} catch (err) {
  if (!err.message.includes('duplicate')) {
    console.error('FAIL: Expected duplicate error, got: ' + err.message);
    process.exit(1);
  }
  console.log('✅ Duplicate registration handled correctly');
}

// Test 2: Empty query - should return no results
const emptyResults = fuzzyMatch('', list, c => `${c.title} ${c.category}`);
if (emptyResults.length !== 0) {
  console.error('FAIL: Empty query should return 0 results, got ' + emptyResults.length);
  process.exit(1);
}
console.log('✅ Empty query returns no results');

// Test 3: No matching query - should return empty
const noMatchResults = fuzzyMatch('nonexistentquery', list, c => `${c.title} ${c.category}`);
if (noMatchResults.length !== 0) {
  console.error('FAIL: No match query should return 0 results, got ' + noMatchResults.length);
  process.exit(1);
}
console.log('✅ No match query returns empty');

// Test 4: Multiple same recent commands - ordering should prioritize latest
globalCommandRegistry.execute('file.new');
globalCommandRegistry.execute('file.new'); // Duplicate
const recentAfterDup = globalCommandRegistry.getRecent();
if (recentAfterDup.length < 1 || recentAfterDup[0].id !== 'file.new') {
  console.error('FAIL: Recent list should show latest execution first');
  process.exit(1);
}
console.log('✅ Duplicate recent commands ordered correctly');

// Test 5: Invalid action (non-function) - should not crash on register/execute
try {
  globalCommandRegistry.register({ id: 'invalid.action', title: 'Invalid', category: 'Test', action: 'not a function' });
  globalCommandRegistry.execute('invalid.action');
  console.error('FAIL: Invalid action should throw on execute');
  process.exit(1);
} catch (err) {
  if (!err.message.includes('function')) {
    console.error('FAIL: Expected invalid action error, got: ' + err.message);
    process.exit(1);
  }
  console.log('✅ Invalid action throws correctly');
}

console.log('PASS all CommandPalette tests including errors and edges');