import React, { useState, useEffect, useCallback } from 'react';
// import { AdvancedGitService, GitStatus, AICommitSuggestion, GitConflict, BranchSuggestion, GitPerformanceMetrics, GitCollaboration } from '../services/AdvancedGitService';
// import { AdvancedAISystem } from '../ai/AdvancedAISystem';
// import { SwarmOrchestrator } from '../ai/SwarmOrchestrator';

interface GitPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  advancedGitService?: AdvancedGitService;
  advancedAISystem?: AdvancedAISystem;
  swarmOrchestrator?: SwarmOrchestrator;
}

interface GitOperation {
  id: string;
  type: 'commit' | 'push' | 'pull' | 'merge' | 'rebase' | 'branch';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  metadata: Record<string, any>;
}

export const GitPanel: React.FC<GitPanelProps> = ({
  isVisible,
  onToggle,
  advancedGitService,
  advancedAISystem,
  swarmOrchestrator
}) => {
  const [status, setStatus] = useState<GitStatus>({
    branch: '',
    staged: [],
    unstaged: [],
    untracked: [],
    ahead: 0,
    behind: 0,
    isRepo: false
  });
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<AICommitSuggestion[]>([]);
  const [conflicts, setConflicts] = useState<GitConflict[]>([]);
  const [branchSuggestions, setBranchSuggestions] = useState<BranchSuggestion[]>([]);
  const [showAISuggestions, setShowAISuggestions] = useState<boolean>(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<GitPerformanceMetrics | null>(null);
  const [collaborationState, setCollaborationState] = useState<GitCollaboration | null>(null);
  const [activeOperations, setActiveOperations] = useState<GitOperation[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);

  // Initialize services and connection status
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setConnectionStatus('connecting');

        if (advancedGitService) {
          try {
            // Test connection to Advanced Git Service
            const gitStatus = await advancedGitService.getStatus();
            
            setConnectionStatus('connected');
          } catch (error) {
            console.warn('Advanced Git Service not fully initialized:', error);
            setConnectionStatus('disconnected');
          }
        } else {
          setConnectionStatus('disconnected');
        }

        // Test connection to AI System for enhanced features
        if (advancedAISystem) {
          try {
            const aiStatus = advancedAISystem.getStatus();
            
          } catch (error) {
            console.warn('AI System not available for Git operations:', error);
          }
        }

      } catch (error) {
        console.error('Failed to initialize Git services:', error);
        setConnectionStatus('error');
      }
    };

    initializeServices();
  }, [advancedGitService, advancedAISystem]);

  const refreshStatus = useCallback(async () => {
    if (!advancedGitService) return;

    setIsLoading(true);
    try {
      const gitStatus = await advancedGitService.getStatus();
      setStatus(gitStatus);

      // Get AI-powered insights if there are changes
      if (gitStatus.staged.length > 0 || gitStatus.unstaged.length > 0) {
        await generateAIInsights(gitStatus);
      }

      // Check for conflicts
      await checkForConflicts();

      // Get performance metrics
      await getPerformanceMetrics();

      // Get collaboration state
      await getCollaborationState();

    } catch (error) {
      console.error('Failed to get git status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [advancedGitService]);

  const generateAIInsights = useCallback(async (gitStatus: GitStatus) => {
    if (!advancedAISystem) return;

    try {
      // Generate AI commit message suggestions
      const suggestions = await advancedGitService!.generateCommitSuggestions({
        staged: gitStatus.staged,
        unstaged: gitStatus.unstaged,
        diff: await advancedGitService!.getDiff()
      });
      setAiSuggestions(suggestions);

      // Generate branch suggestions for feature development
      const branchSuggests = await advancedGitService!.generateBranchSuggestions({
        currentBranch: gitStatus.branch,
        changes: [...gitStatus.staged, ...gitStatus.unstaged]
      });
      setBranchSuggestions(branchSuggests);

    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    }
  }, [advancedGitService, advancedAISystem]);

  const checkForConflicts = useCallback(async () => {
    if (!advancedGitService) return;

    try {
      const conflictFiles = await advancedGitService.getConflicts();
      if (conflictFiles.length > 0) {
        const conflictDetails = await Promise.all(
          conflictFiles.map(async (file: string) => ({
            file,
            content: await advancedGitService.getConflictContent(file),
            suggestions: await advancedGitService.resolveConflict(file)
          }))
        );
        setConflicts(conflictDetails);
      }
    } catch (error) {
      console.error('Failed to check for conflicts:', error);
    }
  }, [advancedGitService]);

  const getPerformanceMetrics = useCallback(async () => {
    if (!advancedGitService) return;

    try {
      const metrics = await advancedGitService.getPerformanceMetrics();
      setPerformanceMetrics(metrics);
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
    }
  }, [advancedGitService]);

  const getCollaborationState = useCallback(async () => {
    if (!advancedGitService) return;

    try {
      const collaboration = advancedGitService.getCollaborationState();
      setCollaborationState(collaboration);
    } catch (error) {
      console.error('Failed to get collaboration state:', error);
    }
  }, [advancedGitService]);

  useEffect(() => {
    if (isVisible) {
      refreshStatus();
    }
  }, [isVisible, refreshStatus]);

  const handleStage = async (file: string) => {
    if (!advancedGitService) return;

    try {
      await advancedGitService.stageFile(file);
      refreshStatus();
    } catch (error) {
      console.error('Failed to stage file:', error);
    }
  };

  const handleUnstage = async (file: string) => {
    if (!advancedGitService) return;

    try {
      await advancedGitService.unstageFile(file);
      refreshStatus();
    } catch (error) {
      console.error('Failed to unstage file:', error);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || status.staged.length === 0 || !advancedGitService) return;

    try {
      await advancedGitService.commit(commitMessage);
      setCommitMessage('');
      refreshStatus();
    } catch (error) {
      console.error('Failed to commit:', error);
    }
  };

  const handlePush = async () => {
    if (!advancedGitService) return;

    try {
      await advancedGitService.push();
      refreshStatus();
    } catch (error) {
      console.error('Failed to push:', error);
    }
  };

  const handlePull = async () => {
    if (!advancedGitService) return;

    try {
      await advancedGitService.pull();
      refreshStatus();
    } catch (error) {
      console.error('Failed to pull:', error);
    }
  };

  const handleCreateBranch = async (branchName: string) => {
    if (!advancedGitService) return;

    try {
      await advancedGitService.createBranch(branchName);
      refreshStatus();
    } catch (error) {
      console.error('Failed to create branch:', error);
    }
  };

  const handleResolveConflict = async (file: string, resolution: string) => {
    if (!advancedGitService) return;

    try {
      await advancedGitService.resolveConflictWithResolution(file, resolution);
      setConflicts(prev => prev.filter(c => c.file !== file));
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const handleAICommitSuggestion = (suggestion: AICommitSuggestion) => {
    setCommitMessage(suggestion.message);
    setShowAISuggestions(false);
  };

  const toggleAdvancedMode = () => {
    setIsAdvancedMode(!isAdvancedMode);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FF9800';
      case 'disconnected': return '#9E9E9E';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="git-panel">
      <div className="git-header">
        <h2>Source Control</h2>
        <div className="git-actions">
          <button
            className={`advanced-mode-toggle ${isAdvancedMode ? 'active' : ''}`}
            onClick={toggleAdvancedMode}
            title="Toggle Advanced Mode"
          >
            🤖 Advanced
          </button>
          <button onClick={refreshStatus} disabled={isLoading} title="Refresh">
            🔄
          </button>
          <button onClick={onToggle} title="Close">×</button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="connection-status" style={{ backgroundColor: getConnectionStatusColor() }}>
        <span className="status-indicator"></span>
        <span className="status-text">{getConnectionStatusText()}</span>
      </div>

      {!status.isRepo ? (
        <div className="git-not-repo">
          <p>No Git repository found</p>
          <button onClick={() => advancedGitService?.init()}>Initialize Repository</button>
        </div>
      ) : (
        <div className="git-content">
          <div className="git-branch-info">
            <div className="branch-name">
              📋 {status.branch}
            </div>
            {(status.ahead > 0 || status.behind > 0) && (
              <div className="sync-status">
                {status.ahead > 0 && <span>↑{status.ahead}</span>}
                {status.behind > 0 && <span>↓{status.behind}</span>}
              </div>
            )}
          </div>

          <div className="git-sync-actions">
            <button onClick={handlePull} disabled={status.behind === 0}>
              ⬇ Pull
            </button>
            <button onClick={handlePush} disabled={status.ahead === 0}>
              ⬆ Push
            </button>
          </div>

          {/* Advanced Mode Features */}
          {isAdvancedMode && (
            <>
              {/* AI Branch Suggestions */}
              {branchSuggestions.length > 0 && (
                <div className="ai-branch-suggestions">
                  <h3>🤖 AI Branch Suggestions</h3>
                  {branchSuggestions.map((suggestion, index) => (
                    <div key={index} className="branch-suggestion">
                      <span className="suggestion-name">{suggestion.name}</span>
                      <span className="suggestion-reason">{suggestion.reason}</span>
                      <span className="suggestion-confidence">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                      <button onClick={() => handleCreateBranch(suggestion.name)}>
                        Create Branch
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Conflict Resolution */}
              {conflicts.length > 0 && (
                <div className="conflict-resolution">
                  <h3>⚠️ Conflicts Detected</h3>
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="conflict-item">
                      <div className="conflict-file">{conflict.file}</div>
                      <div className="conflict-suggestions">
                        {conflict.suggestions.map((suggestion: string, sIndex: number) => (
                          <button
                            key={sIndex}
                            onClick={() => handleResolveConflict(conflict.file, suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Performance Metrics */}
              {performanceMetrics && (
                <div className="performance-metrics">
                  <h3>📊 Performance Metrics</h3>
                  <div className="metrics-grid">
                    <div className="metric">
                      <span className="metric-label">Repository Size:</span>
                      <span className="metric-value">{performanceMetrics.repoSize}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Commit Speed:</span>
                      <span className="metric-value">{performanceMetrics.commitSpeed}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Optimization Score:</span>
                      <span className="metric-value">{performanceMetrics.optimizationScore}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Collaboration State */}
              {collaborationState && (
                <div className="collaboration-state">
                  <h3>👥 Collaboration</h3>
                  <div className="collab-info">
                    <span>Active Users: {collaborationState.activeUsers}</span>
                    <span>Branch: {collaborationState.currentBranch}</span>
                    <span>Shared Commits: {collaborationState.sharedCommits}</span>
                    <span>Last Sync: {collaborationState.lastSync.toLocaleTimeString()}</span>
                  </div>
                </div>
              )}

              {/* Active Operations */}
              {activeOperations.length > 0 && (
                <div className="active-operations">
                  <h3>⚡ Active Operations</h3>
                  {activeOperations.map((operation) => (
                    <div key={operation.id} className={`operation ${operation.status}`}>
                      <span className="operation-type">{operation.type}</span>
                      <span className="operation-status">{operation.status}</span>
                      <div className="operation-progress">
                        <div
                          className="progress-bar"
                          style={{ width: `${operation.progress}%` }}
                        ></div>
                        <span className="progress-text">{operation.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="commit-section">
            <div className="commit-input-container">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                rows={3}
                className="commit-input"
              />
              <button
                className="ai-suggestions-toggle"
                onClick={() => setShowAISuggestions(!showAISuggestions)}
                title="AI Commit Suggestions"
              >
                🤖
              </button>
            </div>

            {showAISuggestions && aiSuggestions.length > 0 && (
              <div className="ai-commit-suggestions">
                <h4>AI Commit Message Suggestions</h4>
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="commit-suggestion"
                    onClick={() => handleAICommitSuggestion(suggestion)}
                  >
                    <div className="suggestion-header">
                      <span className="suggestion-type">{suggestion.type}</span>
                      <span className="suggestion-confidence">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>
                    <div className="suggestion-message">{suggestion.message}</div>
                    <div className="suggestion-description">{suggestion.description}</div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleCommit}
              disabled={!commitMessage.trim() || status.staged.length === 0}
              className="commit-button"
            >
              ✓ Commit ({status.staged.length})
            </button>
          </div>

          <div className="changes-section">
            {status.staged.length > 0 && (
              <div className="staged-files">
                <h3>Staged Changes ({status.staged.length})</h3>
                {status.staged.map((file: string) => (
                  <div key={file} className="git-file staged">
                    <span className="file-status">A</span>
                    <span className="file-name">{file}</span>
                    <button onClick={() => handleUnstage(file)} title="Unstage">−</button>
                  </div>
                ))}
              </div>
            )}

            {status.unstaged.length > 0 && (
              <div className="unstaged-files">
                <h3>Changes ({status.unstaged.length})</h3>
                {status.unstaged.map((file: string) => (
                  <div key={file} className="git-file unstaged">
                    <span className="file-status">M</span>
                    <span className="file-name">{file}</span>
                    <button onClick={() => handleStage(file)} title="Stage">+</button>
                  </div>
                ))}
              </div>
            )}

            {status.untracked.length > 0 && (
              <div className="untracked-files">
                <h3>Untracked Files ({status.untracked.length})</h3>
                {status.untracked.map((file: string) => (
                  <div key={file} className="git-file untracked">
                    <span className="file-status">U</span>
                    <span className="file-name">{file}</span>
                    <button onClick={() => handleStage(file)} title="Stage">+</button>
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