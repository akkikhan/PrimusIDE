import React, { useState, useEffect } from 'react';
import * as monaco from 'monaco-editor';
import { MonacoEditor } from './MonacoEditor';
import { StatusBar } from './StatusBar';
import Terminal from './Terminal';
import SearchPanel from './SearchPanel';
import SettingsPanel from './SettingsPanel';
import PluginSystem from './PluginSystem';
import KeyboardShortcuts from './KeyboardShortcuts';
import MenuBar from './MenuBar';
import FileExplorer from './FileExplorer';
import ActivityBar from './ActivityBar';
import CommandPalette from './CommandPalette';
import { QuickOpen } from './QuickOpen';
import { globalCommandRegistry } from './commanding/CommandRegistry';
import MinimapToggle from './MinimapToggle';
import Breadcrumb from './Breadcrumb';
import QuickSettings from './QuickSettings';
import { SimpleGitPanel } from './SimpleGitPanel';
import DebugPanel from './components/DebugPanel';
import ProjectManager from './ProjectManager';
import QuickLaunch from './QuickLaunch';
import SplitViewEditor from './SplitViewEditor';
import { AIChatPanelWrapper } from './components/AIChatPanelWrapper';
import CodeChangesPanel from './components/CodeChangesPanel';
import { ContextPanel } from './components/ContextPanel';
// import CodeIntelligence from './CodeIntelligence';
// import { AdvancedAIChatInterface } from './components/AdvancedAIChatInterface';
import { AISettings } from './AISettings';
import { AIAssistantPanel } from './AIAssistantPanel'; // retained temporarily (legacy)
import AssistantPanel from './components/AssistantPanel/AssistantPanel';
import { ThemeProvider, useTheme, Theme } from './ThemeContext';
import { AdvancedThemeProvider } from './AdvancedThemeContext';
import { ThemeCustomizer } from './components/ThemeCustomizer';
import { FileEntry, SettingsData } from './types';
import './styles/file-explorer.css';
import './styles/activity-bar.css';
import './styles/command-palette.css';
import './styles/breadcrumb.css';
import './styles/quick-settings.css';
import './styles/GitPanel.css';
import './styles/DebugPanel.css';
import './styles/ProjectManager.css';
import './styles/CodeIntelligence.css';
import './styles/QuickLaunch.css';
import './styles/SplitViewEditor.css';
import './styles/AIChatPanel.css';
import './styles/CodeChangesPanel.css';
import './styles/CodeDiffViewer.css';
import './components/ContextPanel.css';
import { InlineCompletionProvider } from './InlineCompletionProvider';
import { ProjectIndexer } from './indexing/ProjectIndexer';
import { RecentProjectsManager } from './managers/RecentProjectsManager';
import Welcome from './Welcome';
import './styles/Welcome.css';
import SymbolsPanel from './SymbolsPanel';
import ProblemsPanel from './ProblemsPanel';
import { Problem, defaultProblemsSettings, ProblemSeverity } from './diagnostics/types';
import { QuickAIPromptBar } from './components/QuickAIPromptBar';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import { AIStatsPanel } from './components/AIStatsPanel';
import './components/styles/AIStatsPanel.css';
import ReindexProgressPanel from './components/ReindexProgressPanel';
import { PatchPanel } from './components/PatchPanel/PatchPanel';

interface Tab {
  id: string;
  name: string;
  content: string;
  language: string;
  filePath?: string;
  isModified?: boolean;
}

const AppContent: React.FC = () => {
  const { theme, effectiveTheme, setTheme, toggleTheme } = useTheme();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [isTerminalVisible, setIsTerminalVisible] = useState<boolean>(false);
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);
  const [isPluginSystemVisible, setIsPluginSystemVisible] = useState<boolean>(false);
  const [isKeyboardShortcutsVisible, setIsKeyboardShortcutsVisible] = useState<boolean>(false);
  const [isCommandPaletteVisible, setIsCommandPaletteVisible] = useState<boolean>(false);
  const [isQuickOpenVisible, setIsQuickOpenVisible] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<string>('explorer');
  const [isMinimapEnabled, setIsMinimapEnabled] = useState<boolean>(false);
  const [isQuickSettingsVisible, setIsQuickSettingsVisible] = useState<boolean>(false);
  const [isGitPanelVisible, setIsGitPanelVisible] = useState<boolean>(false);
  const [isDebugPanelVisible, setIsDebugPanelVisible] = useState<boolean>(false);
  const [isProjectManagerVisible, setIsProjectManagerVisible] = useState<boolean>(false);
  const [isCodeIntelligenceVisible, setIsCodeIntelligenceVisible] = useState<boolean>(false);
  const [isQuickLaunchVisible, setIsQuickLaunchVisible] = useState<boolean>(false);
  const [isSplitViewVisible, setIsSplitViewVisible] = useState<boolean>(false);
  const [splitPrimaryTab, setSplitPrimaryTab] = useState<Tab | null>(null);
  const [splitSecondaryTab, setSplitSecondaryTab] = useState<Tab | null>(null);
  const [isAIChatVisible, setIsAIChatVisible] = useState<boolean>(false);
  const [isAdvancedAIChatVisible, setIsAdvancedAIChatVisible] = useState<boolean>(false);
  const [isAISettingsVisible, setIsAISettingsVisible] = useState<boolean>(false);
  const [isAIAssistantVisible, setIsAIAssistantVisible] = useState<boolean>(false);
  const [isContextPanelVisible, setIsContextPanelVisible] = useState<boolean>(false);
  const [isThemeCustomizerVisible, setIsThemeCustomizerVisible] = useState<boolean>(false);
  const [isOutlineVisible, setIsOutlineVisible] = useState<boolean>(false); // outline panel visibility
  const [isProblemsVisible, setIsProblemsVisible] = useState<boolean>(false); // problems panel visibility
  const [problemsEnabled, setProblemsEnabled] = useState<boolean>(defaultProblemsSettings.enabled);
  const [problems, setProblems] = useState<Problem[]>([]); // diagnostics data (populated later)
  const [outlineSymbols, setOutlineSymbols] = useState<any[]>([]);
  const [isQuickAIBarVisible, setIsQuickAIBarVisible] = useState<boolean>(true); // default visible for discoverability
  const [isDiagnosticsVisible, setIsDiagnosticsVisible] = useState<boolean>(false);
  const [isAIStatsVisible, setIsAIStatsVisible] = useState<boolean>(false);
  const [isReindexPanelVisible, setIsReindexPanelVisible] = useState<boolean>(false);
  const [isPatchPanelVisible, setIsPatchPanelVisible] = useState<boolean>(false);
  const editorRef = React.useRef<any>(null);

  useEffect(() => {
    if (currentFolder && window.electron && window.electron.send) {
      window.electron.send('watcher:start', currentFolder);
    }
    return () => {
      if (currentFolder && window.electron && window.electron.send) {
        window.electron.send('watcher:stop', null);
      }
    };
  }, [currentFolder]);

  useEffect(() => {
    if (window.electron && window.electron.receive) {
      window.electron.receive('file-changed', (data: { event: string, path: string }) => {
        
        // You can trigger a refresh of the file explorer here
        loadWorkspaceFiles(currentFolder);
      });
    }
  }, [currentFolder]);

  useEffect(() => {
    const indexer = ProjectIndexer.getInstance();
    if (currentFolder) {
      indexer.startIndexing(currentFolder);
      RecentProjectsManager.addProject(currentFolder);
    }
  }, [currentFolder]);

  // Collect Monaco diagnostics (markers) -> problems state (Task 9.3)
  useEffect(() => {
    if (!problemsEnabled) return; // do not register listener if disabled
    let dispose: monaco.IDisposable | undefined;
    let frame: number | undefined;
    const debounceDelay = 120; // ms
    let timer: any;

    const collect = () => {
      if (!problemsEnabled) return;
      const startTs = performance.now();
      const models = monaco.editor.getModels();
      const aggregated: Problem[] = [];
      for (const model of models) {
        const uri = model.uri;
        const markers = monaco.editor.getModelMarkers({ resource: uri });
        for (const m of markers) {
          const sev = m.severity === monaco.MarkerSeverity.Error ? ProblemSeverity.Error
            : m.severity === monaco.MarkerSeverity.Warning ? ProblemSeverity.Warning
            : m.severity === monaco.MarkerSeverity.Info ? ProblemSeverity.Info
            : ProblemSeverity.Hint;
          aggregated.push({
            id: `${uri.toString()}:${m.startLineNumber}:${m.startColumn}:${m.message}`,
            filePath: uri.fsPath || uri.path,
            message: m.message,
            severity: sev,
            startLine: m.startLineNumber,
            startColumn: m.startColumn,
            endLine: m.endLineNumber,
            endColumn: m.endColumn,
            code: typeof m.code === 'string' ? m.code : (m.code?.value),
            source: m.source
          });
        }
      }
      setProblems(aggregated);
      const dur = performance.now() - startTs;
      if (aggregated.length >= 500) {
        console.log(`[Problems] Collected ${aggregated.length} markers in ${dur.toFixed(1)}ms`);
      }
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(collect);
      }, debounceDelay);
    };

    dispose = monaco.editor.onDidChangeMarkers(schedule);
    // initial collection
    schedule();

    return () => {
      dispose?.dispose();
      if (timer) clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [problemsEnabled]);

  // Clear problems when disabled
  useEffect(() => {
    if (!problemsEnabled) {
      setProblems([]);
    }
  }, [problemsEnabled]);

  useEffect(() => {
    // Register the inline completion provider
    const completionProvider = new InlineCompletionProvider();
    const disposable = monaco.languages.registerInlineCompletionsProvider(
      { pattern: '**' },
      completionProvider
    );

    return () => {
      disposable.dispose();
    };
  }, []);

  useEffect(()=>{
    const openStats = () => setIsAIStatsVisible(true);
    const toggleReindex = () => setIsReindexPanelVisible(v=>!v);
    window.addEventListener('ai.stats.open', openStats as any);
    window.addEventListener('retrieval.reindex.toggle', toggleReindex as any);
    return () => window.removeEventListener('ai.stats.open', openStats as any);
  }, []);

  useEffect(() => {
    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setIsTerminalVisible(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setIsSearchVisible(prev => !prev);
      } else if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setIsSettingsVisible(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        setIsPluginSystemVisible(prev => !prev);
      } else if (e.ctrlKey && e.key === 'K' && e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        setIsKeyboardShortcutsVisible(prev => !prev);
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsQuickOpenVisible(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsCommandPaletteVisible(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        // toggle outline panel via keyboard
        setActiveView('outline');
        setIsOutlineVisible(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setIsThemeCustomizerVisible(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        setIsQuickLaunchVisible(prev => !prev);
      } else if (e.ctrlKey && e.key === '\\') {
        e.preventDefault();
        toggleSplitView();
      } else if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsAIChatVisible(prev => !prev);
      } else if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsAdvancedAIChatVisible(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        setIsAIAssistantVisible(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        setIsGitPanelVisible(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsDebugPanelVisible(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setActiveView('context');
      } else if (e.ctrlKey && e.key === 'k' && e.ctrlKey) {
        // Ctrl+K prefix - wait for next key
        e.preventDefault();
        const handleSecondKey = (e2: KeyboardEvent) => {
          if (e2.key === 't' || e2.key === 'T') {
            e2.preventDefault();
            toggleTheme();
          }
          document.removeEventListener('keydown', handleSecondKey);
        };
        document.addEventListener('keydown', handleSecondKey);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    // Load current workspace files
    loadWorkspaceFiles();
  }, []);

  const loadWorkspaceFiles = async (folderPath?: string) => {
    const path = folderPath || currentFolder;
    if (!path) return;
    try {
      const entries = await window.primus.fs.readDir(path);
      setFiles(entries);
    } catch (error) {
      console.warn('Could not load workspace files:', error);
    }
  };

  const handleOpenFolder = async () => {
    try {
      if (!window.primus || !window.primus.fs || !window.primus.fs.selectFolder) {
        console.warn('Primus file system API not available');
        return;
      }
      
      const folderPath = await window.primus.fs.selectFolder();
      if (folderPath) {
        setCurrentFolder(folderPath);
        loadWorkspaceFiles(folderPath);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx': case 'ts': return 'typescript';
      case 'jsx': case 'js': return 'javascript';
      case 'json': return 'json';
      case 'css': return 'css';
      case 'md': return 'markdown';
      default: return 'plaintext';
    }
  };

  const openFile = async (file: FileEntry) => {
    const existingTab = tabs.find(tab => tab.filePath === file.path);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    try {
      const content = await window.primus.fs.readFile(file.path);
      const newTab: Tab = {
        id: Date.now().toString(),
        name: file.name,
        content,
        language: getLanguageFromFileName(file.name),
        filePath: file.path
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (error) {
      console.error('Failed to load file:', error);
      // Fallback to mock content
      const newTab: Tab = {
        id: Date.now().toString(),
        name: file.name,
        content: `// Content of ${file.name}\n// Failed to load actual file: ${error}`,
        language: getLanguageFromFileName(file.name),
        filePath: file.path
      };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const closeTab = (id: string) => {
    setTabs(prev => prev.filter(tab => tab.id !== id));
    if (activeTabId === id) {
      const remaining = tabs.filter(tab => tab.id !== id);
      setActiveTabId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  const openFileAtLine = async (filePath: string, line?: number) => {
    try {
      // Check if file is already open
      const existingTab = tabs.find(tab => tab.filePath === filePath);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        // TODO: Navigate to specific line in Monaco editor
        return;
      }

      // Load file content
      const content = await window.primus.fs.readFile(filePath);
      const fileName = filePath.split(/[/\\]/).pop() || 'untitled';
      const language = getLanguageFromFileName(fileName);
      
      const newTab: Tab = {
        id: Date.now().toString(),
        name: fileName,
        content,
        language,
        filePath
      };

      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      
      // TODO: Navigate to specific line if provided
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Create current context for AI
  const currentContext = activeTab ? {
    filePath: activeTab.filePath || activeTab.name,
    content: activeTab.content,
    language: activeTab.language,
    cursorPosition: { line: 1, column: 1 }, // TODO: Get actual cursor position from Monaco
    selection: undefined // TODO: Get actual selection from Monaco
  } : undefined;

  const handleNewFile = () => {
    const newTab: Tab = {
      id: Date.now().toString(),
      name: 'Untitled',
      content: '',
      language: 'plaintext'
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleOpenFile = async () => {
    try {
      // Open file dialog
      const filePaths = await window.primus.dialog.showOpenDialog({
        title: 'Open File',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text Files', extensions: ['txt', 'md', 'json', 'xml', 'csv'] },
          { name: 'Web Files', extensions: ['html', 'css', 'js', 'ts', 'jsx', 'tsx'] },
          { name: 'Config Files', extensions: ['json', 'yml', 'yaml', 'toml', 'ini'] },
        ]
      });

      if (filePaths && filePaths.length > 0) {
        for (const filePath of filePaths) {
          await openFileAtLine(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const handleSaveFile = async () => {
    if (!activeTab) {
      console.warn('No active tab to save');
      return;
    }

    try {
      if (activeTab.filePath) {
        // Save existing file
        await window.primus.fs.writeFile(activeTab.filePath, activeTab.content);
        
        // Update tab to remove "modified" indicator if implemented
        setTabs(prev => prev.map(tab =>
          tab.id === activeTabId ? { ...tab, isModified: false } : tab
        ));
      } else {
        // Save as new file - open file dialog
        await handleSaveAsFile();
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const handleSaveAsFile = async () => {
    if (!activeTab) return;

    try {
      // Get save path from user
      const savePath = await window.primus.dialog.showSaveDialog({
        title: 'Save File As',
        defaultPath: activeTab.name,
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'TypeScript', extensions: ['ts', 'tsx'] },
          { name: 'JavaScript', extensions: ['js', 'jsx'] },
          { name: 'JSON', extensions: ['json'] },
          { name: 'CSS', extensions: ['css'] },
          { name: 'Markdown', extensions: ['md'] },
        ]
      });

      if (savePath) {
        await window.primus.fs.writeFile(savePath, activeTab.content);
        
        // Update tab with new file path
        const fileName = savePath.split(/[/\\]/).pop() || 'untitled';
        setTabs(prev => prev.map(tab =>
          tab.id === activeTabId 
            ? { ...tab, name: fileName, filePath: savePath, isModified: false }
            : tab
        ));

      }
    } catch (error) {
      console.error('Failed to save file as:', error);
    }
  };

  const getLanguageFromExtension = (extension: string): string => {
    switch (extension.toLowerCase()) {
      case 'tsx': case 'ts': return 'typescript';
      case 'jsx': case 'js': return 'javascript';
      case 'json': return 'json';
      case 'css': return 'css';
      case 'md': return 'markdown';
      default: return 'plaintext';
    }
  };

  // Split View Functions
  const toggleSplitView = () => {
    if (!isSplitViewVisible) {
      // Initialize split view with current tab
      if (activeTab) {
        setSplitPrimaryTab(activeTab);
        setSplitSecondaryTab(null);
      }
      setIsSplitViewVisible(true);
    } else {
      setIsSplitViewVisible(false);
    }
  };

  const handleSplitTabChange = (side: 'primary' | 'secondary', content: string) => {
    if (side === 'primary' && splitPrimaryTab) {
      const updatedTab = { ...splitPrimaryTab, content, isModified: true };
      setSplitPrimaryTab(updatedTab);
      // Update in main tabs as well
      setTabs(prev => prev.map(tab => 
        tab.id === updatedTab.id ? updatedTab : tab
      ));
    } else if (side === 'secondary' && splitSecondaryTab) {
      const updatedTab = { ...splitSecondaryTab, content, isModified: true };
      setSplitSecondaryTab(updatedTab);
      // Update in main tabs as well
      setTabs(prev => prev.map(tab => 
        tab.id === updatedTab.id ? updatedTab : tab
      ));
    }
  };

  const handleSplitTabSwap = () => {
    const temp = splitPrimaryTab;
    setSplitPrimaryTab(splitSecondaryTab);
    setSplitSecondaryTab(temp);
  };

  const handleSplitSyncScroll = (enabled: boolean) => {
    
    // TODO: Implement synchronized scrolling
  };

  const handleSplitLayoutChange = (layout: 'horizontal' | 'vertical') => {
    
  };

  const handleSettingsChange = (settings: Partial<SettingsData>) => {
    // Update editor settings based on new settings
    
    // This would typically update Monaco editor configuration
    // and persist settings to storage
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    
    // Reset all panel visibility
    setIsSearchVisible(false);
    setIsSettingsVisible(false);
    setIsPluginSystemVisible(false);
    setIsTerminalVisible(false);
    setIsGitPanelVisible(false);
    setIsContextPanelVisible(false);
    setIsProjectManagerVisible(false);
    setIsCodeIntelligenceVisible(false);
    
    // Show the selected panel
    switch (view) {
      case 'search':
        setIsSearchVisible(true);
        break;
      case 'outline':
        setIsOutlineVisible(true);
        break;
      case 'settings':
        setIsSettingsVisible(true);
        break;
      case 'extensions':
        setIsPluginSystemVisible(true);
        break;
      case 'terminal':
        setIsTerminalVisible(true);
        break;
      case 'git':
        setIsGitPanelVisible(true);
        break;
      case 'context':
        setIsContextPanelVisible(true);
        break;
      case 'debug':
        setIsDebugPanelVisible(true);
        break;
    }
  };

  // Legacy static commands array kept for reference; now we register them dynamically.
  const commands = [
    {
      id: 'file.new',
      title: 'New File',
      category: 'File',
      keybinding: 'Ctrl+N',
      action: () => handleNewFile()
    },
    {
      id: 'file.open',
      title: 'Open File',
      category: 'File', 
      keybinding: 'Ctrl+O',
      action: () => handleOpenFile()
    },
    {
      id: 'file.save',
      title: 'Save File',
      category: 'File',
      keybinding: 'Ctrl+S',
      action: () => handleSaveFile()
    },
    {
      id: 'file.quickOpen',
      title: 'Quick Open File...',
      category: 'File',
      keybinding: 'Ctrl+P',
      action: () => setIsQuickOpenVisible(prev => !prev)
    },
    {
      id: 'view.terminal',
      title: 'Toggle Terminal',
      category: 'View',
      keybinding: 'Ctrl+`',
      action: () => setIsTerminalVisible(prev => !prev)
    },
    {
      id: 'view.search',
      title: 'Search Files',
      category: 'View',
      keybinding: 'Ctrl+Shift+F',
      action: () => setIsSearchVisible(prev => !prev)
    },
    {
      id: 'view.settings',
      title: 'Open Settings',
      category: 'View',
      keybinding: 'Ctrl+,',
      action: () => setIsSettingsVisible(prev => !prev)
    },
    {
      id: 'view.extensions',
      title: 'Show Extensions',
      category: 'View',
      keybinding: 'Ctrl+Shift+X',
      action: () => setIsPluginSystemVisible(prev => !prev)
    },
    {
      id: 'view.quicklaunch',
      title: 'Quick Launch',
      category: 'View',
      keybinding: 'Ctrl+Shift+L',
      action: () => setIsQuickLaunchVisible(prev => !prev)
    },
    {
      id: 'view.splitview',
      title: 'Toggle Split View',
      category: 'View',
      keybinding: 'Ctrl+\\',
      action: () => toggleSplitView()
    },
    {
      id: 'ai.chat',
      title: 'AI Assistant Chat',
      category: 'AI',
      keybinding: 'Ctrl+Shift+A',
      action: () => setIsAIChatVisible(prev => !prev)
    },
    {
      id: 'ai.advancedchat',
      title: 'Advanced AI Chat Interface',
      category: 'AI',
      keybinding: 'Ctrl+Alt+Shift+A',
      action: () => setIsAdvancedAIChatVisible(prev => !prev)
    },
    {
      id: 'ai.settings',
      title: 'AI Settings',
      category: 'AI',
      keybinding: 'Ctrl+Alt+A',
      action: () => setIsAISettingsVisible(prev => !prev)
    },
    {
      id: 'ai.assistant',
      title: 'AI Assistant',
      category: 'AI',
      keybinding: 'Ctrl+Shift+I',
      action: () => setIsAIAssistantVisible(prev => !prev)
    },
    {
      id: 'view.explorer',
      title: 'Show Explorer',
      category: 'View',
      action: () => setActiveView('explorer')
    },
    {
      id: 'help.shortcuts',
      title: 'Show Keyboard Shortcuts',
      category: 'Help',
      keybinding: 'Ctrl+K Ctrl+S',
      action: () => setIsKeyboardShortcutsVisible(prev => !prev)
    },
    {
      id: 'workspace.reload',
      title: 'Reload Window',
      category: 'Developer',
      keybinding: 'Ctrl+R',
      action: () => window.location.reload()
    },
    {
      id: 'theme.toggle',
      title: 'Toggle Theme',
      category: 'View',
      keybinding: 'Ctrl+K Ctrl+T',
      action: () => toggleTheme()
    },
    {
      id: 'theme.dark',
      title: 'Set Dark Theme',
      category: 'View',
      action: () => setTheme('dark')
    },
    {
      id: 'theme.light',
      title: 'Set Light Theme',
      category: 'View',
      action: () => setTheme('light')
    },
    {
      id: 'theme.auto',
      title: 'Set Auto Theme',
      category: 'View',
      action: () => setTheme('auto')
    },
    {
      id: 'view.toggleMinimap',
      title: 'Toggle Minimap',
      category: 'View',
      action: () => setIsMinimapEnabled(prev => !prev)
    },
    {
      id: 'git.showSourceControl',
      title: 'Show Source Control',
      category: 'Git',
      keybinding: 'Ctrl+Shift+G',
      action: () => {
        setIsGitPanelVisible(true);
        setActiveView('git');
      }
    },
    {
      id: 'git.togglePanel',
      title: 'Toggle Git Panel',
      category: 'Git',
      action: () => setIsGitPanelVisible(prev => !prev)
    },
    {
      id: 'project.showManager',
      title: 'Show Project Manager',
      category: 'Project',
      keybinding: 'Ctrl+Shift+P',
      action: () => setIsProjectManagerVisible(true)
    },
    // Code Intelligence temporarily disabled
    {
      id: 'view.quickSettings',
      title: 'Toggle Quick Settings',
      category: 'View',
      keybinding: 'Ctrl+Shift+,',
      action: () => setIsQuickSettingsVisible(prev => !prev)
    },
    {
      id: 'view.outline',
      title: 'Show Outline',
      category: 'View',
      keybinding: 'Ctrl+Shift+O',
      action: () => {
        setActiveView('outline');
        setIsOutlineVisible(true);
      }
    },
    {
      id: 'view.problems',
      title: problemsEnabled ? 'Show Problems' : 'Show Problems (Disabled)',
      category: 'View',
      keybinding: 'Ctrl+Shift+M',
      action: () => {
        setActiveView('problems');
        setIsProblemsVisible(true);
      }
    },
    {
      id: 'ai.quickPromptBar',
      title: 'Toggle Quick AI Prompt Bar',
      category: 'AI',
      action: () => setIsQuickAIBarVisible(prev => !prev)
    },
    {
      id: 'view.diagnostics',
      title: 'Toggle Diagnostics Panel',
      category: 'View',
      action: () => setIsDiagnosticsVisible(prev => !prev)
    }
    ,{
      id: 'ai.showLastContextTiming',
      title: 'AI: Show Last Context Timing',
      category: 'AI',
      description: 'Display the most recent context gather timing + per-module ms',
      action: () => {
        try {
          const ctx: any = (window as any)._lastAIContext;
          if(!ctx){ alert('No context gathered yet. Enable Ctx and send a prompt.'); return; }
          const total = ctx.totalMs != null ? ctx.totalMs + 'ms' : 'n/a';
          const mods = Array.isArray(ctx.moduleTimings) ? ctx.moduleTimings.map((m:any)=> `${m.id}:${m.ms}ms`).join(', ') : 'n/a';
          alert(`Last Context Gather\nTotal: ${total}\nModules: ${mods}`);
        } catch (e: any){ alert('Failed to read last context timings'); }
      }
    },{
      id: 'ai.openStats',
      title: 'AI: Open Provider Stats',
      category: 'AI',
      action: () => {
        window.dispatchEvent(new CustomEvent('ai.stats.open'));
      }
    },{
      id: 'ai.toggleAutoUpdate',
      title: 'AI: Toggle Auto Update',
      category: 'AI',
      action: () => {
        try {
          const current = localStorage.getItem('primus.settings');
          if(!current){ alert('No settings stored yet'); return; }
          const obj = JSON.parse(current);
          const enabled = !!(obj.app && obj.app.autoUpdateEnabled);
          obj.app = obj.app || {}; obj.app.autoUpdateEnabled = !enabled;
          localStorage.setItem('primus.settings', JSON.stringify(obj));
          alert('Auto Update now: '+(!enabled));
        } catch (e: any){ alert('Failed to toggle autoUpdate setting'); }
      }
    },{
      id: 'ai.openLastDiff',
      title: 'AI: Open Last Diff',
      category: 'AI',
      action: () => {
        window.dispatchEvent(new CustomEvent('quickAI.openDiff'));
      }
    },{
      id: 'ai.applyLastDiff',
      title: 'AI: Apply Last Diff',
      category: 'AI',
      action: () => {
        window.dispatchEvent(new CustomEvent('quickAI.applyDiff'));
      }
    },
    {
      id: 'ai.openPatchPanel',
      title: 'AI: Open Patch Review Panel',
      category: 'AI',
      action: () => setIsPatchPanelVisible(prev => !prev)
    }
  ];

  // Register commands with global registry (one-time)
  useEffect(() => {
    const disposers = commands.map(cmd => globalCommandRegistry.register(cmd));
    return () => { disposers.forEach(d => d()); };
  }, []);

  const handleOpenPath = (path: string) => {
    // Logic to open a folder or file
    // For now, assuming it's a folder
    setCurrentFolder(path);
    loadWorkspaceFiles(path);
  };

  if (!currentFolder) {
    return <Welcome onOpenFolder={handleOpenFolder} onOpenPath={handleOpenPath} onNewFile={handleNewFile} onOpenFile={handleOpenFile} />;
  }

  return (
    <div className={`app ${effectiveTheme}`}>
      <MenuBar
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onToggleTerminal={() => setIsTerminalVisible(prev => !prev)}
        onToggleSearch={() => setIsSearchVisible(prev => !prev)}
        onToggleSettings={() => setIsSettingsVisible(prev => !prev)}
        onTogglePlugins={() => setIsPluginSystemVisible(prev => !prev)}
        onShowKeyboardShortcuts={() => setIsKeyboardShortcutsVisible(prev => !prev)}
        onToggleAIChat={() => setIsAIChatVisible(prev => !prev)}
        onToggleAISettings={() => setIsAISettingsVisible(prev => !prev)}
        onToggleAIAssistant={() => setIsAIAssistantVisible(prev => !prev)}
      />
      <div className="ide-layout">
        <ActivityBar 
          activeView={activeView}
          onViewChange={handleViewChange}
        />
        <div className="sidebar">
          {activeView === 'explorer' && (
            <FileExplorer
              onFileSelect={async (filePath) => {
                // Convert file path to FileEntry and open it
                const fileName = filePath.split(/[/\\]/).pop() || 'untitled';
                const fileEntry: FileEntry = {
                  name: fileName,
                  path: filePath,
                  isDirectory: false
                };
                await openFile(fileEntry);
              }}
              rootPath={currentFolder || process.cwd()}
            />
          )}
          {activeView === 'git' && <SimpleGitPanel isVisible={true} onToggle={() => setActiveView('explorer')} rootPath={currentFolder} />}
          {activeView === 'context' && <ContextPanel isVisible={true} onClose={() => setActiveView('explorer')} />}
          {activeView === 'code-changes' && <CodeChangesPanel />}
          {activeView === 'debug' && <DebugPanel />}
          {activeView === 'outline' && (
            <SymbolsPanel
              isVisible={isOutlineVisible}
              activeFilePath={activeTab?.filePath}
              symbols={outlineSymbols}
              onSelectSymbol={(sym) => {
                if (editorRef.current?.revealOffset) {
                  editorRef.current.revealOffset(sym.position.start);
                } else if (editorRef.current?.revealLine) {
                  // Fallback rough line calc
                  const contentUntil = activeTab?.content.slice(0, sym.position.start) || '';
                  const line = contentUntil.split('\n').length;
                  editorRef.current.revealLine(line);
                }
              }}
              onClose={() => { setIsOutlineVisible(false); setActiveView('explorer'); }}
            />
          )}
          {activeView === 'problems' && (
            <ProblemsPanel
              isVisible={isProblemsVisible}
              problems={problems}
              enabled={problemsEnabled}
              onToggleEnabled={(next) => setProblemsEnabled(next)}
              onSelectProblem={async (p) => {
                // Ensure file is open
                let targetTab = tabs.find(t => t.filePath === p.filePath);
                if (!targetTab) {
                  try {
                    const content = await window.primus.fs.readFile(p.filePath);
                    const fileName = p.filePath.split(/[/\\]/).pop() || 'untitled';
                    targetTab = {
                      id: Date.now().toString(),
                      name: fileName,
                      content,
                      language: getLanguageFromFileName(fileName),
                      filePath: p.filePath
                    };
                    setTabs(prev => [...prev, targetTab!]);
                  } catch (e: any) {
                    console.warn('Failed to open file for problem navigation', e);
                    return;
                  }
                }
                setActiveTabId(targetTab.id);
                // Navigate in editor after a tick (wait for render)
                requestAnimationFrame(() => {
                  const editorHandle: any = editorRef.current;
                  const editor = editorHandle?.getEditor?.();
                  if (editor) {
                    editor.revealPositionInCenter({ lineNumber: p.startLine, column: p.startColumn });
                    editor.setPosition({ lineNumber: p.startLine, column: p.startColumn });
                    editor.focus();
                  } else if (editorHandle?.revealLine) {
                    editorHandle.revealLine(p.startLine);
                  }
                });
              }}
              onClose={() => { setIsProblemsVisible(false); setActiveView('explorer'); }}
            />
          )}
        </div>
        {isSearchVisible && (
          <SearchPanel
            isVisible={isSearchVisible}
            onToggle={() => setIsSearchVisible(prev => !prev)}
            onOpenFile={openFileAtLine}
          />
        )}
        {isSettingsVisible && (
          <SettingsPanel
            isVisible={isSettingsVisible}
            onToggle={() => setIsSettingsVisible(prev => !prev)}
            onSettingsChange={handleSettingsChange}
          />
        )}
        {isPluginSystemVisible && (
          <PluginSystem
            isVisible={isPluginSystemVisible}
            onToggle={() => setIsPluginSystemVisible(prev => !prev)}
          />
        )}
        <div className="editor-container">
          {tabs.length > 0 && (
            <>
              <div className="tab-bar">
                {tabs.map(tab => (
                  <div
                    key={tab.id}
                    className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <span className="tab-label">
                      {tab.name}
                      {tab.isModified && <span className="tab-modified">●</span>}
                    </span>
                    <button 
                      className="tab-close"
                      onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                      aria-label="Close tab"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <Breadcrumb filePath={activeTab?.filePath} />
            </>
          )}
          {activeTab ? (
            <MonacoEditor
              ref={editorRef}
              value={activeTab.content}
              language={activeTab.language}
              minimapEnabled={isMinimapEnabled}
              onChange={(value) => {
                setTabs(prev => prev.map(tab =>
                  tab.id === activeTabId ? { ...tab, content: value, isModified: true } : tab
                ));
              }}
            />
          ) : (
            <div className="welcome-message">
              <h2>Welcome to Primus IDE</h2>
              <p>Open a file from the explorer to start editing.</p>
            </div>
          )}
        </div>
      </div>
      <Terminal 
        isVisible={isTerminalVisible}
        onToggle={() => setIsTerminalVisible(prev => !prev)}
      />
      <StatusBar 
        activeFile={activeTab?.name}
        language={activeTab?.language}
        lineCount={activeTab?.content.split('\n').length}
        onOpenThemeCustomizer={() => setIsThemeCustomizerVisible(true)}
        problemsErrorCount={problems.filter(p => p.severity === 'error').length}
        problemsWarningCount={problems.filter(p => p.severity === 'warning').length}
        onProblemsClick={() => {
          setActiveView('problems');
          setIsProblemsVisible(true);
        }}
        problemsEnabled={problemsEnabled}
      />
      <SearchPanel 
        isVisible={isSearchVisible}
        onToggle={() => setIsSearchVisible(false)}
        onOpenFile={(filePath: string, line?: number) => console.log('Open file:', filePath, line)}
      />
      <SettingsPanel 
        isVisible={isSettingsVisible}
        onToggle={() => setIsSettingsVisible(false)}
        onSettingsChange={(settings) => handleSettingsChange(settings)}
      />
      <PluginSystem 
        isVisible={isPluginSystemVisible}
        onToggle={() => setIsPluginSystemVisible(false)}
      />
      <SimpleGitPanel isVisible={isGitPanelVisible} onToggle={() => setIsGitPanelVisible(false)} />
      <ContextPanel
        isVisible={isContextPanelVisible}
        onClose={() => setIsContextPanelVisible(false)}
      />
      <ProjectManager 
        isVisible={isProjectManagerVisible}
        onToggle={() => setIsProjectManagerVisible(false)}
      />
      {/* CodeIntelligence temporarily disabled in minimal build */}
      <KeyboardShortcuts 
        isVisible={isKeyboardShortcutsVisible}
        onClose={() => setIsKeyboardShortcutsVisible(false)}
      />
      <CommandPalette 
        isVisible={isCommandPaletteVisible}
        onClose={() => setIsCommandPaletteVisible(false)}
      />
      <QuickOpen
        isVisible={isQuickOpenVisible}
        onClose={() => setIsQuickOpenVisible(false)}
        onOpenFile={(path) => openFileAtLine(path)}
      />
      <QuickLaunch 
        isVisible={isQuickLaunchVisible}
        onToggle={() => setIsQuickLaunchVisible(false)}
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
        onShowGit={() => setIsGitPanelVisible(true)}
        onShowProjects={() => setIsProjectManagerVisible(true)}
        onShowIntelligence={() => setIsCodeIntelligenceVisible(true)}
        onToggleTerminal={() => setIsTerminalVisible(prev => !prev)}
        onToggleSettings={() => setIsSettingsVisible(prev => !prev)}
      />
      <SplitViewEditor 
        isVisible={isSplitViewVisible}
        onToggle={() => setIsSplitViewVisible(false)}
        primaryTab={splitPrimaryTab}
        secondaryTab={splitSecondaryTab}
        onTabChange={handleSplitTabChange}
        onTabSwap={handleSplitTabSwap}
        onSyncScroll={handleSplitSyncScroll}
        onLayoutChange={handleSplitLayoutChange}
      />
      <AIChatPanelWrapper 
        isVisible={isAIChatVisible}
        onToggle={() => setIsAIChatVisible(false)}
        currentContext={currentContext}
      />
      {/* AdvancedAIChatInterface disabled in minimal build */}
      {isAISettingsVisible && (
        <AISettings
          isOpen={isAISettingsVisible}
          onClose={() => setIsAISettingsVisible(false)}
        />
      )}
      {isAIAssistantVisible && (
        // New lightweight AI Assistant panel (Phase 1 mock). Legacy panel kept imported for rollback.
        <AssistantPanel />
      )}
      {isQuickSettingsVisible && (
        <QuickSettings
          isMinimapEnabled={isMinimapEnabled}
          onMinimapToggle={() => setIsMinimapEnabled(prev => !prev)}
          onSettingsClick={() => {
            setIsQuickSettingsVisible(false);
            setIsSettingsVisible(true);
          }}
        />
      )}
      <ThemeCustomizer
        isOpen={isThemeCustomizerVisible}
        onClose={() => setIsThemeCustomizerVisible(false)}
      />
      <QuickAIPromptBar visible={isQuickAIBarVisible} />
      <PatchPanel visible={isPatchPanelVisible} onClose={()=> setIsPatchPanelVisible(false)} />
      <DiagnosticsPanel isVisible={isDiagnosticsVisible} onClose={() => setIsDiagnosticsVisible(false)} />
      <AIStatsPanel visible={isAIStatsVisible} onClose={()=> setIsAIStatsVisible(false)} />
      <ReindexProgressPanel visible={isReindexPanelVisible} onClose={()=> setIsReindexPanelVisible(false)} />
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
