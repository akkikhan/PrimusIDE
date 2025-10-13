import React, { useState, useEffect } from 'react';
import { gitService, GitStatus } from './services/GitService';
import { logger } from '../shared/logger';
import GitActionButtons from './components/GitActionButtons';
import GitBranchManager from './components/GitBranchManager';
import GitDiffViewer from './components/GitDiffViewer';

interface SimpleGitPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  rootPath?: string;
}

export const SimpleGitPanel: React.FC<SimpleGitPanelProps> = ({ 
  isVisible, 
  onToggle,
  rootPath 
}) => {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Initialize git when panel opens or root path changes
  useEffect(() => {
    if (isVisible && rootPath) {
      initializeGit();
    }
  }, [isVisible, rootPath]);

  // Refresh status periodically when visible
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      refreshStatus();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [isVisible, refreshKey]);

  const initializeGit = async () => {
    if (!rootPath) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const initialized = await gitService.initialize(rootPath);
      if (initialized) {
        await refreshStatus();
        await loadBranches();
      } else {
        setError('Failed to initialize Git repository');
      }
    } catch (err) {
      setError('Git initialization error');
      logger.error('Git init error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStatus = async () => {
    try {
      const newStatus = await gitService.getStatus();
      setStatus(newStatus);
    } catch (err) {
      logger.error('Failed to refresh git status', err);
    }
  };

  const loadBranches = async () => {
    try {
      const branchList = await gitService.getBranches();
      setBranches(branchList);
    } catch (err) {
      logger.error('Failed to load branches', err);
    }
  };

  const handleStageFile = async (file: string) => {
    setIsLoading(true);
    try {
      await gitService.stage([file]);
      await refreshStatus();
    } catch (err) {
      setError('Failed to stage file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstageFile = async (file: string) => {
    setIsLoading(true);
    try {
      await gitService.unstage([file]);
      await refreshStatus();
    } catch (err) {
      setError('Failed to unstage file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStageAll = async () => {
    if (!status?.unstaged.length) return;
    
    setIsLoading(true);
    try {
      await gitService.stage(status.unstaged);
      await refreshStatus();
    } catch (err) {
      setError('Failed to stage all files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || !status?.staged.length) return;
    
    setIsLoading(true);
    try {
      const success = await gitService.commit(commitMessage);
      if (success) {
        setCommitMessage('');
        await refreshStatus();
      } else {
        setError('Failed to create commit');
      }
    } catch (err) {
      setError('Commit failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    setIsLoading(true);
    try {
      await gitService.push();
      await refreshStatus();
      setError(null);
    } catch (err) {
      setError('Failed to push to remote');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    setIsLoading(true);
    try {
      await gitService.pull();
      await refreshStatus();
      setError(null);
    } catch (err) {
      setError('Failed to pull from remote');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBranchChange = async (branch: string) => {
    setIsLoading(true);
    try {
      await gitService.checkout(branch);
      await refreshStatus();
    } catch (err) {
      setError(`Failed to checkout branch: ${branch}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="git-panel">
      <div className="git-panel-header">
        <h3>Git</h3>
        <button className="panel-close" onClick={onToggle}>×</button>
      </div>
      
      {error && (
        <div className="git-error">
          ⚠️ {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <div className="git-content">
        {isLoading && <div className="loading-indicator">Loading...</div>}
        
        {status && (
          <>
            <div className="branch-section">
              <div className="branch-info">
                <strong>Branch:</strong>
                <select 
                  value={status.branch} 
                  onChange={(e) => handleBranchChange(e.target.value)}
                  disabled={isLoading}
                >
                  {branches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
                {status.ahead > 0 && <span className="ahead">↑{status.ahead}</span>}
                {status.behind > 0 && <span className="behind">↓{status.behind}</span>}
              </div>
              
              <div className="branch-actions">
                <button onClick={handlePull} disabled={isLoading}>
                  ↓ Pull
                </button>
                <button onClick={handlePush} disabled={isLoading || !status.ahead}>
                  ↑ Push
                </button>
                <button onClick={() => setRefreshKey(k => k + 1)} disabled={isLoading}>
                  🔄 Refresh
                </button>
              </div>
            </div>
            
            <div className="files-section">
              {status.unstaged.length > 0 && (
                <div className="unstaged-files">
                  <div className="section-header">
                    <h5>Changes ({status.unstaged.length})</h5>
                    <button onClick={handleStageAll} disabled={isLoading}>
                      Stage All
                    </button>
                  </div>
                  {status.unstaged.map((file, index) => (
                    <div key={index} className="file-item">
                      <span>📝 {file}</span>
                      <button onClick={() => handleStageFile(file)} disabled={isLoading}>
                        +
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {status.staged.length > 0 && (
                <div className="staged-files">
                  <h5>Staged ({status.staged.length})</h5>
                  {status.staged.map((file, index) => (
                    <div key={index} className="file-item staged">
                      <span>✅ {file}</span>
                      <button onClick={() => handleUnstageFile(file)} disabled={isLoading}>
                        -
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {status.untracked.length > 0 && (
                <div className="untracked-files">
                  <h5>Untracked ({status.untracked.length})</h5>
                  {status.untracked.map((file, index) => (
                    <div key={index} className="file-item untracked">
                      <span>❓ {file}</span>
                      <button onClick={() => handleStageFile(file)} disabled={isLoading}>
                        +
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="commit-section">
              <textarea
                placeholder="Commit message..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                rows={3}
                disabled={isLoading}
              />
              <button 
                onClick={handleCommit}
                disabled={!commitMessage.trim() || !status.staged.length || isLoading}
                className="commit-button"
              >
                Commit ({status.staged.length} files)
              </button>
            </div>
          </>
        )}
        
        {!status && !isLoading && !error && (
          <div className="no-repo">
            <p>No Git repository detected</p>
            <button onClick={initializeGit}>Initialize Repository</button>
          </div>
        )}
      </div>
    </div>
  );
};