import React, { useState, useEffect, useRef } from 'react';
import { searchService, SearchResult, SearchOptions } from '../services/SearchService';
import './SearchPanel.css';

interface SearchPanelProps {
  onClose: () => void;
  onResultSelected: (result: SearchResult) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onClose, onResultSelected }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'files' | 'symbols' | 'content'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regex, setRegex] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the input when the panel opens
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const performSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      const options: SearchOptions = {
        query,
        caseSensitive,
        wholeWord,
        regex,
        maxResults: 100
      };

      let searchResults: SearchResult[] = [];
      
      switch (searchType) {
        case 'files':
          searchResults = await searchService.searchFiles(options);
          break;
        case 'symbols':
          searchResults = await searchService.searchSymbols(options);
          break;
        case 'content':
          searchResults = await searchService.searchContent(options);
          break;
        case 'all':
        default:
          searchResults = await searchService.searchAll(options);
          break;
      }
      
      setResults(searchResults);
      setActiveIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleResultClick(results[activeIndex]);
      } else {
        performSearch();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => 
        prev < results.length - 1 ? prev + 1 : 0
      );
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => 
        prev > 0 ? prev - 1 : results.length - 1
      );
      return;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultSelected(result);
    onClose();
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'file':
        return '📄';
      case 'symbol':
        return '🔍';
      case 'content':
        return '📝';
      default:
        return '📄';
    }
  };

  return (
    <div className="search-panel-overlay" onClick={onClose}>
      <div className="search-panel" onClick={e => e.stopPropagation()}>
        <div className="search-panel-header">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-container">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="search-input"
              />
              <button type="submit" className="search-button">
                {isLoading ? '⏳' : '🔍'}
              </button>
            </div>
          </form>
          
          <div className="search-options">
            <select 
              value={searchType} 
              onChange={e => setSearchType(e.target.value as any)}
              className="search-type-select"
            >
              <option value="all">All</option>
              <option value="files">Files</option>
              <option value="symbols">Symbols</option>
              <option value="content">Content</option>
            </select>
            
            <div className="search-toggle-options">
              <label className="search-toggle">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={e => setCaseSensitive(e.target.checked)}
                />
                <span className="toggle-label">Aa</span>
              </label>
              
              <label className="search-toggle">
                <input
                  type="checkbox"
                  checked={wholeWord}
                  onChange={e => setWholeWord(e.target.checked)}
                />
                <span className="toggle-label">" "</span>
              </label>
              
              <label className="search-toggle">
                <input
                  type="checkbox"
                  checked={regex}
                  onChange={e => setRegex(e.target.checked)}
                />
                <span className="toggle-label">.*</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="search-results-container">
          {results.length > 0 ? (
            <div ref={resultsRef} className="search-results">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className={`search-result ${index === activeIndex ? 'active' : ''}`}
                  onClick={() => handleResultClick(result)}
                >
                  <div className="result-icon">
                    {getIconForType(result.type)}
                  </div>
                  <div className="result-content">
                    <div className="result-name">{result.name}</div>
                    <div className="result-path">{result.path}</div>
                    {result.snippet && (
                      <div className="result-snippet">{result.snippet}</div>
                    )}
                  </div>
                  <div className="result-meta">
                    {result.line && (
                      <span className="result-line">Line {result.line}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="search-no-results">
              {isLoading ? 'Searching...' : 'No results found'}
            </div>
          )}
        </div>
        
        <div className="search-panel-footer">
          <div className="search-stats">
            {results.length > 0 && (
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="search-shortcuts">
            <span>↑↓ Navigate</span>
            <span>Enter Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;