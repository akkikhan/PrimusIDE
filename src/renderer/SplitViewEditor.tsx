import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MonacoEditor, MonacoEditorHandle } from './MonacoEditor';
import { 
  GitCompare, 
  Code2, 
  Brain, 
  Sparkles, 
  RefreshCw as Sync,
  ArrowLeftRight,
  LayoutGrid,
  Zap,
  Eye,
  Settings
} from 'lucide-react';
import AIIntentInterface from './components/AIIntentInterface';
import { commandProcessor } from './ai/CommandProcessor';
import { Intent, IntentType } from './ai/IntentHandler';
import { CommandResult, EditorContext } from './ai/CommandProcessor';
import './components/SplitViewEditor.css';

interface SplitTab {
  id: string;
  name: string;
  content: string;
  language: string;
  filePath?: string;
  isModified?: boolean;
  aiSuggestions?: AISuggestion[];
  diffHighlights?: DiffHighlight[];
}

interface AISuggestion {
  id: string;
  line: number;
  type: 'optimization' | 'bug-fix' | 'improvement' | 'security';
  description: string;
  suggestedCode: string;
  confidence: number;
}

interface DiffHighlight {
  startLine: number;
  endLine: number;
  type: 'added' | 'removed' | 'modified';
  severity: 'low' | 'medium' | 'high';
}

interface SplitViewEditorProps {
  isVisible: boolean;
  onToggle: () => void;
  primaryTab: SplitTab | null;
  secondaryTab: SplitTab | null;
  onTabChange: (side: 'primary' | 'secondary', content: string) => void;
  onTabSwap: () => void;
  onSyncScroll: (enabled: boolean) => void;
  onLayoutChange: (layout: 'horizontal' | 'vertical') => void;
  onAIAnalysis?: (side: 'primary' | 'secondary') => void;
  onDiffComparison?: () => void;
  onSmartSync?: () => void;
}

const SplitViewEditor: React.FC<SplitViewEditorProps> = ({
  isVisible,
  onToggle,
  primaryTab,
  secondaryTab,
  onTabChange,
  onTabSwap,
  onSyncScroll,
  onLayoutChange,
  onAIAnalysis,
  onDiffComparison,
  onSmartSync
}) => {
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [syncScrollEnabled, setSyncScrollEnabled] = useState<boolean>(false);
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState<boolean>(true);
  const [diffMode, setDiffMode] = useState<boolean>(false);
  const [smartSyncMode, setSmartSyncMode] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    primary: AISuggestion[];
    secondary: AISuggestion[];
  }>({ primary: [], secondary: [] });
  
  // AI Intent Interface state
  const [intentInterfaceVisible, setIntentInterfaceVisible] = useState<boolean>(true);

  const primaryEditorRef = useRef<MonacoEditorHandle>(null);
  const secondaryEditorRef = useRef<MonacoEditorHandle>(null);

  // AI-powered code analysis
  const performAIAnalysis = useCallback(async (content: string, language: string): Promise<AISuggestion[]> => {
    // Simulated AI analysis - in real implementation, this would call an AI service
    const suggestions: AISuggestion[] = [];
    
    if (language === 'javascript' || language === 'typescript') {
      // Analyze for common patterns
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for console.log statements
        if (line.includes('console.log')) {
          suggestions.push({
            id: `console-${index}`,
            line: index + 1,
            type: 'improvement',
            description: 'Consider using a proper logging library instead of console.log',
            suggestedCode: line.replace('console.log', '// Use logger.info or similar'),
            confidence: 0.8
          });
        }

        // Check for var declarations
        if (line.trim().startsWith('var ')) {
          suggestions.push({
            id: `var-${index}`,
            line: index + 1,
            type: 'optimization',
            description: 'Use const or let instead of var for better scoping',
            suggestedCode: line.replace('var ', 'const '),
            confidence: 0.9
          });
        }

        // Check for == instead of ===
        if (line.includes(' == ') && !line.includes(' === ')) {
          suggestions.push({
            id: `equality-${index}`,
            line: index + 1,
            type: 'bug-fix',
            description: 'Use strict equality (===) instead of loose equality (==)',
            suggestedCode: line.replace(' == ', ' === '),
            confidence: 0.95
          });
        }
      });
    }

    return suggestions;
  }, []);

  // Smart diff comparison
  const performDiffAnalysis = useCallback((): DiffHighlight[] => {
    if (!primaryTab?.content || !secondaryTab?.content) return [];

    const primaryLines = primaryTab.content.split('\n');
    const secondaryLines = secondaryTab.content.split('\n');
    const highlights: DiffHighlight[] = [];

    const maxLines = Math.max(primaryLines.length, secondaryLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const primaryLine = primaryLines[i] || '';
      const secondaryLine = secondaryLines[i] || '';

      if (primaryLine !== secondaryLine) {
        if (!primaryLine && secondaryLine) {
          highlights.push({
            startLine: i + 1,
            endLine: i + 1,
            type: 'added',
            severity: 'medium'
          });
        } else if (primaryLine && !secondaryLine) {
          highlights.push({
            startLine: i + 1,
            endLine: i + 1,
            type: 'removed',
            severity: 'medium'
          });
        } else {
          highlights.push({
            startLine: i + 1,
            endLine: i + 1,
            type: 'modified',
            severity: 'low'
          });
        }
      }
    }

    return highlights;
  }, [primaryTab?.content, secondaryTab?.content]);

  // AI Analysis effect
  useEffect(() => {
    if (!aiAnalysisEnabled) return;

    const analyzeCode = async () => {
      const newSuggestions: {
        primary: AISuggestion[];
        secondary: AISuggestion[];
      } = { primary: [], secondary: [] };

      if (primaryTab?.content) {
        newSuggestions.primary = await performAIAnalysis(primaryTab.content, primaryTab.language);
      }

      if (secondaryTab?.content) {
        newSuggestions.secondary = await performAIAnalysis(secondaryTab.content, secondaryTab.language);
      }

      setAiSuggestions(newSuggestions);
    };

    const debounceTimeout = setTimeout(analyzeCode, 1000);
    return () => clearTimeout(debounceTimeout);
  }, [primaryTab?.content, secondaryTab?.content, aiAnalysisEnabled, performAIAnalysis]);

  // Diff highlights calculation
  const diffHighlights = useMemo(() => {
    return diffMode ? performDiffAnalysis() : [];
  }, [diffMode, performDiffAnalysis]);

  // Register command processor callbacks
  useEffect(() => {
    commandProcessor.registerCallback('splitView', () => {
      
    });

    commandProcessor.registerCallback('analyzeCode', async (content: string) => {
      setAiAnalysisEnabled(true);
      const analysis = await performAIAnalysis(content, 'javascript');
      return analysis;
    });

    commandProcessor.registerCallback('syncEditors', (enabled: boolean) => {
      setSyncScrollEnabled(enabled);
      setSmartSyncMode(enabled);
    });

    commandProcessor.registerCallback('compareFiles', () => {
      setDiffMode(true);
    });

    commandProcessor.registerCallback('changeLayout', (layout: string) => {
      setLayout(layout === 'vertical' ? 'vertical' : 'horizontal');
    });

    commandProcessor.registerCallback('formatCode', async () => {
      // Format code in active editor
      const activeEditor = primaryEditorRef.current || secondaryEditorRef.current;
      if (activeEditor?.getAction) {
        const formatAction = activeEditor.getAction('editor.action.formatDocument');
        if (formatAction) {
          formatAction.run();
        }
      }
    });

    commandProcessor.registerCallback('gotoLine', (lineNumber: number) => {
      const activeEditor = primaryEditorRef.current || secondaryEditorRef.current;
      if (activeEditor?.revealLine) {
        activeEditor.revealLine(lineNumber);
        activeEditor.setPosition({ lineNumber, column: 1 });
      }
    });

  }, [performAIAnalysis]);

  if (!isVisible) return null;

  const handleLayoutToggle = () => {
    const newLayout = layout === 'horizontal' ? 'vertical' : 'horizontal';
    setLayout(newLayout);
    onLayoutChange(newLayout);
  };

  const handleSyncScrollToggle = () => {
    const newSyncScroll = !syncScrollEnabled;
    setSyncScrollEnabled(newSyncScroll);
    onSyncScroll(newSyncScroll);
  };

  const handleAIAnalysisToggle = () => {
    setAiAnalysisEnabled(!aiAnalysisEnabled);
  };

  const handleDiffModeToggle = () => {
    setDiffMode(!diffMode);
    if (onDiffComparison) {
      onDiffComparison();
    }
  };

  const handleSmartSyncToggle = () => {
    setSmartSyncMode(!smartSyncMode);
    if (onSmartSync) {
      onSmartSync();
    }
  };

  const handleAIAnalysisRequest = (side: 'primary' | 'secondary') => {
    if (onAIAnalysis) {
      onAIAnalysis(side);
    }
  };

  // AI Intent Interface handlers
  const getEditorContext = useCallback((): EditorContext => {
    const primaryHandle = primaryEditorRef.current;
    const secondaryHandle = secondaryEditorRef.current;
    const primarySelection = primaryHandle?.getSelectedText?.() ?? '';
    const secondarySelection = secondaryHandle?.getSelectedText?.() ?? '';
    const selectedText = primarySelection || secondarySelection;

    const cursorSource = primarySelection
      ? primaryHandle
      : secondarySelection
        ? secondaryHandle
        : (primaryHandle || secondaryHandle);

    const cursorPosition = cursorSource?.getCursorPosition?.();

    return {
      currentFile: primaryTab?.filePath || primaryTab?.name,
      selectedText,
      cursorPosition: cursorPosition
        ? { line: cursorPosition.lineNumber, column: cursorPosition.column }
        : { line: 1, column: 1 },
      splitTabs: [primaryTab, secondaryTab].filter(Boolean) as SplitTab[],
      activePaneId: primaryTab?.id || secondaryTab?.id || ''
    };
  }, [primaryTab, secondaryTab]);

  const handleIntentExecuted = useCallback((intent: Intent, result: CommandResult) => {
    
    // Handle specific intent results
    if (result.success) {
      switch (intent.type) {
        case IntentType.SPLIT_VIEW:
          // Split view is already handled by the parent component
          break;
          
        case IntentType.ANALYZE_CODE:
          setAiAnalysisEnabled(true);
          handleAIAnalysisRequest('primary');
          break;
          
        case IntentType.COMPARE_FILES:
          setDiffMode(true);
          handleDiffModeToggle();
          break;
          
        case IntentType.SYNC_EDITORS:
          setSyncScrollEnabled(true);
          setSmartSyncMode(true);
          break;
          
        case IntentType.CHANGE_LAYOUT:
          const targetLayout = intent.parameters.layout || (layout === 'horizontal' ? 'vertical' : 'horizontal');
          setLayout(targetLayout);
          if (onLayoutChange) {
            onLayoutChange(targetLayout);
          }
          break;
      }
    }
  }, [layout, primaryTab, secondaryTab, onLayoutChange, onAIAnalysis]);

  // Register command processor callbacks
  useEffect(() => {
    commandProcessor.registerCallback('splitView', () => {
      
    });

    commandProcessor.registerCallback('analyzeCode', async (content: string) => {
      setAiAnalysisEnabled(true);
      const analysis = await performAIAnalysis(content, 'javascript');
      return analysis;
    });

    commandProcessor.registerCallback('syncEditors', (enabled: boolean) => {
      setSyncScrollEnabled(enabled);
      setSmartSyncMode(enabled);
    });

    commandProcessor.registerCallback('compareFiles', () => {
      setDiffMode(true);
    });

    commandProcessor.registerCallback('changeLayout', (layout: string) => {
      setLayout(layout === 'vertical' ? 'vertical' : 'horizontal');
    });

    commandProcessor.registerCallback('formatCode', async () => {
      // Format code in active editor
      const activeEditor = primaryEditorRef.current || secondaryEditorRef.current;
      if (activeEditor?.getAction) {
        const formatAction = activeEditor.getAction('editor.action.formatDocument');
        if (formatAction) {
          formatAction.run();
        }
      }
    });

    commandProcessor.registerCallback('gotoLine', (lineNumber: number) => {
      const activeEditor = primaryEditorRef.current || secondaryEditorRef.current;
      if (activeEditor?.revealLine) {
        activeEditor.revealLine(lineNumber);
        activeEditor.setPosition({ lineNumber, column: 1 });
      }
    });

  }, [performAIAnalysis]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startRatio = splitRatio;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('.split-view-container') as HTMLElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      let newRatio;

      if (layout === 'horizontal') {
        const deltaX = ((e.clientX - startX) / rect.width) * 100;
        newRatio = Math.min(Math.max(startRatio + deltaX, 20), 80);
      } else {
        const deltaY = ((e.clientY - startY) / rect.height) * 100;
        newRatio = Math.min(Math.max(startRatio + deltaY, 20), 80);
      }

      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="split-view-overlay">
      <div className={`split-view-container ${layout}`}>
        {/* Header Controls */}
        <div className="split-view-header">
          <div className="split-view-tabs">
            <div className="split-view-tab primary">
              <span className="tab-icon">📄</span>
              <span className="tab-name">{primaryTab?.name || 'No File'}</span>
              {primaryTab?.isModified && <span className="modified-indicator">●</span>}
              {aiSuggestions.primary.length > 0 && (
                <span className="ai-badge" title={`${aiSuggestions.primary.length} AI suggestions`}>
                  <Brain size={12} />
                  {aiSuggestions.primary.length}
                </span>
              )}
            </div>
            
            <div className="center-controls">
              <button
                className="swap-button"
                onClick={onTabSwap}
                title="Swap Editors"
              >
                <ArrowLeftRight size={16} />
              </button>
              
              <button
                className={`ai-diff-button ${diffMode ? 'active' : ''}`}
                onClick={handleDiffModeToggle}
                title="AI Diff Comparison"
              >
                <GitCompare size={16} />
              </button>
            </div>
            
            <div className="split-view-tab secondary">
              <span className="tab-icon">📄</span>
              <span className="tab-name">{secondaryTab?.name || 'No File'}</span>
              {secondaryTab?.isModified && <span className="modified-indicator">●</span>}
              {aiSuggestions.secondary.length > 0 && (
                <span className="ai-badge" title={`${aiSuggestions.secondary.length} AI suggestions`}>
                  <Brain size={12} />
                  {aiSuggestions.secondary.length}
                </span>
              )}
            </div>
          </div>

          <div className="split-view-controls">
            <button
              className={`control-button ai-analysis ${aiAnalysisEnabled ? 'active' : ''}`}
              onClick={handleAIAnalysisToggle}
              title="AI Code Analysis"
            >
              <Brain size={16} />
            </button>
            
            <button
              className={`control-button smart-sync ${smartSyncMode ? 'active' : ''}`}
              onClick={handleSmartSyncToggle}
              title="Smart Sync"
            >
              <Zap size={16} />
            </button>
            
            <button
              className={`control-button ${layout}`}
              onClick={handleLayoutToggle}
              title={`Switch to ${layout === 'horizontal' ? 'Vertical' : 'Horizontal'} Layout`}
            >
              <LayoutGrid size={16} />
            </button>
            
            <button
              className={`control-button ${syncScrollEnabled ? 'active' : ''}`}
              onClick={handleSyncScrollToggle}
              title="Sync Scroll"
            >
              <Sync size={16} />
            </button>
            
            <button
              className="control-button close-button"
              onClick={onToggle}
              title="Close Split View"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Editor Panes */}
        <div className="split-view-editors">
          <div 
            className={`editor-pane primary ${layout} ${diffMode ? 'diff-mode' : ''}`}
            data-split-ratio={splitRatio}
          >
            {primaryTab ? (
              <div className="editor-container">
                <MonacoEditor
                  ref={primaryEditorRef}
                  value={primaryTab.content}
                  language={primaryTab.language}
                  onChange={(value) => onTabChange('primary', value || '')}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    renderWhitespace: 'selection',
                    scrollbar: { vertical: 'auto', horizontal: 'auto' },
                    glyphMargin: true,
                    lineDecorationsWidth: 10
                  }}
                />
                
                {/* AI Suggestions Overlay */}
                {aiAnalysisEnabled && aiSuggestions.primary.length > 0 && (
                  <div className="ai-suggestions-overlay">
                    <div className="ai-suggestions-header">
                      <Brain size={16} />
                      <span>AI Suggestions ({aiSuggestions.primary.length})</span>
                      <button 
                        className="ai-action-button"
                        onClick={() => handleAIAnalysisRequest('primary')}
                        title="Analyze with AI"
                      >
                        <Sparkles size={14} />
                      </button>
                    </div>
                    <div className="ai-suggestions-list">
                      {aiSuggestions.primary.slice(0, 3).map((suggestion) => (
                        <div key={suggestion.id} className={`ai-suggestion ${suggestion.type}`}>
                          <div className="suggestion-header">
                            <span className="suggestion-type">{suggestion.type}</span>
                            <span className="suggestion-confidence">{Math.round(suggestion.confidence * 100)}%</span>
                          </div>
                          <div className="suggestion-description">{suggestion.description}</div>
                          <div className="suggestion-line">Line {suggestion.line}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diff Highlights */}
                {diffMode && diffHighlights.length > 0 && (
                  <div className="diff-indicators">
                    {diffHighlights.map((highlight, index) => (
                      <div 
                        key={index} 
                        className={`diff-indicator ${highlight.type} ${highlight.severity}`}
                        data-line={highlight.startLine}
                        title={`${highlight.type} at line ${highlight.startLine}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="no-file-placeholder">
                <div className="placeholder-content">
                  <span className="placeholder-icon">📄</span>
                  <h3>No File Selected</h3>
                  <p>Choose a file to edit in this pane</p>
                  <button 
                    className="ai-suggestion-button"
                    onClick={() => handleAIAnalysisRequest('primary')}
                  >
                    <Brain size={16} />
                    AI-Powered Analysis Ready
                  </button>
                </div>
              </div>
            )}
          </div>

          <div 
            className={`split-view-divider ${layout}`}
            onMouseDown={handleMouseDown}
          >
            <div className="divider-handle">
              <div className="divider-icon">
                {layout === 'horizontal' ? '⋮' : '⋯'}
              </div>
              {diffMode && (
                <div className="diff-count">
                  <GitCompare size={12} />
                  {diffHighlights.length}
                </div>
              )}
            </div>
          </div>

          <div 
            className={`editor-pane secondary ${layout} ${diffMode ? 'diff-mode' : ''}`}
            data-split-ratio={100 - splitRatio}
          >
            {secondaryTab ? (
              <div className="editor-container">
                <MonacoEditor
                  ref={secondaryEditorRef}
                  value={secondaryTab.content}
                  language={secondaryTab.language}
                  onChange={(value) => onTabChange('secondary', value || '')}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    renderWhitespace: 'selection',
                    scrollbar: { vertical: 'auto', horizontal: 'auto' },
                    glyphMargin: true,
                    lineDecorationsWidth: 10
                  }}
                />
                
                {/* AI Suggestions Overlay */}
                {aiAnalysisEnabled && aiSuggestions.secondary.length > 0 && (
                  <div className="ai-suggestions-overlay secondary">
                    <div className="ai-suggestions-header">
                      <Brain size={16} />
                      <span>AI Suggestions ({aiSuggestions.secondary.length})</span>
                      <button 
                        className="ai-action-button"
                        onClick={() => handleAIAnalysisRequest('secondary')}
                        title="Analyze with AI"
                      >
                        <Sparkles size={14} />
                      </button>
                    </div>
                    <div className="ai-suggestions-list">
                      {aiSuggestions.secondary.slice(0, 3).map((suggestion) => (
                        <div key={suggestion.id} className={`ai-suggestion ${suggestion.type}`}>
                          <div className="suggestion-header">
                            <span className="suggestion-type">{suggestion.type}</span>
                            <span className="suggestion-confidence">{Math.round(suggestion.confidence * 100)}%</span>
                          </div>
                          <div className="suggestion-description">{suggestion.description}</div>
                          <div className="suggestion-line">Line {suggestion.line}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-file-placeholder">
                <div className="placeholder-content">
                  <span className="placeholder-icon">📄</span>
                  <h3>No File Selected</h3>
                  <p>Choose a file to edit in this pane</p>
                  <button 
                    className="ai-suggestion-button"
                    onClick={() => handleAIAnalysisRequest('secondary')}
                  >
                    <Brain size={16} />
                    AI-Powered Analysis Ready
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Status Bar */}
        <div className="split-view-status">
          <div className="status-section">
            <span className="status-item">
              <LayoutGrid size={12} />
              Layout: {layout}
            </span>
            <span className="status-item">
              <Eye size={12} />
              Ratio: {Math.round(splitRatio)}:{Math.round(100 - splitRatio)}
            </span>
            <span className="status-item">
              <Sync size={12} />
              Sync: {syncScrollEnabled ? 'ON' : 'OFF'}
            </span>
            {diffMode && (
              <span className="status-item diff-active">
                <GitCompare size={12} />
                Diff: {diffHighlights.length} changes
              </span>
            )}
          </div>
          
          <div className="status-section">
            <span className="status-item">
              <Code2 size={12} />
              Primary: {primaryTab?.language.toUpperCase() || 'None'}
            </span>
            <span className="status-item">
              <Code2 size={12} />
              Secondary: {secondaryTab?.language.toUpperCase() || 'None'}
            </span>
          </div>

          <div className="status-section ai-status">
            {aiAnalysisEnabled && (
              <>
                <span className="status-item ai-active">
                  <Brain size={12} />
                  AI: Active
                </span>
                <span className="status-item">
                  <Sparkles size={12} />
                  Suggestions: {aiSuggestions.primary.length + aiSuggestions.secondary.length}
                </span>
                {smartSyncMode && (
                  <span className="status-item smart-sync-active">
                    <Zap size={12} />
                    Smart Sync: ON
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* AI Intent Interface */}
      <AIIntentInterface
        onIntentExecuted={handleIntentExecuted}
        editorContext={getEditorContext()}
        isVisible={intentInterfaceVisible}
        onToggleVisibility={() => setIntentInterfaceVisible(!intentInterfaceVisible)}
      />
    </div>
  );
};

export default SplitViewEditor;
