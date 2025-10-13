import React, { useState, useEffect } from 'react';
import { logger } from '@shared/logger';

interface GitBranchManagerProps {
  repoPath: string;
  currentBranch: string;
  onBranchChange: (branch: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

interface Branch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

export const GitBranchManager: React.FC<GitBranchManagerProps> = ({
  repoPath,
  currentBranch,
  onBranchChange,
  onRefresh
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, [repoPath, currentBranch]);

  const loadBranches = async () => {
    try {
      const result = await window.primus.git.branches(repoPath);
      
      if (result && result.all) {
        const branchList: Branch[] = result.all.map(name => ({
          name,
          isCurrent: name === result.current,
          isRemote: name.includes('remotes/')
        }));
        setBranches(branchList);
      }
    } catch (err) {
      logger.error('Failed to load branches', err);
      setError('Failed to load branches');
    }
  };

  const handleBranchSwitch = async (branchName: string) => {
    if (branchName === currentBranch) {
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await window.primus.git.checkout(repoPath, branchName);
      await onBranchChange(branchName);
      await onRefresh();
      setShowDropdown(false);
      logger.info(`Switched to branch: ${branchName}`);
    } catch (err) {
      logger.error('Failed to switch branch', err);
      setError(`Failed to switch to ${branchName}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await window.primus.git.createBranch(repoPath, newBranchName);
      await onBranchChange(newBranchName);
      await loadBranches();
      await onRefresh();
      setNewBranchName('');
      setShowCreateInput(false);
      setShowDropdown(false);
      logger.info(`Created and switched to branch: ${newBranchName}`);
    } catch (err) {
      logger.error('Failed to create branch', err);
      setError(`Failed to create branch ${newBranchName}`);
    } finally {
      setIsLoading(false);
    }
  };

  const localBranches = branches.filter(b => !b.isRemote);
  const remoteBranches = branches.filter(b => b.isRemote);

  return (
    <div className="git-branch-manager">
      <button
        className="branch-selector"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isLoading}
      >
        <span className="branch-icon">🌿</span>
        <span className="branch-name">{currentBranch}</span>
        <span className="dropdown-arrow">▼</span>
      </button>

      {showDropdown && (
        <div className="branch-dropdown">
          <div className="dropdown-header">
            <h4>Branches</h4>
            <button
              className="create-branch-btn"
              onClick={() => setShowCreateInput(!showCreateInput)}
              title="Create new branch"
            >
              +
            </button>
          </div>

          {showCreateInput && (
            <div className="create-branch-input">
              <input
                type="text"
                placeholder="New branch name..."
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateBranch()}
                autoFocus
              />
              <button onClick={handleCreateBranch} disabled={!newBranchName.trim()}>
                Create
              </button>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="branch-list">
            <div className="branch-group">
              <h5>Local Branches</h5>
              {localBranches.map(branch => (
                <div
                  key={branch.name}
                  className={`branch-item ${branch.isCurrent ? 'current' : ''}`}
                  onClick={() => handleBranchSwitch(branch.name)}
                >
                  {branch.isCurrent && <span className="current-indicator">✓</span>}
                  <span className="branch-name">{branch.name}</span>
                </div>
              ))}
            </div>

            {remoteBranches.length > 0 && (
              <div className="branch-group">
                <h5>Remote Branches</h5>
                {remoteBranches.map(branch => (
                  <div
                    key={branch.name}
                    className="branch-item remote"
                  >
                    <span className="branch-name">{branch.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitBranchManager;