import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { advancedMonacoProvider } from '../advancedEditor/AdvancedMonacoProvider';
import AdvancedSearchDialog from '../advancedEditor/AdvancedSearchDialog';
import AICodeAssistant from '../advancedEditor/AICodeAssistant';
import './EnhancedMonacoEditor.css';

interface EnhancedMonacoEditorProps {
  value?: string;
  language?: string;
  theme?: string;
  onChange?: (value: string) => void;
  onSelectionChange?: (selection: string) => void;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  className?: string;
  height?: string | number;
  width?: string | number;
  readOnly?: boolean;
  currentFile?: string;
}

interface EditorState {
  isSearchDialogOpen: boolean;
  searchMode: 'search' | 'replace';
  isAIAssistantVisible: boolean;
  currentSelection: string;
  suggestions: any[];
  isLoading: boolean;
  collaborationCursors: any[];
  hasUnsavedChanges: boolean;
}

const EnhancedMonacoEditor: React.FC<EnhancedMonacoEditorProps> = ({
  value = '',
  language = 'typescript',
  theme = 'vs-dark',
  onChange,
  onSelectionChange,
  options = {},
  className = '',
  height = '100%',
  width = '100%',
  readOnly = false,
  currentFile
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  const [state, setState] = useState<EditorState>({
    isSearchDialogOpen: false,
    searchMode: 'search',
    isAIAssistantVisible: false,
    currentSelection: '',
    suggestions: [],
    isLoading: false,
    collaborationCursors: [],
    hasUnsavedChanges: false
  });

  const updateState = useCallback((updates: Partial<EditorState>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);

  // Initialize Monaco Editor
  useEffect(() => {
    if (!containerRef.current) return;

    // Create editor instance
    const editor = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme,
      readOnly,
      automaticLayout: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        bracketPairsHorizontal: true,
        highlightActiveIndentation: true,
        indentation: true
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showClasses: true,
        showFunctions: true,
        showVariables: true,
        showModules: true,
        showProperties: true,
        showEvents: true,
        showOperators: true,
        showUnits: true,
        showValues: true,
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showIssues: true,
        showUsers: true,
        showWords: true
      },
      quickSuggestions: {
        other: true,
        comments: true,
        strings: true
      },
      parameterHints: { enabled: true },
      formatOnPaste: true,
      formatOnType: true,
      ...options
    });

    editorRef.current = editor;

    // Setup event listeners
    setupEditorEventListeners(editor);

    // Initialize advanced features
    initializeAdvancedFeatures(editor);

    return () => {
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  // Update editor value when prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  // Update editor language when prop changes
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  // Update editor theme when prop changes
  useEffect(() => {
    monaco.editor.setTheme(theme);
  }, [theme]);

  const setupEditorEventListeners = (editor: monaco.editor.IStandaloneCodeEditor) => {
    // Content change listener
    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      onChange?.(newValue);
      updateState({ hasUnsavedChanges: true });
    });

    // Selection change listener
    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      if (model) {
        const selectedText = model.getValueInRange(e.selection);
        updateState({ currentSelection: selectedText });
        onSelectionChange?.(selectedText);
      }
    });

    // Focus listeners for AI assistance
    editor.onDidFocusEditorText(() => {
      // Auto-show AI assistant if there are suggestions
      if (state.suggestions.length > 0 && !state.isAIAssistantVisible) {
        updateState({ isAIAssistantVisible: true });
      }
    });
  };

  const initializeAdvancedFeatures = async (editor: monaco.editor.IStandaloneCodeEditor) => {
    try {
      // Initialize advanced Monaco provider
      await advancedMonacoProvider.initialize();

      // Setup event listeners for advanced features
      advancedMonacoProvider.on('openAdvancedSearch', () => {
        updateState({ isSearchDialogOpen: true, searchMode: 'search' });
      });

      advancedMonacoProvider.on('openAdvancedReplace', () => {
        updateState({ isSearchDialogOpen: true, searchMode: 'replace' });
      });

      advancedMonacoProvider.on('showExplanation', (data) => {
        // Show explanation in AI assistant
        updateState({ isAIAssistantVisible: true });
      });

      advancedMonacoProvider.on('applySuggestion', (suggestion) => {
        applySuggestionToEditor(suggestion);
      });

      // Setup keyboard shortcuts
      setupKeyboardShortcuts(editor);

    } catch (error) {
      console.error('Failed to initialize enhanced features:', error);
    }
  };

  const setupKeyboardShortcuts = (editor: monaco.editor.IStandaloneCodeEditor) => {
    // Advanced Search (Ctrl+Shift+F)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      updateState({ isSearchDialogOpen: true, searchMode: 'search' });
    });

    // Advanced Replace (Ctrl+Shift+H)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyH, () => {
      updateState({ isSearchDialogOpen: true, searchMode: 'replace' });
    });

    // AI Assistant (Ctrl+Shift+A)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyA, () => {
      updateState({ isAIAssistantVisible: !state.isAIAssistantVisible });
    });

    // AI Code Completion (Ctrl+Space)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
    });

    // AI Explain Code (Ctrl+Shift+E)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE, () => {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        const model = editor.getModel();
        if (model) {
          const selectedText = model.getValueInRange(selection);
          updateState({ 
            isAIAssistantVisible: true,
            currentSelection: selectedText 
          });
        }
      }
    });

    // Smart Multi-Cursor (Ctrl+Shift+L)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
      editor.trigger('keyboard', 'editor.action.smartMultiCursorSelect', {});
    });

    // AI Refactor (Ctrl+Shift+R)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyR, () => {
      editor.trigger('keyboard', 'editor.action.aiRefactor', {});
    });
  };

  const applySuggestionToEditor = (suggestion: any) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const selection = editor.getSelection();
    
    if (selection) {
      editor.executeEdits('ai-suggestion', [{
        range: selection,
        text: suggestion.code,
        forceMoveMarkers: true
      }]);

      // Focus back to editor
      editor.focus();
    }
  };

  const handleSearchDialogClose = () => {
    updateState({ isSearchDialogOpen: false });
    // Focus back to editor
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleAIAssistantClose = () => {
    updateState({ isAIAssistantVisible: false });
    // Focus back to editor
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Handle navigation to location from search results
  useEffect(() => {
    const handleNavigateToLocation = (event: CustomEvent) => {
      if (!editorRef.current) return;

      const { line, column } = event.detail;
      const editor = editorRef.current;

      // Navigate to the specified location
      editor.setPosition({ lineNumber: line, column });
      editor.revealLineInCenter(line);
      editor.focus();

      // Highlight the line briefly
      const decoration = editor.createDecorationsCollection([{
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'highlight-line',
          marginClassName: 'highlight-line-margin'
        }
      }]);

      // Remove highlight after 2 seconds
      setTimeout(() => {
        decoration.clear();
      }, 2000);
    };

    window.addEventListener('navigateToLocation', handleNavigateToLocation as EventListener);

    return () => {
      window.removeEventListener('navigateToLocation', handleNavigateToLocation as EventListener);
    };
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (state.hasUnsavedChanges && onChange) {
      const timeoutId = setTimeout(() => {
        updateState({ hasUnsavedChanges: false });
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [state.hasUnsavedChanges, onChange]);

  return (
    <div className={`enhanced-monaco-editor ${className}`}>
      <div className="editor-toolbar">
        <div className="editor-info">
          {currentFile && (
            <span className="current-file">{currentFile}</span>
          )}
          {state.hasUnsavedChanges && (
            <span className="unsaved-indicator">●</span>
          )}
        </div>
        
        <div className="editor-actions">
          <button
            onClick={() => updateState({ isSearchDialogOpen: true, searchMode: 'search' })}
            className="toolbar-button"
            title="Advanced Search (Ctrl+Shift+F)"
          >
            🔍
          </button>
          
          <button
            onClick={() => updateState({ isSearchDialogOpen: true, searchMode: 'replace' })}
            className="toolbar-button"
            title="Advanced Replace (Ctrl+Shift+H)"
          >
            🔄
          </button>
          
          <button
            onClick={() => updateState({ isAIAssistantVisible: !state.isAIAssistantVisible })}
            className={`toolbar-button ${state.isAIAssistantVisible ? 'active' : ''}`}
            title="AI Code Assistant (Ctrl+Shift+A)"
          >
            🤖
          </button>

          {state.collaborationCursors.length > 0 && (
            <div className="collaboration-indicator">
              <span className="collaboration-count">{state.collaborationCursors.length}</span>
              <span className="collaboration-icon">👥</span>
            </div>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="monaco-editor-container"
        style={{ height, width }}
      />

      {/* Advanced Search Dialog */}
      <AdvancedSearchDialog
        isOpen={state.isSearchDialogOpen}
        onClose={handleSearchDialogClose}
        mode={state.searchMode}
      />

      {/* AI Code Assistant */}
      <AICodeAssistant
        isVisible={state.isAIAssistantVisible}
        onClose={handleAIAssistantClose}
        currentSelection={state.currentSelection}
        currentFile={currentFile}
      />

      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="editor-loading-overlay">
          <div className="loading-spinner">
            <div></div><div></div><div></div><div></div>
          </div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
};

export default EnhancedMonacoEditor;
