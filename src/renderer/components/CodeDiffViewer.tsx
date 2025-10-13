import React, { useState, useEffect } from 'react';
import { CodeChange, CodeDiff, codeApplicationManager } from '../codeApplication/CodeApplicationManager';
import '../styles/CodeDiffViewer.css';

interface CodeDiffViewerProps {
  changeId: string;
  onApply?: (changeId: string) => void;
  onReject?: (changeId: string) => void;
  showActions?: boolean;
}

export const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({ 
  changeId, 
  onApply, 
  onReject,
  showActions = true 
}) => {
  const [change, setChange] = useState<CodeChange | null>(null);
  const [diff, setDiff] = useState<CodeDiff | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChangeData();
  }, [changeId]);

  const loadChangeData = async () => {
    try {
      setLoading(true);
      const previewData = await codeApplicationManager.previewChange(changeId);
      
      if (previewData) {
        setChange(previewData.change);
        setDiff(previewData.diff);
        setPreview(previewData.preview);
      }
    } catch (error) {
      console.error('Failed to load change data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (onApply && change) {
      onApply(change.id);
    }
  };

  const handleReject = () => {
    if (onReject && change) {
      onReject(change.id);
    }
  };

  const renderUnifiedDiff = () => {
    if (!diff || !change) return null;

    const originalLines = change.originalContent.split('\n');
    const modifiedLines = change.modifiedContent.split('\n');
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    return (
      <div className="diff-unified">
        {Array.from({ length: maxLines }, (_, i) => {
          const lineNum = i + 1;
          const originalLine = originalLines[i];
          const modifiedLine = modifiedLines[i];
          
          let lineType = 'unchanged';
          let content = originalLine || '';

          if (originalLine === undefined) {
            lineType = 'added';
            content = modifiedLine;
          } else if (modifiedLine === undefined) {
            lineType = 'removed';
            content = originalLine;
          } else if (originalLine !== modifiedLine) {
            lineType = 'modified';
            content = modifiedLine;
          }

          return (
            <div key={lineNum} className={`diff-line diff-line-${lineType}`}>
              <span className="line-number">{lineNum}</span>
              <span className="line-prefix">
                {lineType === 'added' ? '+' : lineType === 'removed' ? '-' : ' '}
              </span>
              <span className="line-content">{content}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSplitDiff = () => {
    if (!diff || !change) return null;

    const originalLines = change.originalContent.split('\n');
    const modifiedLines = change.modifiedContent.split('\n');
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    return (
      <div className="diff-split">
        <div className="diff-split-side diff-split-original">
          <div className="diff-split-header">Original</div>
          {Array.from({ length: maxLines }, (_, i) => {
            const lineNum = i + 1;
            const originalLine = originalLines[i];
            const modifiedLine = modifiedLines[i];
            
            let lineType = 'unchanged';
            if (originalLine === undefined) {
              lineType = 'added';
            } else if (modifiedLine === undefined) {
              lineType = 'removed';
            } else if (originalLine !== modifiedLine) {
              lineType = 'modified';
            }

            return (
              <div key={lineNum} className={`diff-line diff-line-${lineType}`}>
                <span className="line-number">{originalLine !== undefined ? lineNum : ''}</span>
                <span className="line-content">{originalLine || ''}</span>
              </div>
            );
          })}
        </div>
        
        <div className="diff-split-side diff-split-modified">
          <div className="diff-split-header">Modified</div>
          {Array.from({ length: maxLines }, (_, i) => {
            const lineNum = i + 1;
            const originalLine = originalLines[i];
            const modifiedLine = modifiedLines[i];
            
            let lineType = 'unchanged';
            if (originalLine === undefined) {
              lineType = 'added';
            } else if (modifiedLine === undefined) {
              lineType = 'removed';
            } else if (originalLine !== modifiedLine) {
              lineType = 'modified';
            }

            return (
              <div key={lineNum} className={`diff-line diff-line-${lineType}`}>
                <span className="line-number">{modifiedLine !== undefined ? lineNum : ''}</span>
                <span className="line-content">{modifiedLine || ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="diff-viewer-loading">
        <div className="loading-spinner"></div>
        <span>Loading diff...</span>
      </div>
    );
  }

  if (!change || !diff) {
    return (
      <div className="diff-viewer-error">
        <span>Failed to load change data</span>
      </div>
    );
  }

  return (
    <div className="code-diff-viewer">
      <div className="diff-header">
        <div className="diff-info">
          <h3>{change.description}</h3>
          <div className="diff-meta">
            <span className="change-type">{change.changeType.toUpperCase()}</span>
            <span className="file-path">{change.filePath}</span>
            <span className="line-range">Lines {change.lineStart}-{change.lineEnd}</span>
            {change.aiProvider && (
              <span className="ai-provider">via {change.aiProvider}</span>
            )}
            <span className="timestamp">
              {change.timestamp.toLocaleString()}
            </span>
          </div>
        </div>
        
        <div className="diff-controls">
          <div className="view-mode-toggle">
            <button 
              className={viewMode === 'unified' ? 'active' : ''}
              onClick={() => setViewMode('unified')}
            >
              Unified
            </button>
            <button 
              className={viewMode === 'split' ? 'active' : ''}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
          </div>
          
          {showActions && !change.applied && (
            <div className="diff-actions">
              <button className="btn-reject" onClick={handleReject}>
                Reject
              </button>
              <button className="btn-apply" onClick={handleApply}>
                Apply Change
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="diff-stats">
        <div className="stat">
          <span className="stat-label">Added:</span>
          <span className="stat-value added">{diff.additions.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Modified:</span>
          <span className="stat-value modified">{diff.modifications.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Deleted:</span>
          <span className="stat-value deleted">{diff.deletions.length}</span>
        </div>
      </div>

      <div className="diff-content">
        {viewMode === 'unified' ? renderUnifiedDiff() : renderSplitDiff()}
      </div>
    </div>
  );
};

export default CodeDiffViewer;
