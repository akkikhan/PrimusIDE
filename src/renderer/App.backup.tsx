import React, { useState, useEffect } from 'react';
import * as monaco from 'monaco-editor';
import { MonacoEditor } from './MonacoEditor';
import { StatusBar } from './StatusBar';
import Terminal from './Terminal';
import FileExplorer from './FileExplorer';
import ActivityBar from './ActivityBar';
import CommandPalette from './CommandPalette';
import { QuickOpen } from './QuickOpen';
import { SimpleGitPanel } from './SimpleGitPanel';
import SearchPanel from './SearchPanel';
import DebugPanel from './components/DebugPanel';
import { AIChatPanelWrapper } from './components/AIChatPanelWrapper';
import ProblemsPanel from './ProblemsPanel';
import SymbolsPanel from './SymbolsPanel';
import { ThemeProvider, useTheme } from './ThemeContext';
import { AdvancedThemeProvider } from './AdvancedThemeContext';
import { FileEntry } from './types';
import { Problem, ProblemSeverity } from './diagnostics/types';
import './styles/App.clean.css';

interface Tab {
  id: string;
  name: string;
  content: string;
  language: string;
  filePath?: string;
  isModified?: boolean;
}

const AppContent: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  // Core state
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  
  // Panel visibility
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [isTerminalVisible, setIsTerminalVisible] = useState<boolean>(false);
  const [isCommandPaletteVisible, setIsCommandPaletteVisible] = useState<boolean>(false);
  const [isQuickOpenVisible, setIsQuickOpenVisible] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'debug' | 'ai'>('explorer');
  
  // Problems/Diagnostics
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isProblemsVisible, setIsProblemsVisible] = useState<boolean>(false);
  const [isOutlineVisible, setIsOutlineVisible] = useState<boolean>(false);
  const [outlineSymbols, setOutlineSymbols] = useState<any[]>([]);
  
  const editorRef = React.useRef<any>(null);
  
  const activeTab = tabs.find(t => t.id === activeTabId);
  
  // Get Monaco diagnostics
  useEffect(() => {
    let dispose: monaco.IDisposable | undefined;
    const updateProblems = () => {
      const allMarkers: Problem[] = [];
      const model = monaco.editor.getModels();
      model.forEach(m => {
        const markers = monaco.editor.getModelMarkers({ resource: m.uri });
        markers.forEach((marker) => {
          allMarkers.push({
            id: `${m.uri.toString()}-${marker.startLineNumber}-${marker.startColumn}`,
            filePath: m.uri.toString().replace('file:///', ''),
            startLine: marker.startLineNumber,
            startColumn: marker.startColumn,
            endLine: marker.endLineNumber,
            endColumn: marker.endColumn,
            message: marker.message,
            severity: marker.severity === monaco.MarkerSeverity.Error ? ProblemSeverity.Error : 
                     marker.severity === monaco.MarkerSeverity.Warning ? ProblemSeverity.Warning : ProblemSeverity.Info,
            source: marker.source || 'Monaco'
          });
        });
      });
      setProblems(allMarkers);
    };

    dispose = monaco.editor.onDidChangeMarkers(updateProblems);
    return () => dispose?.dispose();
  }, []);

  // Load workspace
  const loadWorkspaceFiles = async (folderPath: string) => {
    if (!window.primus?.fs?.readDir) return;
    try {
      const entries = await window.primus.fs.readDir(folderPath);
      setFiles(entries);
      setCurrentFolder(folderPath);
    } catch (err) {
      console.error('Failed to load workspace:', err);
    }
  };

  // Open file
  const openFile = async (filePath: string) => {
    if (!window.primus?.fs?.readFile) return;
    
    // Check if already open
    const existingTab = tabs.find(t => t.filePath === filePath);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    try {
      const content = await window.primus.fs.readFile(filePath);
      const fileName = filePath.split(/[\\/]/).pop() || 'untitled';
      const newTab: Tab = {
        id: Date.now().toString(),
        name: fileName,
        content,
        language: getLanguageFromFileName(fileName),
        filePath
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'typescript', 'tsx': 'typescript', 'js': 'javascript', 
      'jsx': 'javascript', 'py': 'python', 'json': 'json',
      'html': 'html', 'css': 'css', 'md': 'markdown'
    };
    return langMap[ext || ''] || 'plaintext';
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const saveFile = async () => {
    if (!activeTab?.filePath || !window.primus?.fs?.writeFile) return;
    try {
      await window.primus.fs.writeFile(activeTab.filePath, activeTab.content);
      setTabs(prev => prev.map(t => 
        t.id === activeTabId ? { ...t, isModified: false } : t
      ));
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsCommandPaletteVisible(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsTerminalVisible(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Open folder
  const handleOpenFolder = async () => {
    if (!window.primus?.dialog?.showOpenDialog) return;
    try {
      const result = await window.primus.dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      if (result && Array.isArray(result) && result.length > 0) {
        await loadWorkspaceFiles(result[0]);
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  };

  const errorCount = problems.filter(p => p.severity === 'error').length;
  const warningCount = problems.filter(p => p.severity === 'warning').length;

  return (
    <div className="app-container">
      {/* Activity Bar - Left most column */}
      <div className="activity-bar">
        <div className="activity-items">
          <button 
            className={`activity-item ${activeView === 'explorer' ? 'active' : ''}`}
            onClick={() => setActiveView('explorer')}
            title="Explorer (Ctrl+Shift+E)"
          >
            <svg width="24" height="24" viewBox="0 0 16 16">
              <path fill="currentColor" d="M14.5 2H7.71l-.85-.85L6.51 1h-5l-.5.5v11l.5.5H7v-1H1.5V2h4.79l.85.85.35.15h7v10h-2v1h2.5l.5-.5v-11l-.5-.5z"/>
            </svg>
          </button>
          <button 
            className={`activity-item ${activeView === 'search' ? 'active' : ''}`}
            onClick={() => setActiveView('search')}
            title="Search (Ctrl+Shift+F)"
          >
            <svg width="24" height="24" viewBox="0 0 16 16">
              <path fill="currentColor" d="M11.5 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 1a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
              <path fill="currentColor" d="M10.146 10.146a.5.5 0 0 0 .708.708l2 2a.5.5 0 0 0 .708-.708l-2-2z"/>
            </svg>
          </button>
          <button 
            className={`activity-item ${activeView === 'git' ? 'active' : ''}`}
            onClick={() => setActiveView('git')}
            title="Source Control (Ctrl+Shift+G)"
          >
            <svg width="24" height="24" viewBox="0 0 16 16">
              <path fill="currentColor" d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 1 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 0 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 0 1 1-1h8zM5 12.25v3.25a.25.25 0 0 0 .4.2l1.45-1.087a.25.25 0 0 1 .3 0L8.6 15.7a.25.25 0 0 0 .4-.2v-3.25a.25.25 0 0 0-.25-.25h-3.5a.25.25 0 0 0-.25.25z"/>
            </svg>
          </button>
          <button 
            className={`activity-item ${activeView === 'debug' ? 'active' : ''}`}
            onClick={() => setActiveView('debug')}
            title="Run and Debug (Ctrl+Shift+D)"
          >
            <svg width="24" height="24" viewBox="0 0 16 16">
              <path fill="currentColor" d="M8 0a.5.5 0 0 1 .5.5v.577l2.4-2.4a.5.5 0 1 1 .707.707L9.367 1.625a8 8 0 0 1 5.517 5.517l2.241-2.242a.5.5 0 1 1 .707.707l-2.4 2.4h.577a.5.5 0 0 1 0 1h-.577l2.4 2.4a.5.5 0 0 1-.707.707l-2.241-2.242a8 8 0 0 1-5.517 5.517l2.24 2.241a.5.5 0 0 1-.707.707l-2.4-2.4V16a.5.5 0 0 1-1 0v-.577l-2.4 2.4a.5.5 0 0 1-.707-.707l2.242-2.241A8 8 0 0 1 1.625 9.358l-2.242 2.241a.5.5 0 1 1-.707-.707l2.4-2.4H.5a.5.5 0 0 1 0-1h.577l-2.4-2.4a.5.5 0 0 1 .707-.707l2.241 2.242A8 8 0 0 1 6.642 1.625L4.4-.616a.5.5 0 0 1 .707-.707l2.4 2.4V.5A.5.5 0 0 1 8 0z"/>
            </svg>
          </button>
          <button 
            className={`activity-item ${activeView === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveView('ai')}
            title="AI Assistant (Ctrl+Shift+A)"
          >
            <svg width="24" height="24" viewBox="0 0 16 16">
              <path fill="currentColor" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484-.08.08-.162.158-.242.234-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 0 2.04 4.327z"/>
            </svg>
          </button>
        </div>
        <div className="activity-items-bottom">
          <button 
            className="activity-item"
            onClick={() => {}}
            title="Settings (Ctrl+,)"
          >
            <svg width="24" height="24" viewBox="0 0 16 16">
              <path fill="currentColor" d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path fill="currentColor" d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
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
              {activeView === 'debug' && 'RUN AND DEBUG'}
              {activeView === 'ai' && 'AI ASSISTANT'}
            </h3>
            <div className="sidebar-actions">
              <button onClick={handleOpenFolder} title="Open Folder">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path fill="currentColor" d="M14.5 2H7.71l-.85-.85L6.51 1h-5l-.5.5v11l.5.5H7v-1H1.5V2h4.79l.85.85.35.15h7v10h-2v1h2.5l.5-.5v-11l-.5-.5z"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="sidebar-content">
            {activeView === 'explorer' && (
              <FileExplorer
                onFileSelect={openFile}
                rootPath={currentFolder}
              />
            )}
            {activeView === 'search' && (
              <SearchPanel
                isVisible={true}
                onToggle={() => {}}
                onOpenFile={(path, line) => openFile(path)}
              />
            )}
            {activeView === 'git' && (
              <SimpleGitPanel isVisible={true} onToggle={() => {}} />
            )}
            {activeView === 'debug' && (
              <DebugPanel />
            )}
            {activeView === 'ai' && (
              <AIChatPanelWrapper
                isVisible={true}
                onToggle={() => {}}
                currentContext={activeTab ? {
                  filePath: activeTab.filePath || activeTab.name,
                  content: activeTab.content,
                  language: activeTab.language,
                  cursorPosition: { line: 1, column: 1 }
                } : undefined}
              />
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="main-content">
        {/* Editor Area */}
        <div className="editor-area">
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
                    <svg className="tab-icon" width="16" height="16" viewBox="0 0 16 16">
                      <path fill="currentColor" d="M13.5 1h-11l-.5.5v13l.5.5h11l.5-.5v-13l-.5-.5zM13 14H3V2h10v12z"/>
                    </svg>
                    <span className="tab-label">{tab.name}</span>
                    {tab.isModified && <span className="tab-modified">●</span>}
                    <button 
                      className="tab-close"
                      onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Breadcrumb */}
              {activeTab?.filePath && (
                <div className="breadcrumb">
                  <span className="breadcrumb-text">{activeTab.filePath}</span>
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
                        tab.id === activeTabId ? { ...tab, content: value, isModified: true } : tab
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
                <h2>AI-Powered Code Editor</h2>
                <div className="welcome-actions">
                  <button className="welcome-button primary" onClick={handleOpenFolder}>
                    <svg width="20" height="20" viewBox="0 0 16 16">
                      <path fill="currentColor" d="M14.5 2H7.71l-.85-.85L6.51 1h-5l-.5.5v11l.5.5H7v-1H1.5V2h4.79l.85.85.35.15h7v10h-2v1h2.5l.5-.5v-11l-.5-.5z"/>
                    </svg>
                    Open Folder
                  </button>
                  <button className="welcome-button" onClick={() => {}}>
                    New File
                  </button>
                </div>
                <div className="welcome-shortcuts">
                  <h3>Quick Actions</h3>
                  <div className="shortcut-item">
                    <span>Command Palette</span>
                    <kbd>Ctrl+P</kbd>
                  </div>
                  <div className="shortcut-item">
                    <span>Toggle Terminal</span>
                    <kbd>Ctrl+`</kbd>
                  </div>
                  <div className="shortcut-item">
                    <span>Toggle Sidebar</span>
                    <kbd>Ctrl+B</kbd>
                  </div>
                  <div className="shortcut-item">
                    <span>Save File</span>
                    <kbd>Ctrl+S</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Panel (Terminal, Problems, etc.) */}
        {isTerminalVisible && (
          <div className="bottom-panel">
            <div className="panel-tabs">
              <button className="panel-tab active">
                TERMINAL
              </button>
              <button className="panel-tab" onClick={() => setIsProblemsVisible(true)}>
                PROBLEMS {errorCount + warningCount > 0 && `(${errorCount + warningCount})`}
              </button>
              <button className="panel-tab" onClick={() => setIsOutlineVisible(true)}>
                OUTPUT
              </button>
              <button className="panel-close" onClick={() => setIsTerminalVisible(false)}>
                ×
              </button>
            </div>
            <div className="panel-content">
              <Terminal isVisible={true} onToggle={() => {}} />
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar 
        activeFile={activeTab?.name}
        language={activeTab?.language}
        lineCount={activeTab?.content.split('\n').length}
        onOpenThemeCustomizer={() => {}}
        problemsErrorCount={errorCount}
        problemsWarningCount={warningCount}
        onProblemsClick={() => setIsProblemsVisible(true)}
        problemsEnabled={true}
      />

      {/* Command Palette */}
      <CommandPalette 
        isVisible={isCommandPaletteVisible}
        onClose={() => setIsCommandPaletteVisible(false)}
      />

      {/* Quick Open */}
      <QuickOpen
        isVisible={isQuickOpenVisible}
        onClose={() => setIsQuickOpenVisible(false)}
        onOpenFile={(path) => openFile(path)}
      />

      {/* Problems Panel */}
      {isProblemsVisible && (
        <ProblemsPanel
          problems={problems}
          isVisible={isProblemsVisible}
          enabled={true}
          onSelectProblem={(p: Problem) => {
            if (p.filePath) openFile(p.filePath);
          }}
          onClose={() => setIsProblemsVisible(false)}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AdvancedThemeProvider>
        <AppContent />
      </AdvancedThemeProvider>
    </ThemeProvider>
  );
};
