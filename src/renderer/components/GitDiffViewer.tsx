import React, { useState, useEffect } from 'react';
import { logger } from '@shared/logger';

interface GitDiffViewerProps {
  filePath?: string;
  repoPath: string;
  isVisible: boolean;
  onClose: () => void;
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  lineNumber?: number;
}

export const GitDiffViewer: React.FC<GitDiffViewerProps> = ({
  filePath,
  repoPath,
  isVisible,
  onClose
}) => {
  const [diffContent, setDiffContent] = useState<DiffLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && repoPath) {
      loadDiff();
    }
  }, [isVisible, filePath, repoPath]);

  const loadDiff = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const diff = await window.primus.git.diff(repoPath, filePath);
      
      if (diff && diff.diff) {
        const lines = parseDiff(diff.diff);
        setDiffContent(lines);
      } else {
        setDiffContent([]);
        setError('No changes to display');
      }
    } catch (err) {
      logger.error('Failed to load diff', err);
      setError('Failed to load diff');
    } finally {
      setIsLoading(false);
    }
  };

  const parseDiff = (diffText: string): DiffLine[] => {
    const lines = diffText.split('\n');
    const parsed: DiffLine[] = [];
    let lineNumber = 0;

    lines.forEach(line => {
      if (line.startsWith('+++') || line.startsWith('---')) {
        parsed.push({ type: 'header', content: line });
      } else if (line.startsWith('@@')) {
        parsed.push({ type: 'header', content: line });
        // Extract line number from @@ -1,3 +1,5 @@ format
        const match = line.match(/\+(\d+)/);
        if (match) {
          lineNumber = parseInt(match[1], 10);
        }
      } else if (line.startsWith('+')) {
        parsed.push({ 
          type: 'add', 
          content: line.substring(1),
          lineNumber: lineNumber++
        });
      } else if (line.startsWith('-')) {
        parsed.push({ 
          type: 'remove', 
          content: line.substring(1)
        });
      } else {
        parsed.push({ 
          type: 'context', 
          content: line,
          lineNumber: lineNumber++
        });
      }
    });

    return parsed;
  };

  if (!isVisible) return null;

  return (
    <div className="git-diff-viewer">
      <div className="diff-header">
        <h3>
          {filePath ? `Changes in ${filePath.split('/').pop()}` : 'All Changes'}
        </h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="diff-content">
        {isLoading && (
          <div className="loading">Loading diff...</div>
        )}

        {error && (
          <div className="error">{error}</div>
        )}

        {!isLoading && !error && diffContent.length > 0 && (
          <div className="diff-lines">
            {diffContent.map((line, index) => (
              <div 
                key={index} 
                className={`diff-line ${line.type}`}
              >
                {line.lineNumber && (
                  <span className="line-number">{line.lineNumber}</span>
                )}
                <pre className="line-content">{line.content}</pre>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && diffContent.length === 0 && (
          <div className="no-changes">No changes to display</div>
        )}
      </div>
    </div>
  );
};

export default GitDiffViewer;