import { fuzzyMatch } from '../src/renderer/commanding/fuzzy.js';
import { SymbolKind, SymbolInfo } from '../src/renderer/indexing/types.js';

function assert(condition: any, message: string) {
  if (!condition) throw new Error('Assertion failed: ' + message);
}

const symbols: SymbolInfo[] = [
  { name: 'App', kind: SymbolKind.Class, path: 'src/renderer/App.tsx', position: { start: 0, end: 10 } },
  { name: 'applyTheme', kind: SymbolKind.Function, path: 'src/renderer/theme.ts', position: { start: 0, end: 10 } },
  { name: 'ProjectIndexer', kind: SymbolKind.Class, path: 'src/renderer/indexing/ProjectIndexer.ts', position: { start: 0, end: 10 } },
  { name: 'fuzzyMatch', kind: SymbolKind.Function, path: 'src/renderer/commanding/fuzzy.ts', position: { start: 0, end: 10 } },
  { name: 'SymbolKind', kind: SymbolKind.Enum, path: 'src/renderer/indexing/types.ts', position: { start: 0, end: 10 } },
];

// Fuzzy should prioritize exact start-of-word and contiguous matches
const res = fuzzyMatch('app', symbols, s => s.name);
assert(res[0].item.name === 'App', 'App should rank first for query app');

// Another query for idx should include ProjectIndexer
const res2 = fuzzyMatch('prj', symbols, s => s.name);
assert(res2.some(r => r.item.name === 'ProjectIndexer'), 'ProjectIndexer should appear for prj');

// Query for sk should highlight SymbolKind (ensure presence)
const res3 = fuzzyMatch('sk', symbols, s => s.name.toLowerCase());
assert(res3.some(r => r.item.name === 'SymbolKind'), 'SymbolKind should be matched for sk');

console.log('SymbolsPanel tests passed:', {
  topApp: res[0].item.name,
  hasProjectIndexer: res2.some(r => r.item.name === 'ProjectIndexer'),
  hasSymbolKind: res3.some(r => r.item.name === 'SymbolKind')
});
