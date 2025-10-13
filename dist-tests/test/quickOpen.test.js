// Import the fuzzyMatch directly from source; when compiled, path is adjusted under dist-tests
import { fuzzyMatch } from '../src/renderer/commanding/fuzzy.js';
const sampleFiles = [
    { path: '/workspace/src/App.tsx', name: 'App.tsx' },
    { path: '/workspace/src/index.tsx', name: 'index.tsx' },
    { path: '/workspace/README.md', name: 'README.md' },
    { path: '/workspace/package.json', name: 'package.json' },
    { path: '/workspace/src/components/CommandPalette.tsx', name: 'CommandPalette.tsx' },
];
// Simple assertion helper
function assert(cond, msg) {
    if (!cond)
        throw new Error('Assertion failed: ' + msg);
}
export function runQuickOpenTest() {
    const results = fuzzyMatch('app', sampleFiles, f => f.name + ' ' + f.path, () => 0).map(r => r.item.name);
    assert(results[0] === 'App.tsx' || results[1] === 'App.tsx', 'App.tsx should appear near top for query app');
    const idx = results.indexOf('CommandPalette.tsx');
    assert(idx >= 0, 'CommandPalette.tsx should be in results');
    console.log('[quickOpen.test] All assertions passed. Top results:', results.slice(0, 3));
}
// Auto-execute
runQuickOpenTest();
