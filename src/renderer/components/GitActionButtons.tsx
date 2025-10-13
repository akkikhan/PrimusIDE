import React, { useState } from 'react';
import { logger } from '@shared/logger';

interface GitActionButtonsProps {
  onCommit: (message: string) => Promise<void>;
  onPush: () => Promise<void>;
  onPull: () => Promise<void>;
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
  branch?: string;
}

export const GitActionButtons: React.FC<GitActionButtonsProps> = ({
  onCommit,
  onPush,
  onPull,
  onRefresh,
  isLoading = false,
  branch = 'main'
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitInput, setShowCommitInput] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      logger.warn('Commit message is empty');
      return;
    }

    setActionLoading('commit');
    try {
      await onCommit(commitMessage);
      setCommitMessage('');
      setShowCommitInput(false);
      await onRefresh();
    } catch (error) {
      logger.error('Commit failed', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePush = async () => {
    setActionLoading('push');
    try {
      await onPush();
      await onRefresh();
    } catch (error) {
      logger.error('Push failed', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePull = async () => {
    setActionLoading('pull');
    try {
      await onPull();
      await onRefresh();
    } catch (error) {
      logger.error('Pull failed', error);
    } finally {
      setActionLoading(null);
    }
  };
  return (
    <div className="git-action-buttons">
      <div className="git-branch-info">
        <span className="branch-icon">🌿</span>
        <span className="branch-name">{branch}</span>
      </div>

      <div className="git-actions">
        {!showCommitInput ? (
          <button
            className="git-action-btn commit"
            onClick={() => setShowCommitInput(true)}
            disabled={isLoading || actionLoading !== null}
            title="Commit changes"
          >
            <span className="icon">💾</span>
            Commit
          </button>
        ) : (
          <div className="commit-input-wrapper">
            <input
              type="text"
              className="commit-message-input"
              placeholder="Enter commit message..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCommit()}
              autoFocus
            />
            <button
              className="git-action-btn commit-confirm"
              onClick={handleCommit}
              disabled={!commitMessage.trim() || actionLoading === 'commit'}
            >
              {actionLoading === 'commit' ? '...' : '✓'}
            </button>
            <button
              className="git-action-btn commit-cancel"
              onClick={() => {
                setShowCommitInput(false);
                setCommitMessage('');
              }}
            >
              ✗
            </button>
          </div>
        )}

        <button
          className="git-action-btn pull"
          onClick={handlePull}
          disabled={isLoading || actionLoading !== null}
          title="Pull from remote"
        >
          <span className="icon">⬇</span>
          {actionLoading === 'pull' ? 'Pulling...' : 'Pull'}
        </button>

        <button
          className="git-action-btn push"
          onClick={handlePush}
          disabled={isLoading || actionLoading !== null}
          title="Push to remote"
        >
          <span className="icon">⬆</span>
          {actionLoading === 'push' ? 'Pushing...' : 'Push'}
        </button>

        <button
          className="git-action-btn refresh"
          onClick={onRefresh}
          disabled={isLoading || actionLoading !== null}
          title="Refresh status"
        >
          <span className="icon">🔄</span>
        </button>
      </div>
    </div>
  );
};

export default GitActionButtons;