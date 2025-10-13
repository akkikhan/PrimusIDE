import React, { useState, useEffect, useRef } from 'react';
import { SearchResult, AdvancedSearchOptions } from './AdvancedMonacoProvider';
import { advancedMonacoProvider } from './AdvancedMonacoProvider';
import './AdvancedSearchDialog.css';

interface AdvancedSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'search' | 'replace';
}

interface SearchState {
  query: string;
  replacement: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  isWholeWord: boolean;
  includeFiles: string;
  excludeFiles: string;
  maxResults: number;
  results: SearchResult[];
  isSearching: boolean;
  selectedResult: number;
  searchHistory: string[];
  replaceHistory: string[];
}

export const AdvancedSearchDialog: React.FC<AdvancedSearchDialogProps> = ({
  isOpen,
  onClose,
  mode
}) => {
  const [state, setState] = useState<SearchState>({
    query: '',
    replacement: '',
    isRegex: false,
    isCaseSensitive: false,
    isWholeWord: false,
    includeFiles: '',
    excludeFiles: 'node_modules,dist,build,.git',
    maxResults: 1000,
    results: [],
    isSearching: false,
    selectedResult: -1,
    searchHistory: JSON.parse(localStorage.getItem('searchHistory') || '[]'),
    replaceHistory: JSON.parse(localStorage.getItem('replaceHistory') || '[]')
  });

  const queryInputRef = useRef<HTMLInputElement>(null);
  const replacementInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && queryInputRef.current) {
      queryInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'Enter':
          if (e.ctrlKey || e.metaKey) {
            handleSearch();
          }
          break;
        case 'F3':
          e.preventDefault();
          navigateResult(e.shiftKey ? -1 : 1);
          break;
        case 'ArrowDown':
          if (e.ctrlKey) {
            e.preventDefault();
            navigateResult(1);
          }
          break;
        case 'ArrowUp':
          if (e.ctrlKey) {
            e.preventDefault();
            navigateResult(-1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, state.results.length, state.selectedResult]);

  const updateState = (updates: Partial<SearchState>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  };

  const handleSearch = async () => {
    if (!state.query.trim()) return;

    updateState({ isSearching: true, results: [], selectedResult: -1 });

    try {
      const options: AdvancedSearchOptions = {
        query: state.query,
        isRegex: state.isRegex,
        isCaseSensitive: state.isCaseSensitive,
        isWholeWord: state.isWholeWord,
        includeFiles: state.includeFiles.split(',').map(s => s.trim()).filter(Boolean),
        excludeFiles: state.excludeFiles.split(',').map(s => s.trim()).filter(Boolean),
        maxResults: state.maxResults
      };

      const results = await advancedMonacoProvider.performAdvancedSearch(options);
      
      updateState({ 
        results, 
        isSearching: false,
        selectedResult: results.length > 0 ? 0 : -1
      });

      // Update search history
      const newSearchHistory = [state.query, ...state.searchHistory.filter(q => q !== state.query)].slice(0, 20);
      localStorage.setItem('searchHistory', JSON.stringify(newSearchHistory));
      updateState({ searchHistory: newSearchHistory });

    } catch (error) {
      console.error('Search failed:', error);
      updateState({ isSearching: false });
    }
  };

  const handleReplace = async (replaceAll: boolean = false) => {
    if (!state.query.trim() || !state.replacement.trim()) return;

    try {
      if (replaceAll) {
        // Replace all occurrences
        await replaceAllOccurrences();
      } else {
        // Replace current selection or first result
        await replaceCurrentOccurrence();
      }

      // Update replace history
      const newReplaceHistory = [state.replacement, ...state.replaceHistory.filter(r => r !== state.replacement)].slice(0, 20);
      localStorage.setItem('replaceHistory', JSON.stringify(newReplaceHistory));
      updateState({ replaceHistory: newReplaceHistory });

      // Refresh search results
      await handleSearch();
    } catch (error) {
      console.error('Replace failed:', error);
    }
  };

  const replaceAllOccurrences = async () => {
    for (const result of state.results) {
      try {
        // Read file content
        const content = await window.electronAPI.fs.readFile(result.file);
        
        // Perform replacement
        let newContent: string;
        if (state.isRegex) {
          const regex = new RegExp(state.query, state.isCaseSensitive ? 'g' : 'gi');
          newContent = content.replace(regex, state.replacement);
        } else {
          const flags = state.isCaseSensitive ? 'g' : 'gi';
          const regex = new RegExp(state.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
          newContent = content.replace(regex, state.replacement);
        }
        
        // Write file back
        await window.electronAPI.fs.writeFile(result.file, newContent);
      } catch (error) {
        console.warn(`Failed to replace in ${result.file}:`, error);
      }
    }
  };

  const replaceCurrentOccurrence = async () => {
    if (state.selectedResult >= 0 && state.selectedResult < state.results.length) {
      const result = state.results[state.selectedResult];
      try {
        // Read file content
        const content = await window.electronAPI.fs.readFile(result.file);
        
        // Perform single replacement
        let newContent: string;
        if (state.isRegex) {
          const regex = new RegExp(state.query, state.isCaseSensitive ? '' : 'i');
          newContent = content.replace(regex, state.replacement);
        } else {
          const flags = state.isCaseSensitive ? '' : 'i';
          const regex = new RegExp(state.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
          newContent = content.replace(regex, state.replacement);
        }
        
        // Write file back
        await window.electronAPI.fs.writeFile(result.file, newContent);
      } catch (error) {
        console.warn(`Failed to replace in ${result.file}:`, error);
      }
    }
  };

  const navigateResult = (direction: number) => {
    if (state.results.length === 0) return;

    const newIndex = Math.max(0, Math.min(
      state.results.length - 1,
      state.selectedResult + direction
    ));

    updateState({ selectedResult: newIndex });

    // Scroll to selected result
    if (resultsContainerRef.current) {
      const resultElements = resultsContainerRef.current.querySelectorAll('.search-result-item');
      const selectedElement = resultElements[newIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const jumpToResult = (result: SearchResult, index: number) => {
    updateState({ selectedResult: index });
    // Emit event to open file and navigate to location
    const event = new CustomEvent('navigateToLocation', {
      detail: {
        file: result.file,
        line: result.line,
        column: result.column
      }
    });
    window.dispatchEvent(event);
  };

  const renderSearchOptions = () => (
    <div className="search-options">
      <div className="search-option-group">
        <label className="search-option">
          <input
            type="checkbox"
            checked={state.isCaseSensitive}
            onChange={(e) => updateState({ isCaseSensitive: e.target.checked })}
          />
          <span className="search-option-label">Match Case (Aa)</span>
        </label>
        
        <label className="search-option">
          <input
            type="checkbox"
            checked={state.isWholeWord}
            onChange={(e) => updateState({ isWholeWord: e.target.checked })}
          />
          <span className="search-option-label">Whole Word (ab)</span>
        </label>
        
        <label className="search-option">
          <input
            type="checkbox"
            checked={state.isRegex}
            onChange={(e) => updateState({ isRegex: e.target.checked })}
          />
          <span className="search-option-label">Regular Expression (.*)</span>
        </label>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="search-filters">
      <div className="filter-group">
        <label htmlFor="includeFiles">Include Files:</label>
        <input
          id="includeFiles"
          type="text"
          value={state.includeFiles}
          onChange={(e) => updateState({ includeFiles: e.target.value })}
          placeholder="*.js, *.ts, *.tsx (comma-separated)"
          className="filter-input"
        />
      </div>
      
      <div className="filter-group">
        <label htmlFor="excludeFiles">Exclude Files:</label>
        <input
          id="excludeFiles"
          type="text"
          value={state.excludeFiles}
          onChange={(e) => updateState({ excludeFiles: e.target.value })}
          placeholder="node_modules, dist, .git (comma-separated)"
          className="filter-input"
        />
      </div>
      
      <div className="filter-group">
        <label htmlFor="maxResults">Max Results:</label>
        <input
          id="maxResults"
          type="number"
          value={state.maxResults}
          onChange={(e) => updateState({ maxResults: parseInt(e.target.value) || 1000 })}
          min="1"
          max="10000"
          className="filter-input number-input"
        />
      </div>
    </div>
  );

  const renderSearchResults = () => (
    <div className="search-results" ref={resultsContainerRef}>
      <div className="results-header">
        <span className="results-count">
          {state.results.length} result{state.results.length !== 1 ? 's' : ''}
          {state.isSearching && ' (searching...)'}
        </span>
        {state.results.length > 0 && (
          <span className="results-navigation">
            Result {state.selectedResult + 1} of {state.results.length}
          </span>
        )}
      </div>
      
      <div className="results-list">
        {state.results.map((result, index) => (
          <div
            key={`${result.file}-${result.line}-${result.column}`}
            className={`search-result-item ${index === state.selectedResult ? 'selected' : ''}`}
            onClick={() => jumpToResult(result, index)}
          >
            <div className="result-file">
              <span className="file-path">{result.file}</span>
              <span className="result-location">:{result.line}:{result.column}</span>
            </div>
            <div className="result-preview">
              <span className="line-number">{result.line}</span>
              <span className="preview-text">{result.preview}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHistoryDropdown = (type: 'search' | 'replace') => {
    const history = type === 'search' ? state.searchHistory : state.replaceHistory;
    
    if (history.length === 0) return null;

    return (
      <div className="history-dropdown">
        {history.map((item, index) => (
          <div
            key={index}
            className="history-item"
            onClick={() => {
              if (type === 'search') {
                updateState({ query: item });
                queryInputRef.current?.focus();
              } else {
                updateState({ replacement: item });
                replacementInputRef.current?.focus();
              }
            }}
          >
            {item}
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="advanced-search-overlay">
      <div className="advanced-search-dialog">
        <div className="dialog-header">
          <h3>{mode === 'search' ? 'Advanced Search' : 'Advanced Search & Replace'}</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="dialog-content">
          <div className="search-inputs">
            <div className="input-group">
              <label htmlFor="searchQuery">Search for:</label>
              <div className="input-with-history">
                <input
                  id="searchQuery"
                  ref={queryInputRef}
                  type="text"
                  value={state.query}
                  onChange={(e) => updateState({ query: e.target.value })}
                  placeholder="Enter search query"
                  className="search-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.ctrlKey) {
                      handleSearch();
                    }
                  }}
                />
                <button 
                  className="history-toggle"
                  title="Search history"
                  onClick={() => {
                    const dropdown = document.querySelector('.search-history-dropdown') as HTMLElement;
                    if (dropdown) {
                      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                    }
                  }}
                >
                  ↓
                </button>
                <div className="search-history-dropdown">
                  {renderHistoryDropdown('search')}
                </div>
              </div>
            </div>

            {mode === 'replace' && (
              <div className="input-group">
                <label htmlFor="replaceQuery">Replace with:</label>
                <div className="input-with-history">
                  <input
                    id="replaceQuery"
                    ref={replacementInputRef}
                    type="text"
                    value={state.replacement}
                    onChange={(e) => updateState({ replacement: e.target.value })}
                    placeholder="Enter replacement text"
                    className="search-input"
                  />
                  <button 
                    className="history-toggle"
                    title="Replace history"
                    onClick={() => {
                      const dropdown = document.querySelector('.replace-history-dropdown') as HTMLElement;
                      if (dropdown) {
                        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                      }
                    }}
                  >
                    ↓
                  </button>
                  <div className="replace-history-dropdown">
                    {renderHistoryDropdown('replace')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {renderSearchOptions()}
          {renderFilters()}

          <div className="dialog-actions">
            <button
              className="search-button primary"
              onClick={handleSearch}
              disabled={!state.query.trim() || state.isSearching}
            >
              {state.isSearching ? 'Searching...' : 'Search'}
            </button>

            {mode === 'replace' && (
              <>
                <button
                  className="replace-button"
                  onClick={() => handleReplace(false)}
                  disabled={!state.query.trim() || !state.replacement.trim() || state.results.length === 0}
                >
                  Replace
                </button>
                <button
                  className="replace-all-button"
                  onClick={() => handleReplace(true)}
                  disabled={!state.query.trim() || !state.replacement.trim() || state.results.length === 0}
                >
                  Replace All ({state.results.length})
                </button>
              </>
            )}

            <button className="navigation-button" onClick={() => navigateResult(-1)} disabled={state.results.length === 0}>
              Previous (F3+Shift)
            </button>
            <button className="navigation-button" onClick={() => navigateResult(1)} disabled={state.results.length === 0}>
              Next (F3)
            </button>
          </div>

          {renderSearchResults()}
        </div>

        <div className="dialog-footer">
          <div className="shortcuts-hint">
            <span><kbd>Ctrl+Enter</kbd> Search</span>
            <span><kbd>F3</kbd> Next</span>
            <span><kbd>Shift+F3</kbd> Previous</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchDialog;
