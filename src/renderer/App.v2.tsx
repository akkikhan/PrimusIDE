/**
 * Primus IDE - Professional Code Editor
 * Inspired by VS Code, Cursor, and modern IDE best practices
 * Clean, unified interface with proper layout architecture
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { ThemeProvider, useTheme } from './ThemeContext';
import { MonacoEditor } from './MonacoEditor';
import Terminal from './Terminal';
import FileExplorer from './FileExplorer';
import { AIChatPanelWrapper } from './components/AIChatPanelWrapper';
import { ProblemsPanel } from './ProblemsPanel';
import { Problem, ProblemSeverity } from './diagnostics/types';
import { FileEntry } from './types';
import './styles/App.v2.css';

// Core Types
interface Tab {
  id: string;
  name: string;
  content: string;
  language: string;
  filePath?: string;
  isDirty?: boolean;
}

// FileEntry imported from ./types

type ViewType = 'explorer' | 'search' | 'git' | 'extensions' | 'ai';
type PanelType = 'terminal' | 'problems' | 'output' | 'debug';

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  // UI State
  const [activeView, setActiveView] = useState<ViewType>('explorer');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [activePanel, setActivePanel] = useState<PanelType>('terminal');
  
  // Editor State
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const editorRef = useRef<any>(null);
  
  // Workspace State
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  
  // Problems State
  const [problems, setProblems] = useState<Problem[]>([]);
  
  // AI State
  const [isAIVisible, setIsAIVisible] = useState(false);

  // Computed
  const activeTab = tabs.find(t => t.id === activeTabId);

  // File Operations
  const openFile = useCallback(async (filePath: string) => {
    try {
      const content = await window.primus.fs.readFile(filePath);
      const name = filePath.split(/[\\/]/).pop() || 'untitled';
      const language = getLanguageFromPath(filePath);
      
      const existingTab = tabs.find(t => t.filePath === filePath);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }

      const newTab: Tab = {
        id: Date.now().toString(),
        name,
        content,
        language,
        filePath,
        isDirty: false
      };

      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  }, [tabs]);

  const saveFile = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab?.filePath) return;

    try {
      await window.primus.fs.writeFile(tab.filePath, tab.content);
      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, isDirty: false } : t
      ));
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }, [tabs]);

  const closeTab = useCallback((tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    setTabs(prev => prev.filter(t => t.id !== tabId));
    
    if (activeTabId === tabId) {
      const nextTab = tabs[tabIndex + 1] || tabs[tabIndex - 1];
      setActiveTabId(nextTab?.id || null);
    }
  }, [tabs, activeTabId]);

  // Workspace Operations
  const loadWorkspace = useCallback(async (folderPath: string) => {
    try {
      const entries = await window.primus.fs.readDir(folderPath);
      setFiles(entries);
      setCurrentFolder(folderPath);
    } catch (err) {
      console.error('Failed to load workspace:', err);
    }
  }, []);

  const handleOpenFolder = async () => {
    try {
      const result = await window.primus.dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      if (result && Array.isArray(result) && result.length > 0) {
        await loadWorkspace(result[0]);
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  };

  // Monaco Integration
  useEffect(() => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current.getEditor?.();
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    // Extract problems from Monaco markers
    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    const newProblems: Problem[] = markers.map(marker => ({
      id: `${model.uri.toString()}-${marker.startLineNumber}-${marker.startColumn}`,
      message: marker.message,
      severity: marker.severity === monaco.MarkerSeverity.Error 
        ? ProblemSeverity.Error 
        : marker.severity === monaco.MarkerSeverity.Warning 
        ? ProblemSeverity.Warning 
        : ProblemSeverity.Info,
      filePath: activeTab?.filePath || '',
      startLine: marker.startLineNumber,
      startColumn: marker.startColumn,
      endLine: marker.endLineNumber,
      endColumn: marker.endColumn
    }));

    setProblems(newProblems);
  }, [activeTab, tabs]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          if (activeTabId) saveFile(activeTabId);
        } else if (e.key === 'p') {
          e.preventDefault();
          // Open command palette (TODO)
        } else if (e.key === 'b') {
          e.preventDefault();
          setIsSidebarVisible(prev => !prev);
        } else if (e.key === 'j') {
          e.preventDefault();
          setIsPanelVisible(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, saveFile]);

  return (
    <div className={`primus-ide ${theme}`}>
      {/* Title Bar */}
      <div className="title-bar">
        <div className="title-bar-left">
          <div className="app-logo">⚡ Primus IDE</div>
          <div className="menu-bar">
            <div className="menu-item">File</div>
            <div className="menu-item">Edit</div>
            <div className="menu-item">Selection</div>
            <div className="menu-item">View</div>
            <div className="menu-item">Go</div>
            <div className="menu-item">Run</div>
            <div className="menu-item">Terminal</div>
            <div className="menu-item">Help</div>
          </div>
        </div>
        <div className="title-bar-center">
          {currentFolder || 'No Folder Open'}
        </div>
        <div className="title-bar-right">
          <button className="title-btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="main-container">
        {/* Activity Bar */}
        <div className="activity-bar">
          <div className="activity-icons">
            <button 
              className={`activity-btn ${activeView === 'explorer' ? 'active' : ''}`}
              onClick={() => setActiveView('explorer')}
              title="Explorer (Ctrl+Shift+E)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h7l2 2h7v12H4V4z"/>
              </svg>
            </button>
            <button 
              className={`activity-btn ${activeView === 'search' ? 'active' : ''}`}
              onClick={() => setActiveView('search')}
              title="Search (Ctrl+Shift+F)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="11" cy="11" r="7" stroke="currentColor" fill="none" strokeWidth="2"/>
                <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            <button 
              className={`activity-btn ${activeView === 'git' ? 'active' : ''}`}
              onClick={() => setActiveView('git')}
              title="Source Control (Ctrl+Shift+G)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 14h8v8l8-12h-8V2z"/>
              </svg>
            </button>
            <button 
              className={`activity-btn ${activeView === 'extensions' ? 'active' : ''}`}
              onClick={() => setActiveView('extensions')}
              title="Extensions (Ctrl+Shift+X)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="4" height="4"/>
                <rect x="14" y="6" width="4" height="4"/>
                <rect x="6" y="14" width="4" height="4"/>
                <rect x="14" y="14" width="4" height="4"/>
              </svg>
            </button>
            <button 
              className={`activity-btn ${activeView === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveView('ai')}
              title="AI Assistant (Ctrl+Shift+A)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-5-6.5 5 2-7L2 9h7z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Sidebar */}
        {isSidebarVisible && (
          <div className="sidebar">
            <div className="sidebar-header">
              <h3 className="sidebar-title">
                {activeView === 'explorer' && 'EXPLORER'}
                {activeView === 'search' && 'SEARCH'}
                {activeView === 'git' && 'SOURCE CONTROL'}
                {activeView === 'extensions' && 'EXTENSIONS'}
                {activeView === 'ai' && 'AI ASSISTANT'}
              </h3>
              <div className="sidebar-actions">
                {activeView === 'explorer' && (
                  <>
                    <button className="icon-btn" onClick={handleOpenFolder} title="Open Folder">
                      📁
                    </button>
                    <button className="icon-btn" title="New File">
                      📄
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="sidebar-content">
              {activeView === 'explorer' && (
                <FileExplorer
                  rootPath={currentFolder}
                  onFileSelect={openFile}
                />
              )}
              {activeView === 'search' && (
                <div className="view-placeholder">
                  <p>Search functionality coming soon...</p>
                </div>
              )}
              {activeView === 'git' && (
                <div className="view-placeholder">
                  <p>Git integration coming soon...</p>
                </div>
              )}
              {activeView === 'extensions' && (
                <div className="view-placeholder">
                  <p>Extensions marketplace coming soon...</p>
                </div>
              )}
              {activeView === 'ai' && (
                <div className="ai-sidebar">
                  <p>AI Assistant Panel</p>
                  <button onClick={() => setIsAIVisible(!isAIVisible)}>
                    {isAIVisible ? 'Hide Chat' : 'Show Chat'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor Area */}
        <div className="editor-container">
          {tabs.length > 0 ? (
            <>
              {/* Tab Bar */}
              <div className="tab-bar">
                {tabs.map(tab => (
                  <div
                    key={tab.id}
                    className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <span className="tab-icon">📄</span>
                    <span className="tab-name">
                      {tab.name}
                      {tab.isDirty && ' •'}
                    </span>
                    <button
                      className="tab-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Breadcrumb */}
              {activeTab?.filePath && (
                <div className="breadcrumb">
                  {activeTab.filePath.split(/[\\/]/).map((part, i, arr) => (
                    <React.Fragment key={i}>
                      <span className="breadcrumb-item">{part}</span>
                      {i < arr.length - 1 && <span className="breadcrumb-sep">/</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Monaco Editor */}
              <div className="editor-wrapper">
                {activeTab && (
                  <MonacoEditor
                    ref={editorRef}
                    value={activeTab.content}
                    language={activeTab.language}
                    minimapEnabled={true}
                    onChange={(value) => {
                      setTabs(prev => prev.map(tab =>
                        tab.id === activeTabId 
                          ? { ...tab, content: value, isDirty: true } 
                          : tab
                      ));
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="welcome-screen">
              <div className="welcome-content">
                <h1>Primus IDE</h1>
                <p className="welcome-subtitle">AI-Powered Professional Code Editor</p>
                
                <div className="welcome-actions">
                  <button className="welcome-btn primary" onClick={handleOpenFolder}>
                    📁 Open Folder
                  </button>
                  <button className="welcome-btn">
                    📄 New File
                  </button>
                </div>

                <div className="welcome-shortcuts">
                  <h3>Quick Start</h3>
                  <div className="shortcut-grid">
                    <div className="shortcut-item">
                      <kbd>Ctrl+P</kbd>
                      <span>Quick Open</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Ctrl+Shift+P</kbd>
                      <span>Command Palette</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Ctrl+B</kbd>
                      <span>Toggle Sidebar</span>
                    </div>
                    <div className="shortcut-item">
                      <kbd>Ctrl+J</kbd>
                      <span>Toggle Panel</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel */}
      {isPanelVisible && (
        <div className="bottom-panel">
          <div className="panel-tabs">
            <button
              className={`panel-tab ${activePanel === 'problems' ? 'active' : ''}`}
              onClick={() => setActivePanel('problems')}
            >
              Problems {problems.length > 0 && <span className="badge">{problems.length}</span>}
            </button>
            <button
              className={`panel-tab ${activePanel === 'output' ? 'active' : ''}`}
              onClick={() => setActivePanel('output')}
            >
              Output
            </button>
            <button
              className={`panel-tab ${activePanel === 'terminal' ? 'active' : ''}`}
              onClick={() => setActivePanel('terminal')}
            >
              Terminal
            </button>
            <button
              className={`panel-tab ${activePanel === 'debug' ? 'active' : ''}`}
              onClick={() => setActivePanel('debug')}
            >
              Debug Console
            </button>
            <button
              className="panel-close"
              onClick={() => setIsPanelVisible(false)}
            >
              ✕
            </button>
          </div>
          <div className="panel-content">
            {activePanel === 'problems' && (
              <ProblemsPanel
                problems={problems}
                isVisible={true}
                enabled={true}
                onSelectProblem={(p: Problem) => {
                  if (p.filePath) openFile(p.filePath);
                }}
              />
            )}
            {activePanel === 'output' && (
              <div className="output-view">
                <p>Output panel coming soon...</p>
              </div>
            )}
            {activePanel === 'terminal' && (
              <Terminal isVisible={true} onToggle={() => {}} />
            )}
            {activePanel === 'debug' && (
              <div className="debug-console">
                <p>Debug console coming soon...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">
            {currentFolder ? `📁 ${currentFolder.split(/[\\/]/).pop()}` : 'No folder open'}
          </span>
          {activeTab && (
            <>
              <span className="status-item">
                Ln 1, Col 1
              </span>
              <span className="status-item">
                {activeTab.language.toUpperCase()}
              </span>
            </>
          )}
        </div>
        <div className="status-right">
          <span className="status-item">
            {problems.filter(p => p.severity === ProblemSeverity.Error).length} ❌
            {problems.filter(p => p.severity === ProblemSeverity.Warning).length} ⚠️
          </span>
          <span className="status-item">
            UTF-8
          </span>
          <span className="status-item">
            LF
          </span>
        </div>
      </div>

      {/* AI Chat Overlay */}
      {isAIVisible && (
        <AIChatPanelWrapper
          isVisible={isAIVisible}
          onToggle={() => setIsAIVisible(false)}
          currentContext={activeTab ? {
            filePath: activeTab.filePath || activeTab.name,
            content: activeTab.content,
            language: activeTab.language,
            cursorPosition: { line: 1, column: 1 }
          } : undefined}
        />
      )}
    </div>
  );
};

// Utility Functions
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'md': 'markdown',
    'txt': 'plaintext'
  };
  return langMap[ext || ''] || 'plaintext';
}

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};
