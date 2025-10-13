import assert from 'assert';
import { groupAndSortProblems, summarizeCounts, ProblemSeverity } from '../src/renderer/diagnostics/groupingRuntime.js';

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
assert.deepStrictEqual(groups.map(g => g.file), ['/a.ts','/b.ts','/c.ts']);

const bProblems = groups.find(g => g.file === '/b.ts')!.problems;
assert.deepStrictEqual(bProblems.map(p => p.id), ['5','6','7','1']);

const aProblems = groups.find(g => g.file === '/a.ts')!.problems;
assert.deepStrictEqual(aProblems.map(p => p.id), ['2','3']);

console.log('problemsPanel helper tests passed');
