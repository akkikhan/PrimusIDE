// Git Integration - Complete Working Implementation
import React, { useState, useEffect } from 'react';
import simpleGit, { SimpleGit, StatusResult, DiffResult } from 'simple-git';
import '../styles/GitPanel.css';

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  files: GitFile[];
  staged: GitFile[];
  modified: GitFile[];
  untracked: GitFile[];
}

interface GitFile {
  path: string;
  status: 'M' | 'A' | 'D' | 'U' | '?';
  staged: boolean;
}

export const GitPanel: React.FC<{ 
  isVisible: boolean;
  projectPath: string;
  onToggle: () => void;
}> = ({ isVisible, projectPath, onToggle }) => {
  const [git, setGit] = useState<SimpleGit | null>(null);
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  // Initialize git
  useEffect(() => {
    if (projectPath && isVisible) {
      try {
        const gitInstance = simpleGit(projectPath);
        setGit(gitInstance);
        refreshStatus();
      } catch (err: any) {
        setError(`Failed to initialize git: ${err.message}`);
      }
    }
  }, [projectPath, isVisible]);
  
  // Refresh git status
  const refreshStatus = async () => {
    if (!git) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const statusResult = await git.status();
      
      const gitStatus: GitStatus = {
        branch: statusResult.current || 'master',
        ahead: statusResult.ahead,
        behind: statusResult.behind,
        files: statusResult.files.map(f => ({
          path: f.path,
          status: f.working_dir as any || 'M',
          staged: f.index !== ' '
        })),
        staged: statusResult.staged.map(path => ({
          path,
          status: 'M' as const,
          staged: true
        })),
        modified: statusResult.modified.map(path => ({
          path,
          status: 'M' as const,
          staged: false
        })),
        untracked: statusResult.not_added.map(path => ({
          path,
          status: '?' as const,
          staged: false
        }))
      };
      
      setStatus(gitStatus);
    } catch (err: any) {
      setError(`Failed to get status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Stage files
  const stageFiles = async (files: string[]) => {
    if (!git) return;
    
    try {
      await git.add(files);
      await refreshStatus();
    } catch (err: any) {
      setError(`Failed to stage files: ${err.message}`);
    }
  };
  
  // Unstage files
  const unstageFiles = async (files: string[]) => {
    if (!git) return;
    
    try {
      await git.reset(files);
      await refreshStatus();
    } catch (err: any) {
      setError(`Failed to unstage files: ${err.message}`);
    }
  };
  
  // Commit changes
  const commit = async () => {
    if (!git || !commitMessage.trim()) {
      setError('Please enter a commit message');
      return;
    }
    
    try {
      await git.commit(commitMessage);
      setCommitMessage('');
      await refreshStatus();
    } catch (err: any) {
      setError(`Failed to commit: ${err.message}`);
    }
  };
  
  // Push changes
  const push = async () => {
    if (!git) return;
    
    setLoading(true);
    try {
      await git.push();
      await refreshStatus();
    } catch (err: any) {
      setError(`Failed to push: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Pull changes
  const pull = async () => {
    if (!git) return;
    
    setLoading(true);
    try {
      await git.pull();
      await refreshStatus();
    } catch (err: any) {
      setError(`Failed to pull: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle file selection
  const toggleFileSelection = (path: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    setSelectedFiles(newSelection);
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="git-panel">
      <div className="git-panel-header">
        <h3>Git</h3>
        <button className="git-panel-close" onClick={onToggle}>×</button>
      </div>
      
      <div className="git-panel-content">
        {error && (
          <div className="git-error">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
        
        {status && (
          <>
            <div className="git-branch">
              <span className="git-branch-icon">🌿</span>
              <span className="git-branch-name">{status.branch}</span>
              {status.ahead > 0 && (
                <span className="git-ahead">↑{status.ahead}</span>
              )}
              {status.behind > 0 && (
                <span className="git-behind">↓{status.behind}</span>
              )}
              <button className="git-refresh" onClick={refreshStatus}>
                🔄
              </button>
            </div>
            
            <div className="git-actions">
              <button 
                className="git-btn git-btn-primary"
                onClick={pull}
                disabled={loading}
              >
                Pull
              </button>
              <button 
                className="git-btn git-btn-primary"
                onClick={push}
                disabled={loading || status.ahead === 0}
              >
                Push
              </button>
            </div>
            
            <div className="git-commit-area">
              <textarea
                className="git-commit-message"
                placeholder="Commit message..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
              />
              <button 
                className="git-btn git-btn-success"
                onClick={commit}
                disabled={!commitMessage.trim() || status.staged.length === 0}
              >
                Commit
              </button>
            </div>
            
            <div className="git-files">
              <h4>Changes</h4>
              
              {status.staged.length > 0 && (
                <div className="git-file-group">
                  <h5>Staged</h5>
                  {status.staged.map(file => (
                    <div key={file.path} className="git-file git-file-staged">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.path)}
                        onChange={() => toggleFileSelection(file.path)}
                      />
                      <span className="git-file-status">M</span>
                      <span className="git-file-path">{file.path}</span>
                      <button
                        className="git-file-action"
                        onClick={() => unstageFiles([file.path])}
                      >
                        Unstage
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {status.modified.length > 0 && (
                <div className="git-file-group">
                  <h5>Modified</h5>
                  {status.modified.map(file => (
                    <div key={file.path} className="git-file git-file-modified">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.path)}
                        onChange={() => toggleFileSelection(file.path)}
                      />
                      <span className="git-file-status">M</span>
                      <span className="git-file-path">{file.path}</span>
                      <button
                        className="git-file-action"
                        onClick={() => stageFiles([file.path])}
                      >
                        Stage
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {status.untracked.length > 0 && (
                <div className="git-file-group">
                  <h5>Untracked</h5>
                  {status.untracked.map(file => (
                    <div key={file.path} className="git-file git-file-untracked">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.path)}
                        onChange={() => toggleFileSelection(file.path)}
                      />
                      <span className="git-file-status">?</span>
                      <span className="git-file-path">{file.path}</span>
                      <button
                        className="git-file-action"
                        onClick={() => stageFiles([file.path])}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {selectedFiles.size > 0 && (
              <div className="git-bulk-actions">
                <button
                  className="git-btn"
                  onClick={() => stageFiles(Array.from(selectedFiles))}
                >
                  Stage Selected
                </button>
                <button
                  className="git-btn"
                  onClick={() => setSelectedFiles(new Set())}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </>
        )}
        
        {loading && (
          <div className="git-loading">
            <div className="git-spinner" />
            Loading...
          </div>
        )}
      </div>
    </div>
  );
};

export default GitPanel;
