// JS runtime version of grouping utilities for simple node-based tests without TS loader hassles.
export const ProblemSeverity = {
  Error: 'error',
  Warning: 'warning',
  Info: 'info',
  Hint: 'hint'
};

const severityRank = {
  [ProblemSeverity.Error]: 0,
  [ProblemSeverity.Warning]: 1,
  [ProblemSeverity.Info]: 2,
  [ProblemSeverity.Hint]: 3
};

export function groupAndSortProblems(list) {
  const map = new Map();
  for (const p of list) {
    if (!map.has(p.filePath)) map.set(p.filePath, []);
    map.get(p.filePath).push(p);
  }
  const groups = Array.from(map.entries()).map(([file, probs]) => ({
    file,
    problems: probs.slice().sort((a,b) => {
      const sr = severityRank[a.severity] - severityRank[b.severity];
      if (sr !== 0) return sr;
      if (a.startLine !== b.startLine) return a.startLine - b.startLine;
      return a.startColumn - b.startColumn;
    })
  }));
  groups.sort((a,b) => {
    const topA = Math.min(...a.problems.map(p => severityRank[p.severity]));
    const topB = Math.min(...b.problems.map(p => severityRank[p.severity]));
    if (topA !== topB) return topA - topB;
    return a.file.localeCompare(b.file);
  });
  return groups;
}

export function summarizeCounts(list){
  let errors=0, warnings=0, info=0, hints=0;
  for (const p of list) {
    switch (p.severity) {
      case ProblemSeverity.Error: errors++; break;
      case ProblemSeverity.Warning: warnings++; break;
      case ProblemSeverity.Info: info++; break;
      case ProblemSeverity.Hint: hints++; break;
    }
  }
  return { errors, warnings, info, hints, total: list.length };
}
