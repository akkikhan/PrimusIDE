import assert from 'assert';
import { globalCommandRegistry } from '../src/renderer/commanding/CommandRegistry.js';
import { fuzzyMatch } from '../src/renderer/commanding/fuzzy.js';
// Register sample commands (idempotent across re-runs)
const samples = [
    { id: 'file.new', title: 'New File', category: 'File', action: () => { } },
    { id: 'file.open', title: 'Open File', category: 'File', action: () => { } },
    { id: 'view.toggleTerminal', title: 'Toggle Terminal', category: 'View', action: () => { } },
    { id: 'theme.toggle', title: 'Toggle Theme', category: 'View', action: () => { } },
    { id: 'git.show', title: 'Show Source Control', category: 'Git', action: () => { } }
];
samples.forEach(c => globalCommandRegistry.register(c));
// Execute some to populate recent ordering
['file.open', 'theme.toggle', 'file.new'].forEach(id => globalCommandRegistry.execute(id));
const list = globalCommandRegistry.list();
const results = fuzzyMatch('op fi', list, c => `${c.title} ${c.category}`);
assert(results.length > 0, 'Expected fuzzy results for query');
assert(results[0].item.id === 'file.open', 'Expected "file.open" to rank highest');
const recent = globalCommandRegistry.getRecent();
assert(recent[0].id === 'file.new', 'Recent ordering incorrect (file.new should be most recent)');
console.log('CommandPalette tests passed:', { fuzzyTop: results[0].item.id, recentFirst: recent[0].id });
