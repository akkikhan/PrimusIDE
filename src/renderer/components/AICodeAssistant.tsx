// AI Code Assistant - Inline AI assistance and smart code suggestions
// Provides context-aware code completion, intelligent suggestions, and automated code improvements

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AICodeAssistant.css';
import AIIntegrationSystem, { 
  CodeCompletionRequest, 
  CodeCompletionResponse,
  CodeSuggestion,
  RefactoringRequest,
  CodeContext
} from '../services/AIIntegrationSystem';

// Code assistant props
interface AICodeAssistantProps {
  aiSystem: AIIntegrationSystem;
  editor: any; // Monaco editor instance
  currentContext: CodeContext;
  isEnabled: boolean;
  onSuggestionApplied?: (suggestion: CodeSuggestion) => void;
  onRefactoringApplied?: (refactoring: any) => void;
  className?: string;
}

// Suggestion item
interface SuggestionItem extends CodeSuggestion {
  isVisible: boolean;
  isHighlighted: boolean;
  category: 'completion' | 'refactoring' | 'optimization' | 'fix';
}

// Assistant state
interface AssistantState {
  suggestions: SuggestionItem[];
  selectedIndex: number;
  isLoading: boolean;
  position: { x: number; y: number } | null;
  triggerCharacter: string;
  currentPrefix: string;
  showInlineSuggestions: boolean;
  showRefactoringSuggestions: boolean;
}

const AICodeAssistant: React.FC<AICodeAssistantProps> = ({
  aiSystem,
  editor,
  currentContext,
  isEnabled,
  onSuggestionApplied,
  onRefactoringApplied,
  className = ''
}) => {
  // State management
  const [state, setState] = useState<AssistantState>({
    suggestions: [],
    selectedIndex: 0,
    isLoading: false,
    position: null,
    triggerCharacter: '',
    currentPrefix: '',
    showInlineSuggestions: true,
    showRefactoringSuggestions: true
  });

  // Refs
  const suggestionBoxRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestRef = useRef<string>('');

  // Configuration
  const config = {
    debounceDelay: 300,
    maxSuggestions: 10,
    triggerCharacters: ['.', '(', '[', ' ', '\n'],
    autoCompleteOnSpace: true,
    showConfidenceScores: true,
    enableAutoImports: true,
    enableSmartBraces: true
  };

  // Initialize editor integration
  useEffect(() => {
    if (!editor || !isEnabled) return;

    const disposables = setupEditorIntegration();
    return () => disposables.forEach(d => d.dispose());
  }, [editor, isEnabled]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.suggestions.length || !state.position) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          navigateSuggestions(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigateSuggestions(-1);
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          applySelectedSuggestion();
          break;
        case 'Escape':
          hideSuggestions();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.suggestions, state.selectedIndex, state.position]);

  /**
   * Setup editor integration
   */
  const setupEditorIntegration = () => {
    const disposables: any[] = [];

    // Content change listener
    disposables.push(
      editor.onDidChangeModelContent((e: any) => {
        handleContentChange(e);
      })
    );

    // Cursor position change listener
    disposables.push(
      editor.onDidChangeCursorPosition((e: any) => {
        handleCursorPositionChange(e);
      })
    );

    // Focus/blur listeners
    disposables.push(
      editor.onDidFocusEditorText(() => {
        // Editor focused
      })
    );

    disposables.push(
      editor.onDidBlurEditorText(() => {
        hideSuggestions();
      })
    );

    // Register completion provider
    const completionProvider = {
      provideCompletionItems: async (model: any, position: any) => {
        return provideCompletionItems(model, position);
      },
      triggerCharacters: config.triggerCharacters
    };

    // Register quick fix provider
    const quickFixProvider = {
      provideCodeActions: async (model: any, range: any, context: any) => {
        return provideCodeActions(model, range, context);
      }
    };

    return disposables;
  };

  /**
   * Handle content change in editor
   */
  const handleContentChange = useCallback((e: any) => {
    if (!isEnabled) return;

    const changes = e.changes;
    if (changes.length === 0) return;

    const change = changes[0];
    const text = change.text;
    const position = editor.getPosition();

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Check if this is a trigger character
    const lastChar = text.slice(-1);
    if (config.triggerCharacters.includes(lastChar)) {
      // Immediate suggestion for trigger characters
      requestSuggestions(position, lastChar);
    } else {
      // Debounced suggestions for regular typing
      debounceTimerRef.current = setTimeout(() => {
        requestSuggestions(position, '');
      }, config.debounceDelay);
    }
  }, [isEnabled, editor]);

  /**
   * Handle cursor position change
   */
  const handleCursorPositionChange = useCallback((e: any) => {
    const position = e.position;
    
    // Update suggestion box position if visible
    if (state.position) {
      updateSuggestionBoxPosition(position);
    }
  }, [state.position]);

  /**
   * Request AI suggestions
   */
  const requestSuggestions = async (position: any, triggerChar: string) => {
    if (!aiSystem || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    const document = model.getValue();
    const offset = model.getOffsetAt(position);
    const prefix = document.substring(0, offset);
    const suffix = document.substring(offset);

    // Avoid duplicate requests
    const requestKey = `${position.lineNumber}:${position.column}:${prefix.slice(-50)}`;
    if (requestKey === lastRequestRef.current) return;
    lastRequestRef.current = requestKey;

    setState(prev => ({ ...prev, isLoading: true, triggerCharacter: triggerChar }));

    try {
      const request: CodeCompletionRequest = {
        document,
        position: { line: position.lineNumber - 1, character: position.column - 1 },
        context: currentContext,
        language: currentContext.language,
        prefix,
        suffix,
        maxSuggestions: config.maxSuggestions,
        includeSnippets: true,
        filterByRelevance: true
      };

      const response = await aiSystem.getCodeCompletion(request);
      
      if (response.suggestions.length > 0) {
        const suggestions = response.suggestions.map((suggestion, index) => ({
          ...suggestion,
          isVisible: true,
          isHighlighted: index === 0,
          category: categorizeSuggestion(suggestion)
        }));

        const screenPosition = getScreenPosition(position);
        
        setState(prev => ({
          ...prev,
          suggestions,
          selectedIndex: 0,
          isLoading: false,
          position: screenPosition,
          currentPrefix: prefix
        }));
      } else {
        hideSuggestions();
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  /**
   * Provide completion items for Monaco
   */
  const provideCompletionItems = async (model: any, position: any) => {
    // This integrates with Monaco's native completion system
    return { suggestions: [] }; // Placeholder implementation
  };

  /**
   * Provide code actions (quick fixes)
   */
  const provideCodeActions = async (model: any, range: any, context: any) => {
    const actions: any[] = [];

    // Add refactoring suggestions
    if (state.showRefactoringSuggestions) {
      actions.push({
        title: 'AI: Suggest Refactoring',
        kind: 'refactor',
        run: () => suggestRefactoring(range)
      });
    }

    // Add optimization suggestions
    actions.push({
      title: 'AI: Optimize Code',
      kind: 'quickfix',
      run: () => optimizeCode(range)
    });

    return { actions };
  };

  /**
   * Categorize suggestion type
   */
  const categorizeSuggestion = (suggestion: CodeSuggestion): SuggestionItem['category'] => {
    if (suggestion.kind === 'function' || suggestion.kind === 'method') {
      if (suggestion.detail.includes('fix') || suggestion.detail.includes('error')) {
        return 'fix';
      }
      if (suggestion.detail.includes('optimize') || suggestion.detail.includes('improve')) {
        return 'optimization';
      }
      if (suggestion.detail.includes('refactor')) {
        return 'refactoring';
      }
    }
    return 'completion';
  };

  /**
   * Get screen position for suggestion box
   */
  const getScreenPosition = (position: any): { x: number; y: number } => {
    // Get editor container
    const editorContainer = editor.getDomNode();
    if (!editorContainer) return { x: 0, y: 0 };

    // Calculate position relative to editor
    const lineHeight = editor.getOption(51); // Monaco's line height option
    const scrollTop = editor.getScrollTop();
    const scrollLeft = editor.getScrollLeft();

    const x = position.column * 8 - scrollLeft; // Approximate character width
    const y = (position.lineNumber - 1) * lineHeight - scrollTop + lineHeight;

    // Get editor's bounding rect
    const rect = editorContainer.getBoundingClientRect();

    return {
      x: rect.left + x,
      y: rect.top + y
    };
  };

  /**
   * Update suggestion box position
   */
  const updateSuggestionBoxPosition = (position: any) => {
    const screenPosition = getScreenPosition(position);
    setState(prev => ({ ...prev, position: screenPosition }));
  };

  /**
   * Navigate through suggestions
   */
  const navigateSuggestions = (direction: number) => {
    setState(prev => {
      const newIndex = Math.max(0, Math.min(prev.suggestions.length - 1, prev.selectedIndex + direction));
      return {
        ...prev,
        selectedIndex: newIndex,
        suggestions: prev.suggestions.map((s, i) => ({ ...s, isHighlighted: i === newIndex }))
      };
    });
  };

  /**
   * Apply selected suggestion
   */
  const applySelectedSuggestion = () => {
    const suggestion = state.suggestions[state.selectedIndex];
    if (!suggestion || !editor) return;

    const position = editor.getPosition();
    const model = editor.getModel();

    if (suggestion.range) {
      // Apply with specific range
      const range = {
        startLineNumber: suggestion.range.start.line + 1,
        startColumn: suggestion.range.start.character + 1,
        endLineNumber: suggestion.range.end.line + 1,
        endColumn: suggestion.range.end.character + 1
      };

      editor.executeEdits('ai-suggestion', [{
        range,
        text: suggestion.insertText
      }]);
    } else {
      // Insert at current position
      editor.executeEdits('ai-suggestion', [{
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        },
        text: suggestion.insertText
      }]);
    }

    // Apply additional edits if any
    if (suggestion.additionalTextEdits) {
      const edits = suggestion.additionalTextEdits.map(edit => ({
        range: {
          startLineNumber: edit.range.start.line + 1,
          startColumn: edit.range.start.character + 1,
          endLineNumber: edit.range.end.line + 1,
          endColumn: edit.range.end.character + 1
        },
        text: edit.newText
      }));

      editor.executeEdits('ai-suggestion-additional', edits);
    }

    // Execute command if any
    if (suggestion.command) {
      // Handle command execution based on your command system
    }

    onSuggestionApplied?.(suggestion);
    hideSuggestions();
  };

  /**
   * Apply suggestion by index
   */
  const applySuggestion = (index: number) => {
    setState(prev => ({ ...prev, selectedIndex: index }));
    applySelectedSuggestion();
  };

  /**
   * Hide suggestions
   */
  const hideSuggestions = () => {
    setState(prev => ({
      ...prev,
      suggestions: [],
      selectedIndex: 0,
      position: null,
      isLoading: false
    }));
  };

  /**
   * Suggest refactoring for selected code
   */
  const suggestRefactoring = async (range: any) => {
    if (!aiSystem || !editor) return;

    const model = editor.getModel();
    const selectedText = model.getValueInRange(range);

    try {
      const request: RefactoringRequest = {
        type: 'extract-function', // This would be determined by analysis
        document: model.getValue(),
        range: {
          start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
          end: { line: range.endLineNumber - 1, character: range.endColumn - 1 }
        },
        options: {
          preserveComments: true,
          updateReferences: true
        }
      };

      const response = await aiSystem.performRefactoring(request);
      
      // Apply refactoring if user confirms
      if (confirm(`Apply refactoring: ${response.description}?`)) {
        const edits = response.edits.map(edit => ({
          range: {
            startLineNumber: edit.edits[0].range.start.line + 1,
            startColumn: edit.edits[0].range.start.character + 1,
            endLineNumber: edit.edits[0].range.end.line + 1,
            endColumn: edit.edits[0].range.end.character + 1
          },
          text: edit.edits[0].newText
        }));

        editor.executeEdits('ai-refactoring', edits);
        onRefactoringApplied?.(response);
      }
    } catch (error) {
      console.error('Failed to suggest refactoring:', error);
    }
  };

  /**
   * Optimize code in selected range
   */
  const optimizeCode = async (range: any) => {
    // Similar to refactoring but focused on optimization
    
  };

  /**
   * Get suggestion icon based on category
   */
  const getSuggestionIcon = (suggestion: SuggestionItem): string => {
    switch (suggestion.category) {
      case 'completion':
        return suggestion.kind === 'function' ? '🔧' : 
               suggestion.kind === 'variable' ? '📊' :
               suggestion.kind === 'class' ? '🏗️' : '💡';
      case 'refactoring':
        return '🔄';
      case 'optimization':
        return '⚡';
      case 'fix':
        return '🔧';
      default:
        return '💡';
    }
  };

  /**
   * Get confidence color
   */
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FF9800';
    return '#F44336';
  };

  const getConfidenceClass = (confidence: number): string => {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  };

  if (!isEnabled || !state.position || state.suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={suggestionBoxRef}
      className={`ai-code-assistant ${className}`}
      style={{
        left: state.position.x,
        top: state.position.y
      }}
    >
      <div className="suggestion-header">
        <span className="suggestion-title">AI Suggestions</span>
        {state.isLoading && <span className="loading-spinner">⏳</span>}
      </div>

      <div className="suggestions-list">
        {state.suggestions.map((suggestion, index) => (
          <div
            key={suggestion.id}
            className={`suggestion-item ${suggestion.isHighlighted ? 'highlighted' : ''} ${suggestion.category}`}
            onClick={() => applySuggestion(index)}
            onMouseEnter={() => setState(prev => ({ 
              ...prev, 
              selectedIndex: index,
              suggestions: prev.suggestions.map((s, i) => ({ ...s, isHighlighted: i === index }))
            }))}
          >
            <div className="suggestion-main">
              <span className="suggestion-icon">{getSuggestionIcon(suggestion)}</span>
              <div className="suggestion-content">
                <div className="suggestion-text">
                  {suggestion.displayText || suggestion.text}
                </div>
                {suggestion.detail && (
                  <div className="suggestion-detail">{suggestion.detail}</div>
                )}
              </div>
              {config.showConfidenceScores && (
                <div 
                  className={`confidence-score ${getConfidenceClass(suggestion.confidence)}`}
                >
                  {Math.round(suggestion.confidence * 100)}%
                </div>
              )}
            </div>
            
            {suggestion.documentation && (
              <div className="suggestion-documentation">
                {suggestion.documentation}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="suggestion-footer">
        <div className="navigation-hint">
          <span>↑↓ Navigate</span>
          <span>⏎ Apply</span>
          <span>⎋ Cancel</span>
        </div>
      </div>
    </div>
  );
};

export default AICodeAssistant;
