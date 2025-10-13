import React, { useState, useEffect, useRef } from 'react';
import { globalCommandRegistry, RegisteredCommand } from './commanding/CommandRegistry';
import { fuzzyMatch } from './commanding/fuzzy';

interface CommandPaletteProps { isVisible: boolean; onClose: () => void; }

const CommandPalette: React.FC<CommandPaletteProps> = ({ isVisible, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RegisteredCommand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recent, setRecent] = useState<RegisteredCommand[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to registry changes
  useEffect(() => {
    const unsubscribe = globalCommandRegistry.subscribe(() => {
      setRecent(globalCommandRegistry.getRecent());
      recompute(query);
    });
    setRecent(globalCommandRegistry.getRecent());
    recompute(query);
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isVisible]);

  const recompute = (q: string) => {
    const list = globalCommandRegistry.list();
    if (!q.trim()) {
      // show recent first + some commands
      const recentIds = new Set(recent.map(r => r.id));
      const remaining = list.filter(c => !recentIds.has(c.id)).slice(0, 30);
      setResults([...recent.slice(0, 10), ...remaining]);
      setSelectedIndex(0);
      return;
    }
    const scored = fuzzyMatch(
      q,
      list,
      c => `${c.title} ${c.category} ${c.description || ''} ${c.keybinding || ''}`,
      c => (c.keybinding && c.keybinding.toLowerCase().includes(q.toLowerCase()) ? 3 : 0)
    );
    setResults(scored.map(s => s.item));
    setSelectedIndex(0);
  };

  useEffect(() => { recompute(query); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < results.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : results.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          globalCommandRegistry.execute(results[selectedIndex].id);
          onClose();
        }
        break;
    }
  };

  const handleCommandClick = (command: RegisteredCommand) => {
    globalCommandRegistry.execute(command.id);
    onClose();
  };

  if (!isVisible) return null;

  const highlightText = (text?: string, q?: string) => {
    if (!text) return null;
    const queryLower = (q || '').trim().toLowerCase();
    if (!queryLower) return text;
    let i = 0;
    const parts: JSX.Element[] = [];
    const lower = text.toLowerCase();
    while (i < text.length) {
      const idx = queryLower[0] ? lower.indexOf(queryLower[0], i) : -1;
      if (idx === -1) {
        parts.push(<span key={i}>{text.slice(i)}</span>);
        break;
      }
      parts.push(<span key={i}>{text.slice(i, idx)}</span>);
      // attempt to match sequentially
      let matchLen = 0;
      for (let qj = 0, ti = idx; qj < queryLower.length && ti < lower.length; ti++) {
        if (lower[ti] === queryLower[qj]) {
          qj++; matchLen++;
        } else {
          break;
        }
      }
      if (matchLen === 0) { i = idx + 1; continue; }
      const matched = text.slice(idx, idx + matchLen);
      parts.push(<span className="hl" key={idx + '-hl'}>{matched}</span>);
      i = idx + matchLen;
    }
    return parts;
  };

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input">
          <span className="command-palette-icon">⚡</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="command-input"
          />
          <span className="command-palette-count">{results.length} results</span>
        </div>
        
        <div className="command-results">
          {!query && recent.length > 0 && (
            <div className="command-section-label">Recent</div>
          )}
          {results.length === 0 ? (
            <div className="no-results">
              <span className="no-results-icon">🔍</span>
              <p>No commands found</p>
            </div>
          ) : (
            results.map((command, index) => (
              <div
                key={command.id}
                className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleCommandClick(command)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="command-main">
                  <div className="command-title">{highlightText(command.title, query)}</div>
                  <div className="command-category">{command.category}</div>
                  {command.description && (
                    <div className="command-description">{highlightText(command.description, query)}</div>
                  )}
                </div>
                {command.keybinding && (
                  <div className="command-keybinding">{highlightText(command.keybinding, query)}</div>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="command-palette-footer">
          <div className="command-tip">
            <span className="key">↑↓</span> to navigate
            <span className="key">↵</span> to select
            <span className="key">esc</span> to dismiss
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
