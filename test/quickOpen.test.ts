import { fuzzyMatch } from '../src/renderer/commanding/fuzzy.js';

const files = [
  { path: 'src/index.ts', name: 'index.ts' },
  { path: 'src/renderer/App.tsx', name: 'App.tsx' },
  { path: 'src/main/main.ts', name: 'main.ts' },
  { path: 'README.md', name: 'README.md' }
];

function assert(condition: any, message: string) {
  if (!condition) throw new Error('Assertion failed: ' + message);
}

// Basic fuzzy ordering test
const res = fuzzyMatch('app', files, f => f.name + ' ' + f.path);
assert(res[0].item.name.toLowerCase().includes('app'), 'App.tsx should be top for query app');

// Query for md should return readme
const res2 = fuzzyMatch('md', files, f => f.name);
assert(res2.some(r => r.item.name === 'README.md'), 'README.md should be in results for md');

console.log('QuickOpen tests passed:', { top: res[0].item.name, mdFound: true });
