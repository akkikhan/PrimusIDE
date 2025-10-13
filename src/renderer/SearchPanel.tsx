import React, { useState, useEffect, useRef } from 'react';
import { SearchResult } from './types';

interface SearchPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  onOpenFile: (filePath: string, line?: number) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ isVisible, onToggle, onOpenFile }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showReplace, setShowReplace] = useState<boolean>(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [replaceHistory, setReplaceHistory] = useState<string[]>([]);
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [matchWholeWord, setMatchWholeWord] = useState<boolean>(false);
  const [useRegex, setUseRegex] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [isVisible]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      if (window.primus && window.primus.search) {
        const results = await window.primus.search.searchFiles(query, {
          matchCase,
          matchWholeWord,
          useRegex
        });
        setSearchResults(results);
        
        // Add to search history
        if (query && !searchHistory.includes(query)) {
          setSearchHistory(prev => [query, ...prev.slice(0, 9)]);
        }
      } else {
        // Fallback search - this would normally search through loaded files
        console.warn('Search API not available');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const performReplace = async (searchTerm: string, replaceTerm: string, replaceAll: boolean = false) => {
    try {
      if (window.primus && window.primus.search) {
        const results = await window.primus.search.replaceInFiles(searchTerm, replaceTerm, {
          matchCase,
          matchWholeWord,
          useRegex,
          replaceAll
        });
        
        // Add to replace history
        if (replaceTerm && !replaceHistory.includes(replaceTerm)) {
          setReplaceHistory(prev => [replaceTerm, ...prev.slice(0, 9)]);
        }
        
        // Refresh search results
        await performSearch(searchTerm);
        
        return results;
      }
    } catch (error) {
      console.error('Replace error:', error);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleReplaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performReplace(searchQuery, replaceQuery);
  };

  const handleReplaceAll = () => {
    performReplace(searchQuery, replaceQuery, true);
  };

  const handleResultClick = (result: SearchResult) => {
    onOpenFile(result.filePath, result.line);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const toggleOptions = () => {
    // Cycle through search options or show options panel
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="search-panel">
      <div className="search-header">
        <div className="search-title-bar">
          <span className="search-title">Search</span>
          <div className="search-controls">
            <button 
              className={`search-btn ${showReplace ? 'active' : ''}`}
              onClick={() => setShowReplace(!showReplace)}
              title="Toggle Replace"
            >
              ↔
            </button>
            <button className="search-btn" onClick={onToggle} title="Close Search">
              ×
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-container">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="search-options">
              <button
                type="button"
                className={`option-btn ${matchCase ? 'active' : ''}`}
                onClick={() => setMatchCase(!matchCase)}
                title="Match Case"
              >
                Aa
              </button>
              <button
                type="button"
                className={`option-btn ${matchWholeWord ? 'active' : ''}`}
                onClick={() => setMatchWholeWord(!matchWholeWord)}
                title="Match Whole Word"
              >
                Ab
              </button>
              <button
                type="button"
                className={`option-btn ${useRegex ? 'active' : ''}`}
                onClick={() => setUseRegex(!useRegex)}
                title="Use Regular Expression"
              >
                .*
              </button>
            </div>
          </div>
          
          {showReplace && (
            <div className="replace-container">
              <div className="replace-input-container">
                <input
                  type="text"
                  className="replace-input"
                  placeholder="Replace..."
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                />
                <div className="replace-actions">
                  <button type="button" className="replace-btn" onClick={handleReplaceSubmit}>
                    Replace
                  </button>
                  <button type="button" className="replace-all-btn" onClick={handleReplaceAll}>
                    Replace All
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="search-content">
        {isSearching ? (
          <div className="search-loading">
            <div className="loading-spinner"></div>
            <span>Searching...</span>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="search-results">
            <div className="results-header">
              <span className="results-count">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} in {new Set(searchResults.map(r => r.filePath)).size} file{new Set(searchResults.map(r => r.filePath)).size !== 1 ? 's' : ''}
              </span>
              <button className="clear-btn" onClick={clearSearch}>
                Clear
              </button>
            </div>
            
            <div className="results-list">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="search-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="result-header">
                    <span className="result-file">{result.fileName}</span>
                    <span className="result-location">
                      Line {result.line}, Col {result.column}
                    </span>
                  </div>
                  <div className="result-preview">
                    {result.preview}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : searchQuery ? (
          <div className="search-empty">
            <div className="empty-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try adjusting your search criteria or check the spelling.</p>
          </div>
        ) : (
          <div className="search-placeholder">
            <div className="placeholder-icon">🔍</div>
            <h3>Search across files</h3>
            <p>Enter a search term to find text across all files in your workspace.</p>
            
            {searchHistory.length > 0 && (
              <div className="search-history">
                <h4>Recent searches:</h4>
                <div className="history-list">
                  {searchHistory.slice(0, 5).map((term, index) => (
                    <button
                      key={index}
                      className="history-item"
                      onClick={() => {
                        setSearchQuery(term);
                        performSearch(term);
                      }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;
