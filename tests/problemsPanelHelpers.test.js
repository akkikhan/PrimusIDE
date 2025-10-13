import assert from 'assert';
// Import the helper directly (pure logic) to test ordering & grouping
import { groupAndSortProblems, summarizeCounts } from '../src/renderer/diagnostics/grouping.js';
import { ProblemSeverity } from '../src/renderer/diagnostics/types.js';

function makeProblem(id, file, severity, line, col) {
  return {
    id,
    filePath: file,
    severity,
    message: `${severity} msg ${id}`,
    startLine: line,
    startColumn: col,
    endLine: line,
    endColumn: col + 5
  };
}

const sample = [
  makeProblem('1','/b.ts', ProblemSeverity.Warning, 10, 4),
  makeProblem('2','/a.ts', ProblemSeverity.Error, 3, 1),
  makeProblem('3','/a.ts', ProblemSeverity.Info, 30, 2),
  makeProblem('4','/c.ts', ProblemSeverity.Hint, 1, 1),
  makeProblem('5','/b.ts', ProblemSeverity.Error, 1, 1),
  makeProblem('6','/b.ts', ProblemSeverity.Error, 2, 1),
  makeProblem('7','/b.ts', ProblemSeverity.Warning, 8, 1),
];

// Test counts
const counts = summarizeCounts(sample);
assert.strictEqual(counts.errors, 3, 'should count 3 errors');
assert.strictEqual(counts.warnings, 2, 'should count 2 warnings');
assert.strictEqual(counts.info, 1, 'should count 1 info');
assert.strictEqual(counts.hints, 1, 'should count 1 hint');
assert.strictEqual(counts.total, sample.length, 'total mismatch');

// Test grouping & ordering
const groups = groupAndSortProblems(sample);

// Expect file group ordering: group with lowest top severity first (errors) and then by file name
// /b.ts has errors, /a.ts has an error, /c.ts only has hint. But alphabetical for same top severity => /a.ts then /b.ts
// However we compute top severity numeric (Error=0). Both /a.ts and /b.ts top severity = 0 so alphabetical: /a.ts, /b.ts, then /c.ts
assert.deepStrictEqual(groups.map(g => g.file), ['/a.ts','/b.ts','/c.ts']);

// Within /b.ts problems ordering: by severity then line then column
const bProblems = groups.find(g => g.file === '/b.ts').problems;
assert.deepStrictEqual(bProblems.map(p => p.id), ['5','6','1','7']);

// Within /a.ts ordering
const aProblems = groups.find(g => g.file === '/a.ts').problems;
assert.deepStrictEqual(aProblems.map(p => p.id), ['2','3']);

console.log('problemsPanel helper tests passed');
