import React, { useEffect, useRef, useState } from 'react';
import { ProjectIndexer } from './indexing/ProjectIndexer';
import { fuzzyMatch } from './commanding/fuzzy';

interface QuickOpenProps {
  isVisible: boolean;
  onClose: () => void;
  onOpenFile: (path: string) => void;
}

interface FlatFile { path: string; name: string; }

function flatten(node: any, acc: FlatFile[]) {
  if (!node) return acc;
  if (node.isDirectory && node.children) {
    node.children.forEach((c: any) => flatten(c, acc));
  } else if (!node.isDirectory) {
    acc.push({ path: node.path, name: node.name });
  }
  return acc;
}

export const QuickOpen: React.FC<QuickOpenProps> = ({ isVisible, onClose, onOpenFile }) => {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<FlatFile[]>([]);
  const [results, setResults] = useState<FlatFile[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible) {
      setQuery('');
      setSelected(0);
      if (inputRef.current) inputRef.current.focus();
      const idx = ProjectIndexer.getInstance().getIndex();
      if (idx?.fileTree) {
        const flat: FlatFile[] = flatten(idx.fileTree, []);
        setFiles(flat);
        setResults(flat.slice(0, 50));
      }
    }
  }, [isVisible]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(files.slice(0, 50));
    } else {
      const r = fuzzyMatch(query, files, f => f.name + ' ' + f.path);
      setResults(r.map(x => x.item));
    }
    setSelected(0);
  }, [query, files]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(p => p < results.length - 1 ? p + 1 : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(p => p > 0 ? p - 1 : results.length - 1); }
    else if (e.key === 'Enter' && results[selected]) { onOpen(results[selected]); }
  };

  const onOpen = (file: FlatFile) => {
    onOpenFile(file.path);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input">
          <span className="command-palette-icon">📂</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Quick Open: type to filter files..."
            className="command-input"
          />
          <span className="command-palette-count">{results.length}</span>
        </div>
        <div className="command-results">
          {results.map((f, i) => (
            <div
              key={f.path}
              className={`command-item ${i === selected ? 'selected' : ''}`}
              onClick={() => onOpen(f)}
              onMouseEnter={() => setSelected(i)}
            >
              <div className="command-main">
                <div className="command-title">{f.name}</div>
                <div className="command-category">{f.path.replace(/.*[\\/](?=[^\\/]+$)/, '')}</div>
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <div className="no-results"><p>No files</p></div>
          )}
        </div>
        <div className="command-palette-footer">
          <div className="command-tip"><span className="key">↑↓</span> navigate <span className="key">↵</span> open <span className="key">esc</span> close</div>
        </div>
      </div>
    </div>
  );
};
