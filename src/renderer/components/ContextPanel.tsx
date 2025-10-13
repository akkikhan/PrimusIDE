import React, { useState, useEffect, useCallback } from 'react';
import { contextManager, WorkspaceContext, FileContext, ContextIntent } from '../contextAwareness/ContextManager';
import './ContextPanel.css';

/**
 * Context Awareness Panel - Real-time display of workspace context
 * Shows project structure, open files, current context, and AI assistance suggestions
 */

interface ContextPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ isVisible, onClose }) => {
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContext | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'project' | 'suggestions'>('overview');
  const [contextIntent, setContextIntent] = useState<ContextIntent>({
    type: 'explain',
    target: 'file',
    scope: 'local',
    context: { relatedFiles: [], dependencies: [], references: [] }
  });
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Subscribe to context updates
  useEffect(() => {
    const handleContextUpdate = (context: WorkspaceContext) => {
      setWorkspaceContext(context);
    };

    const handleFileContextUpdate = (fileContext: FileContext) => {
      // Update workspace context when file context changes
      if (workspaceContext) {
        const updatedContext = { ...workspaceContext };
        const fileIndex = updatedContext.openFiles.findIndex(f => f.path === fileContext.path);
        if (fileIndex >= 0) {
          updatedContext.openFiles[fileIndex] = fileContext;
        } else {
          updatedContext.openFiles.push(fileContext);
        }
        setWorkspaceContext(updatedContext);
      }
    };

    const handleProjectUpdate = (structure: any) => {
      if (workspaceContext) {
        setWorkspaceContext({
          ...workspaceContext,
          projectStructure: structure
        });
      }
    };

    contextManager.on('contextInitialized', handleContextUpdate);
    contextManager.on('fileContextUpdated', handleFileContextUpdate);
    contextManager.on('projectStructureUpdated', handleProjectUpdate);

    // Initialize context if not already done
    if (!workspaceContext) {
      const currentContext = contextManager.getWorkspaceContext();
      setWorkspaceContext(currentContext);
    }

    return () => {
      contextManager.off('contextInitialized', handleContextUpdate);
      contextManager.off('fileContextUpdated', handleFileContextUpdate);
      contextManager.off('projectStructureUpdated', handleProjectUpdate);
    };
  }, [workspaceContext]);

  // Generate AI suggestions based on current context
  const generateSuggestions = useCallback(async () => {
    if (!workspaceContext) return;

    setIsAnalyzing(true);
    try {
      const contextData = contextManager.generateContextForIntent(contextIntent);
      setAiSuggestions(contextData.suggestions);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [workspaceContext, contextIntent]);

  // Update intent and regenerate suggestions
  const updateIntent = useCallback((newIntent: Partial<ContextIntent>) => {
    const updatedIntent = { ...contextIntent, ...newIntent };
    setContextIntent(updatedIntent);
  }, [contextIntent]);

  // Initialize workspace context
  useEffect(() => {
    const initContext = async () => {
      try {
        await contextManager.initialize('C:\\Users\\aakib\\Documents\\Primus-IDE');
      } catch (error) {
        console.error('Failed to initialize context:', error);
      }
    };

    if (!workspaceContext?.projectStructure.root) {
      initContext();
    }
  }, [workspaceContext]);

  // Auto-generate suggestions when context changes
  useEffect(() => {
    if (workspaceContext && activeTab === 'suggestions') {
      generateSuggestions();
    }
  }, [workspaceContext, activeTab, generateSuggestions]);

  if (!isVisible) return null;

  return (
    <div className="context-panel">
      <div className="context-panel-header">
        <div className="context-panel-title">
          <span className="context-icon">🧠</span>
          Context Awareness
        </div>
        <button className="context-close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="context-tabs">
        <button
          className={`context-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`context-tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Files
        </button>
        <button
          className={`context-tab ${activeTab === 'project' ? 'active' : ''}`}
          onClick={() => setActiveTab('project')}
        >
          Project
        </button>
        <button
          className={`context-tab ${activeTab === 'suggestions' ? 'active' : ''}`}
          onClick={() => setActiveTab('suggestions')}
        >
          AI Suggestions
        </button>
      </div>

      <div className="context-content">
        {activeTab === 'overview' && (
          <ContextOverview
            workspaceContext={workspaceContext}
            onUpdateIntent={updateIntent}
          />
        )}
        
        {activeTab === 'files' && (
          <FilesContext
            openFiles={workspaceContext?.openFiles || []}
            activeFile={workspaceContext?.activeFile}
            recentFiles={workspaceContext?.recentFiles || []}
          />
        )}
        
        {activeTab === 'project' && (
          <ProjectContext
            projectStructure={workspaceContext?.projectStructure}
            gitStatus={workspaceContext?.gitStatus}
          />
        )}
        
        {activeTab === 'suggestions' && (
          <SuggestionsContext
            intent={contextIntent}
            suggestions={aiSuggestions}
            isAnalyzing={isAnalyzing}
            onUpdateIntent={updateIntent}
            onRefreshSuggestions={generateSuggestions}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const ContextOverview: React.FC<{
  workspaceContext: WorkspaceContext | null;
  onUpdateIntent: (intent: Partial<ContextIntent>) => void;
}> = ({ workspaceContext, onUpdateIntent }) => {
  if (!workspaceContext) return <div className="loading">Loading workspace context...</div>;

  return (
    <div className="context-overview">
      <div className="context-section">
        <h3>Current Context</h3>
        <div className="context-stats">
          <div className="stat-item">
            <span className="stat-label">Open Files:</span>
            <span className="stat-value">{workspaceContext.openFiles.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active File:</span>
            <span className="stat-value">
              {workspaceContext.activeFile ? 
                workspaceContext.activeFile.path.split('/').pop() : 
                'None'
              }
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Languages:</span>
            <span className="stat-value">{workspaceContext.projectStructure.languages.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Frameworks:</span>
            <span className="stat-value">{workspaceContext.projectStructure.frameworks.length}</span>
          </div>
        </div>
      </div>

      {workspaceContext.activeFile && (
        <div className="context-section">
          <h3>Active File Info</h3>
          <div className="file-info">
            <div className="file-detail">
              <span className="detail-label">Language:</span>
              <span className="detail-value">{workspaceContext.activeFile.language}</span>
            </div>
            <div className="file-detail">
              <span className="detail-label">Modified:</span>
              <span className="detail-value">
                {workspaceContext.activeFile.isDirty ? 'Yes' : 'No'}
              </span>
            </div>
            {workspaceContext.activeFile.cursorPosition && (
              <div className="file-detail">
                <span className="detail-label">Cursor:</span>
                <span className="detail-value">
                  Line {workspaceContext.activeFile.cursorPosition.line}, 
                  Column {workspaceContext.activeFile.cursorPosition.column}
                </span>
              </div>
            )}
            {workspaceContext.activeFile.selection && (
              <div className="file-detail">
                <span className="detail-label">Selection:</span>
                <span className="detail-value">
                  {workspaceContext.activeFile.selection.text.length} characters
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {workspaceContext.errors.length > 0 && (
        <div className="context-section">
          <h3>Current Errors</h3>
          <div className="errors-list">
            {workspaceContext.errors.slice(0, 5).map((error, index) => (
              <div key={index} className={`error-item ${error.severity}`}>
                <div className="error-location">
                  {error.file.split('/').pop()}:{error.line}:{error.column}
                </div>
                <div className="error-message">{error.message}</div>
              </div>
            ))}
            {workspaceContext.errors.length > 5 && (
              <div className="error-more">
                +{workspaceContext.errors.length - 5} more errors
              </div>
            )}
          </div>
        </div>
      )}

      <div className="context-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <button 
            className="quick-action-btn"
            onClick={() => onUpdateIntent({ type: 'fix_error' })}
          >
            🔧 Fix Errors
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => onUpdateIntent({ type: 'implement_feature' })}
          >
            ✨ Add Feature
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => onUpdateIntent({ type: 'refactor' })}
          >
            🔄 Refactor Code
          </button>
          <button 
            className="quick-action-btn"
            onClick={() => onUpdateIntent({ type: 'explain' })}
          >
            📖 Explain Code
          </button>
        </div>
      </div>
    </div>
  );
};

// Files Tab Component
const FilesContext: React.FC<{
  openFiles: FileContext[];
  activeFile?: FileContext;
  recentFiles: string[];
}> = ({ openFiles, activeFile, recentFiles }) => {
  return (
    <div className="files-context">
      <div className="context-section">
        <h3>Open Files ({openFiles.length})</h3>
        <div className="files-list">
          {openFiles.map((file, index) => (
            <div 
              key={index} 
              className={`file-item ${file.path === activeFile?.path ? 'active' : ''}`}
            >
              <div className="file-name">
                {file.path.split('/').pop()}
                {file.isDirty && <span className="file-dirty">●</span>}
              </div>
              <div className="file-path">{file.path}</div>
              <div className="file-meta">
                <span className="file-language">{file.language}</span>
                <span className="file-modified">
                  {new Date(file.lastModified).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="context-section">
        <h3>Recent Files</h3>
        <div className="recent-files">
          {recentFiles.slice(0, 10).map((filePath, index) => (
            <div key={index} className="recent-file">
              <span className="recent-file-name">{filePath.split('/').pop()}</span>
              <span className="recent-file-path">{filePath}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Project Tab Component
const ProjectContext: React.FC<{
  projectStructure?: any;
  gitStatus?: any;
}> = ({ projectStructure, gitStatus }) => {
  if (!projectStructure) return <div className="loading">Loading project info...</div>;

  return (
    <div className="project-context">
      <div className="context-section">
        <h3>Project Structure</h3>
        <div className="project-info">
          <div className="project-detail">
            <span className="detail-label">Root:</span>
            <span className="detail-value">{projectStructure.root}</span>
          </div>
          <div className="project-detail">
            <span className="detail-label">Files:</span>
            <span className="detail-value">{projectStructure.files.length}</span>
          </div>
          <div className="project-detail">
            <span className="detail-label">Directories:</span>
            <span className="detail-value">{projectStructure.directories.length}</span>
          </div>
        </div>
      </div>

      <div className="context-section">
        <h3>Languages & Frameworks</h3>
        <div className="tech-stack">
          <div className="tech-group">
            <h4>Languages</h4>
            <div className="tech-items">
              {projectStructure.languages.map((lang: string, index: number) => (
                <span key={index} className="tech-item">{lang}</span>
              ))}
            </div>
          </div>
          <div className="tech-group">
            <h4>Frameworks</h4>
            <div className="tech-items">
              {projectStructure.frameworks.map((framework: string, index: number) => (
                <span key={index} className="tech-item">{framework}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="context-section">
        <h3>Dependencies</h3>
        <div className="dependencies">
          <div className="dep-group">
            <h4>Production ({projectStructure.dependencies.production.length})</h4>
            <div className="dep-items">
              {projectStructure.dependencies.production.slice(0, 10).map((dep: string, index: number) => (
                <span key={index} className="dep-item">{dep}</span>
              ))}
              {projectStructure.dependencies.production.length > 10 && (
                <span className="dep-more">+{projectStructure.dependencies.production.length - 10} more</span>
              )}
            </div>
          </div>
          <div className="dep-group">
            <h4>Development ({projectStructure.dependencies.development.length})</h4>
            <div className="dep-items">
              {projectStructure.dependencies.development.slice(0, 10).map((dep: string, index: number) => (
                <span key={index} className="dep-item">{dep}</span>
              ))}
              {projectStructure.dependencies.development.length > 10 && (
                <span className="dep-more">+{projectStructure.dependencies.development.length - 10} more</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Suggestions Tab Component
const SuggestionsContext: React.FC<{
  intent: ContextIntent;
  suggestions: string[];
  isAnalyzing: boolean;
  onUpdateIntent: (intent: Partial<ContextIntent>) => void;
  onRefreshSuggestions: () => void;
}> = ({ intent, suggestions, isAnalyzing, onUpdateIntent, onRefreshSuggestions }) => {
  return (
    <div className="suggestions-context">
      <div className="context-section">
        <h3>AI Intent Configuration</h3>
        <div className="intent-controls">
          <div className="control-group">
            <label>Intent Type:</label>
            <select
              value={intent.type}
              onChange={(e) => onUpdateIntent({ type: e.target.value as any })}
              aria-label="Intent Type"
            >
              <option value="fix_error">Fix Error</option>
              <option value="implement_feature">Implement Feature</option>
              <option value="refactor">Refactor Code</option>
              <option value="explain">Explain Code</option>
              <option value="optimize">Optimize Code</option>
              <option value="test">Write Tests</option>
            </select>
          </div>
          <div className="control-group">
            <label>Target:</label>
            <select
              value={intent.target}
              onChange={(e) => onUpdateIntent({ target: e.target.value as any })}
              aria-label="Target"
            >
              <option value="selection">Selection</option>
              <option value="file">Current File</option>
              <option value="project">Entire Project</option>
              <option value="function">Function</option>
              <option value="class">Class</option>
            </select>
          </div>
          <div className="control-group">
            <label>Scope:</label>
            <select
              value={intent.scope}
              onChange={(e) => onUpdateIntent({ scope: e.target.value as any })}
              aria-label="Scope"
            >
              <option value="local">Local Context</option>
              <option value="file">File Context</option>
              <option value="project">Project Context</option>
              <option value="dependencies">Include Dependencies</option>
            </select>
          </div>
        </div>
        <button 
          className="refresh-suggestions-btn"
          onClick={onRefreshSuggestions}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? '🔄 Analyzing...' : '✨ Generate Suggestions'}
        </button>
      </div>

      <div className="context-section">
        <h3>AI Suggestions</h3>
        {isAnalyzing ? (
          <div className="analyzing">
            <div className="loading-spinner">🧠</div>
            <span>Analyzing context and generating suggestions...</span>
          </div>
        ) : (
          <div className="suggestions-list">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <div key={index} className="suggestion-item">
                  <div className="suggestion-text">{suggestion}</div>
                  <button className="suggestion-apply-btn">Apply</button>
                </div>
              ))
            ) : (
              <div className="no-suggestions">
                No suggestions available. Try changing the intent configuration.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContextPanel;
