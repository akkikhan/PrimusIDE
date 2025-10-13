import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SymbolInfo, SymbolKind } from './indexing/types';
import './styles/SymbolsPanel.css';
import { fuzzyMatch } from './commanding/fuzzy';

interface SymbolsPanelProps {
  isVisible: boolean;
  activeFilePath?: string; // Full path of the currently active file
  symbols?: SymbolInfo[];  // (Optional for now) externally provided symbols, else panel will accept empty until wired
  onSelectSymbol?: (symbol: SymbolInfo) => void; // Called when user clicks a symbol
  onClose?: () => void;
}

/**
 * SymbolsPanel (Outline) – Scaffold (Task 8.1)
 * Phase 1: Pure UI shell + basic local filtering (in-memory) without project index wiring.
 * Later tasks (8.3+) will supply actual symbol data from ProjectIndexer filtered to active file.
 */
export const SymbolsPanel: React.FC<SymbolsPanelProps> = ({
  isVisible,
  activeFilePath,
  symbols = [],
  onSelectSymbol,
  onClose
}) => {
  const [filter, setFilter] = useState('');

  // Performance instrumentation + filtering
  const PERF_THRESHOLD = 1000; // symbol count threshold to log timings
  const lastPerfLogRef = useRef<number>(0);

  const filtered = useMemo(() => {
    const total = symbols.length;
    const shouldTime = total >= PERF_THRESHOLD;
    let label: string | undefined;
    if (shouldTime) {
      label = `outline.filter(${total})`;
      // eslint-disable-next-line no-console
      
    }
    if (!filter.trim()) {
      if (shouldTime && label) {
        // eslint-disable-next-line no-console
        
      }
      return symbols;
    }
    const q = filter.trim();
    let result: any[];
    if (q.length <= 32) {
      const rs = fuzzyMatch(q, symbols, s => s.name);
      result = rs.map(r => ({ ...r.item, _highlights: r.matchedIndices } as any));
    } else {
      const lower = q.toLowerCase();
      result = symbols
        .filter(s => s.name.toLowerCase().includes(lower))
        .map(s => ({ ...s }));
    }
    if (shouldTime && label) {
      // eslint-disable-next-line no-console
      
    }
    return result;
  }, [filter, symbols]);

  // Log render cost for very large lists (debounced to avoid spam).
  useEffect(() => {
    const total = filtered.length;
    if (total < PERF_THRESHOLD) return;
    const now = Date.now();
    if (now - lastPerfLogRef.current < 750) return; // simple debounce
    lastPerfLogRef.current = now;
    const label = `outline.render(${total})`;
    // eslint-disable-next-line no-console
    
    requestAnimationFrame(() => {
      // Measure after paint using rAF double-hop
      requestAnimationFrame(() => {
        // eslint-disable-next-line no-console
        
      });
    });
  }, [filtered]);

  if (!isVisible) return null;

  return (
    <div className="symbols-panel" data-active-file={activeFilePath || ''}>
      <div className="symbols-header">
        <span className="symbols-title">Outline</span>
        <div className="symbols-actions">
          <input
            className="symbols-filter"
            placeholder="Filter symbols..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            aria-label="Filter symbols"
          />
          <button
            className="symbols-close-btn"
            onClick={onClose}
            aria-label="Close outline"
          >×</button>
        </div>
      </div>
      <div className="symbols-body">
        {symbols.length === 0 ? (
          <div className="symbols-empty">
            <div className="symbols-empty-icon">🧭</div>
            <h3>No symbols</h3>
            <p>{activeFilePath ? 'No parsable symbols found in this file.' : 'Open a file to view its symbols.'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="symbols-empty">
            <div className="symbols-empty-icon">🔍</div>
            <h3>No matches</h3>
            <p>Try a different filter.</p>
          </div>
        ) : (
          <ul className="symbols-list" data-count={filtered.length}>
            {filtered.map(sym => {
              const highlights: number[] | undefined = (sym as any)._highlights;
              return (
              <li
                key={`${sym.path}:${sym.position.start}:${sym.name}`}
                className={`symbol-item kind-${sym.kind}`}
                onClick={() => onSelectSymbol?.(sym)}
                title={`${sym.name} (${sym.kind})`}
              >
                <SymbolKindIcon kind={sym.kind} />
                <span className="symbol-name">
                  {highlights ? sym.name.split('').map((ch: string, idx: number) => (
                    <span key={idx} className={highlights.includes(idx) ? 'sym-hl' : undefined}>{ch}</span>
                  )) : sym.name}
                </span>
              </li>
            );})}
          </ul>
        )}
      </div>
    </div>
  );
};

// Lightweight icon mapping (placeholder). Can be replaced with richer icon set later.
const SymbolKindIcon: React.FC<{ kind: SymbolKind }> = ({ kind }) => {
  let glyph = '∴';
  switch (kind) {
    case SymbolKind.Class: glyph = '🅒'; break;
    case SymbolKind.Function: glyph = 'ƒ'; break;
    case SymbolKind.Interface: glyph = 'ⓘ'; break;
    case SymbolKind.Variable: glyph = '𝑥'; break;
    case SymbolKind.Enum: glyph = '∑'; break;
    default: glyph = '•';
  }
  return <span className="symbol-kind-icon" aria-hidden="true">{glyph}</span>;
};

export default SymbolsPanel;
