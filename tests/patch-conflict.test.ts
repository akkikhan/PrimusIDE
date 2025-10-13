import { computeHash, findExactHunkMatch, fuzzyLocateHunk, detectSessionConflicts } from '../src/main/patchConflict';

describe('Patch conflict detection', () => {
  test('computeHash produces stable hash', () => {
    const s = 'line1\nline2\nline3';
    const h1 = computeHash(s);
    const h2 = computeHash(s);
    expect(h1).toBe(h2);
  });

  test('findExactHunkMatch finds exact substring', () => {
    const orig = 'alpha\nbeta\ngamma';
    const current = 'pre\nalpha\nbeta\ngamma\npost';
    const res = findExactHunkMatch(orig, current);
    expect(res.found).toBe(true);
    expect(res.startLine).toBe(1);
  });

  test('fuzzyLocateHunk returns not found for unrelated content', () => {
    const hunk = { id: 'h1', newText: 'unique line a\nunique line b', status: 'pending' } as any;
    const current = 'some other content\nmore lines\n';
    const res = fuzzyLocateHunk(hunk, current);
    expect(res.found).toBe(false);
  });

  test('detectSessionConflicts marks missing files', async () => {
    const session = {
      id: 's1',
      createdAt: Date.now(),
      providerId: 'p',
      patches: {
        id: 'm1',
        description: 'test',
        patches: [{ filePath: 'missing.txt', hunks: [{ id: 'h1', originalStartLine: 1, originalEndLine: 2, newText: 'a', status: 'pending' }] }],
        dependencies: [],
        conflicts: [],
        risk: { overall: 0, factors: [] },
        metadata: { createdAt: Date.now(), estimatedTime: 0, complexity: 0, author: 'x' }
      },
      status: 'open'
    } as any;

    const loader = async (fp: string) => { throw new Error('not found'); };
    const out = await detectSessionConflicts(session, loader);
    expect(out.conflicts.length).toBeGreaterThan(0);
  });
});
