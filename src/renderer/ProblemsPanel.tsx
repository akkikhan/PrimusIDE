import React, { useState, useMemo } from 'react';
import './styles/ProblemsPanel.css';
import { Problem, ProblemSeverity } from './diagnostics/types';
import SeverityIcon from './components/SeverityIcon';

interface ProblemsPanelProps {
  isVisible: boolean;
  problems: Problem[];
  enabled: boolean;
  onToggleEnabled?: (next: boolean) => void;
  onSelectProblem?: (p: Problem) => void;
  onClose?: () => void;
}

/**
 * ProblemsPanel (Scaffold 9.1)
 * - Basic layout & empty states
 * - Will later support grouping, filtering, severity toggles, perf batching
 */
export const ProblemsPanel: React.FC<ProblemsPanelProps> = ({
  isVisible,
  problems,
  enabled,
  onToggleEnabled,
  onSelectProblem,
  onClose
}) => {
  const [filter, setFilter] = useState('');
  const [sevFilter, setSevFilter] = useState<Record<ProblemSeverity, boolean>>({
    [ProblemSeverity.Error]: true,
    [ProblemSeverity.Warning]: true,
    [ProblemSeverity.Info]: true,
    [ProblemSeverity.Hint]: true
  });
  const toggleSeverity = (sev: ProblemSeverity) => setSevFilter(f => ({ ...f, [sev]: !f[sev] }));
  if (!isVisible) return null;

  const rawCount = problems.length;
  let filterStart: number | undefined;
  if (rawCount >= 500) {
    filterStart = performance.now();
  }
  const filtered = problems.filter(p => {
    if (!sevFilter[p.severity]) return false;
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return p.message.toLowerCase().includes(q) || p.filePath.toLowerCase().includes(q);
  });
  if (filterStart) {
    const dur = performance.now() - filterStart;
    console.log(`[Problems] Filtered ${rawCount} -> ${filtered.length} in ${dur.toFixed(1)}ms`);
  }

  // Group by file path (simple map) & stable sort by severity then line
  const grouped = useMemo(() => {
    let groupStart: number | undefined;
    if (filtered.length >= 500) groupStart = performance.now();
    const severityRank: Record<string, number> = {
      error: 0,
      warning: 1,
      info: 2,
      hint: 3
    };
    const map = new Map<string, Problem[]>();
    for (const p of filtered) {
      if (!map.has(p.filePath)) map.set(p.filePath, []);
      map.get(p.filePath)!.push(p);
    }
    const entries = Array.from(map.entries()).map(([file, list]) => {
      const sorted = list.slice().sort((a, b) => {
        const sr = severityRank[a.severity] - severityRank[b.severity];
        if (sr !== 0) return sr;
        if (a.startLine !== b.startLine) return a.startLine - b.startLine;
        return a.startColumn - b.startColumn;
      });
      return { file, problems: sorted };
    });
    // Sort groups by highest severity present then file name
    entries.sort((a,b) => {
      const topA = Math.min(...a.problems.map(p => severityRank[p.severity]));
      const topB = Math.min(...b.problems.map(p => severityRank[p.severity]));
      if (topA !== topB) return topA - topB;
      return a.file.localeCompare(b.file);
    });
    if (groupStart) {
      const dur = performance.now() - groupStart;
      console.log(`[Problems] Grouped ${filtered.length} problems into ${entries.length} files in ${dur.toFixed(1)}ms`);
    }
    if (filtered.length >= 2000) {
      console.log('[Problems] Large problem set detected (>=2000). Consider virtualization. (Planned feature)');
    }
    return entries;
  }, [filtered]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (file: string) => setCollapsed(c => ({ ...c, [file]: !c[file] }));

  if (!enabled) {
    return (
      <div className="problems-panel">
        <div className="problems-header">
          <span className="problems-title">Problems</span>
          <div className="problems-actions">
            <button
              className="problems-enable-btn"
              onClick={() => onToggleEnabled?.(true)}
            >Enable</button>
            <button className="problems-close-btn" onClick={onClose} aria-label="Close problems">×</button>
          </div>
        </div>
        <div className="problems-body">
          <div className="problems-empty">
            <div className="problems-empty-icon">⏸️</div>
            <h3>Problems Disabled</h3>
            <p>Diagnostics collection is turned off.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="problems-panel">
      <div className="problems-header">
        <span className="problems-title">Problems</span>
        <div className="problems-actions">
          <div className="severity-toggles" aria-label="Severity filters">
            <button
              className={`sev-toggle ${sevFilter[ProblemSeverity.Error] ? 'active' : 'inactive'}`}
              onClick={() => toggleSeverity(ProblemSeverity.Error)}
              title={sevFilter[ProblemSeverity.Error] ? 'Hide errors' : 'Show errors'}
              aria-pressed={!!sevFilter[ProblemSeverity.Error]}
            >⛔</button>
            <button
              className={`sev-toggle ${sevFilter[ProblemSeverity.Warning] ? 'active' : 'inactive'}`}
              onClick={() => toggleSeverity(ProblemSeverity.Warning)}
              title={sevFilter[ProblemSeverity.Warning] ? 'Hide warnings' : 'Show warnings'}
              aria-pressed={!!sevFilter[ProblemSeverity.Warning]}
            >⚠️</button>
            <button
              className={`sev-toggle ${sevFilter[ProblemSeverity.Info] ? 'active' : 'inactive'}`}
              onClick={() => toggleSeverity(ProblemSeverity.Info)}
              title={sevFilter[ProblemSeverity.Info] ? 'Hide info' : 'Show info'}
              aria-pressed={!!sevFilter[ProblemSeverity.Info]}
            >ℹ️</button>
            <button
              className={`sev-toggle ${sevFilter[ProblemSeverity.Hint] ? 'active' : 'inactive'}`}
              onClick={() => toggleSeverity(ProblemSeverity.Hint)}
              title={sevFilter[ProblemSeverity.Hint] ? 'Hide hints' : 'Show hints'}
              aria-pressed={!!sevFilter[ProblemSeverity.Hint]}
            >💡</button>
          </div>
          <button
            className="problems-disable-btn"
            onClick={() => onToggleEnabled?.(false)}
            title="Disable diagnostics collection"
          >Disable</button>
          <input
            className="problems-filter"
            placeholder="Filter..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            aria-label="Filter problems"
          />
          <button className="problems-close-btn" onClick={onClose} aria-label="Close problems">×</button>
        </div>
      </div>
      <div className="problems-body">
        {problems.length === 0 ? (
          <div className="problems-empty">
            <div className="problems-empty-icon">✅</div>
            <h3>No problems</h3>
            <p>No diagnostics reported.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="problems-empty">
            <div className="problems-empty-icon">🔍</div>
            <h3>No matches</h3>
            <p>Try a different filter.</p>
          </div>
        ) : (
          <div className="problems-groups">
            {grouped.map(group => {
              const fileShort = shortFile(group.file);
              const isCollapsed = collapsed[group.file];
              const errorCount = group.problems.filter(p => p.severity === ProblemSeverity.Error).length;
              const warningCount = group.problems.filter(p => p.severity === ProblemSeverity.Warning).length;
              return (
                <div key={group.file} className="problems-group">
                  <div className="problems-group-header" onClick={() => toggleGroup(group.file)} title={group.file}>
                    <span className="chevron">{isCollapsed ? '▶' : '▼'}</span>
                    <span className="file-name">{fileShort}</span>
                    <span className="group-counts">
                      {errorCount > 0 && <span className="count error" title={`${errorCount} errors`}>⛔ {errorCount}</span>}
                      {warningCount > 0 && <span className="count warning" title={`${warningCount} warnings`}>⚠️ {warningCount}</span>}
                      <span className="count total" title={`${group.problems.length} total`}>{group.problems.length}</span>
                    </span>
                  </div>
                  {!isCollapsed && (
                    <ul className="problems-list grouped">
                      {group.problems.map(p => (
                        <li key={p.id} className={`problem-item sev-${p.severity}`} onClick={() => onSelectProblem?.(p)} title={p.message}>
                          <SeverityIcon severity={p.severity} />
                          <span className="problem-msg">{p.message}</span>
                          <span className="problem-meta">{p.startLine}:{p.startColumn}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function shortFile(path: string) {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export default ProblemsPanel;
