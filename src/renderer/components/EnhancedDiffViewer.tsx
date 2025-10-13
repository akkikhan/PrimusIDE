import React, { useState, useEffect, useMemo } from 'react';
import { diffLines, Change } from 'diff';
import './EnhancedDiffViewer.css';

interface EnhancedDiffViewerProps {
  originalContent: string;
  modifiedContent: string;
  language?: string;
  fileName?: string;
  onApply?: () => void;
  onReject?: () => void;
}

export const EnhancedDiffViewer: React.FC<EnhancedDiffViewerProps> = ({
  originalContent,
  modifiedContent,
  language = 'typescript',
  fileName = 'Untitled',
  onApply,
  onReject
}) => {
  const [diffChanges, setDiffChanges] = useState<Change[]>([]);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [showWhitespace, setShowWhitespace] = useState(false);
  const [hunkIndex, setHunkIndex] = useState(0);

  useEffect(() => {
    const changes = diffLines(originalContent, modifiedContent);
    setDiffChanges(changes);
  }, [originalContent, modifiedContent]);

  const hunks = useMemo(() => {
    const result: Change[][] = [];
    let currentHunk: Change[] = [];
    
    diffChanges.forEach(change => {
      if (change.added || change.removed) {
        currentHunk.push(change);
      } else {
        if (currentHunk.length > 0) {
          result.push(currentHunk);
          currentHunk = [];
        }
      }
    });
    
    if (currentHunk.length > 0) {
      result.push(currentHunk);
    }
    
    return result;
  }, [diffChanges]);

  const handleApply = () => {
    if (onApply) {
      onApply();
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject();
    }
  };

  const nextHunk = () => {
    setHunkIndex(prev => Math.min(prev + 1, hunks.length - 1));
  };

  const prevHunk = () => {
    setHunkIndex(prev => Math.max(prev - 1, 0));
  };

  const renderUnifiedDiff = () => {
    let lineNumber = 1;
    
    return (
      <div className="diff-unified-view">
        {diffChanges.map((change, index) => {
          const lines = change.value.split('\n');
          
          if (change.added) {
            return lines.map((line, lineIndex) => (
              <div key={`${index}-${lineIndex}`} className="diff-line added">
                <span className="line-number"></span>
                <span className="line-content">{line}</span>
              </div>
            ));
          } else if (change.removed) {
            return lines.map((line, lineIndex) => (
              <div key={`${index}-${lineIndex}`} className="diff-line removed">
                <span className="line-number"></span>
                <span className="line-content">{line}</span>
              </div>
            ));
          } else {
            return lines.map((line, lineIndex) => {
              if (line === '') return null;
              const currentLineNumber = lineNumber++;
              return (
                <div key={`${index}-${lineIndex}`} className="diff-line unchanged">
                  <span className="line-number">{currentLineNumber}</span>
                  <span className="line-content">{line}</span>
                </div>
              );
            });
          }
        })}
      </div>
    );
  };

  const renderSplitDiff = () => {
    // For split view, we need to align the lines
    const alignedLines: { original?: string, modified?: string, type: 'added' | 'removed' | 'unchanged' | 'modified' }[] = [];
    
    let originalLines: string[] = [];
    let modifiedLines: string[] = [];
    
    diffChanges.forEach(change => {
      const lines = change.value.split('\n').filter(line => line !== '');
      
      if (change.removed) {
        lines.forEach(line => {
          alignedLines.push({ original: line, type: 'removed' });
        });
      } else if (change.added) {
        lines.forEach(line => {
          alignedLines.push({ modified: line, type: 'added' });
        });
      } else {
        lines.forEach(line => {
          alignedLines.push({ original: line, modified: line, type: 'unchanged' });
        });
      }
    });
    
    return (
      <div className="diff-split-view">
        <div className="diff-side original">
          <div className="diff-side-header">Original</div>
          {alignedLines.map((line, index) => {
            return (
              <div key={`original-${index}`} className={`diff-line ${line.type}`}>
                <span className="line-number">{index + 1}</span>
                <span className="line-content">{line.original || ''}</span>
              </div>
            );
          })}
        </div>
        
        <div className="diff-side modified">
          <div className="diff-side-header">Modified</div>
          {alignedLines.map((line, index) => {
            return (
              <div key={`modified-${index}`} className={`diff-line ${line.type}`}>
                <span className="line-number">{index + 1}</span>
                <span className="line-content">{line.modified || ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="enhanced-diff-viewer">
      <div className="diff-header">
        <div className="diff-title">
          <h3>{fileName}</h3>
          <span className="diff-stats">
            {diffChanges.filter(c => c.added).reduce((acc, c) => acc + (c.count || 0), 0)} additions, 
            {diffChanges.filter(c => c.removed).reduce((acc, c) => acc + (c.count || 0), 0)} deletions
          </span>
        </div>
        
        <div className="diff-controls">
          <button 
            className={viewMode === 'unified' ? 'active' : ''}
            onClick={() => setViewMode('unified')}
          >
            Unified View
          </button>
          <button 
            className={viewMode === 'split' ? 'active' : ''}
            onClick={() => setViewMode('split')}
          >
            Split View
          </button>
          
          <button 
            onClick={() => setShowWhitespace(!showWhitespace)}
            className={showWhitespace ? 'active' : ''}
          >
            Show Whitespace
          </button>
          
          <div className="hunk-navigation">
            <button onClick={prevHunk} disabled={hunkIndex === 0 || hunks.length === 0}>
              ↑ Previous Hunk
            </button>
            <span>{hunks.length > 0 ? hunkIndex + 1 : 0} of {hunks.length}</span>
            <button onClick={nextHunk} disabled={hunkIndex === hunks.length - 1 || hunks.length === 0}>
              ↓ Next Hunk
            </button>
          </div>
          
          <div className="diff-actions">
            <button className="btn-reject" onClick={handleReject}>
              Reject
            </button>
            <button className="btn-apply" onClick={handleApply}>
              Apply
            </button>
          </div>
        </div>
      </div>
      
      <div className="diff-content">
        {viewMode === 'unified' ? renderUnifiedDiff() : renderSplitDiff()}
      </div>
    </div>
  );
};

export default EnhancedDiffViewer;