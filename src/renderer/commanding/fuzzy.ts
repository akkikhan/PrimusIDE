export interface FuzzyResult<T> { item: T; score: number; highlights: number[]; matchedIndices?: number[]; }

// Scoring heuristics: lower is better.
// We boost contiguous matches, start-of-word, and earlier matches.
export function fuzzyMatch<T>(query: string, items: T[], accessor: (i: T) => string, extraWeight?: (i: T) => number): FuzzyResult<T>[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, 100).map(i => ({ item: i, score: Number.MAX_SAFE_INTEGER, highlights: [] }));
  const results: FuzzyResult<T>[] = [];
  for (const item of items) {
    const text = accessor(item);
    const lower = text.toLowerCase();
    let qi = 0;
    let lastMatch = -1;
    let contiguous = 0;
    let score = 0;
    const highlights: number[] = [];
    for (let ti = 0; ti < lower.length && qi < q.length; ti++) {
      if (lower[ti] === q[qi]) {
        // Base match cost: distance from previous
        if (lastMatch >= 0) {
          const gap = ti - lastMatch - 1;
          score += gap * 2; // penalize gaps
          if (gap === 0) {
            contiguous++;
            score -= 1; // reward contiguous
          } else {
            contiguous = 0;
          }
        } else {
          // first match reward if at beginning or after separator
          if (ti === 0 || /[-_\sA-Z]/.test(text[ti - 1])) score -= 2;
        }
        lastMatch = ti;
        highlights.push(ti);
        qi++;
      }
    }
    if (qi === q.length) {
      // matched all query chars
      // shorter strings get slight bonus
      score += (lower.length - q.length) * 0.1;
      if (extraWeight) {
        score -= extraWeight(item); // higher weight => better (lower score)
      }
      results.push({ item, score, highlights, matchedIndices: highlights });
    }
  }
  return results.sort((a, b) => a.score - b.score).slice(0, 50);
}
