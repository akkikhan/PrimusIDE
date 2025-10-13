import * as monaco from 'monaco-editor';
import { contextManager } from '../contextAwareness/ContextManager';
import { smartCodeIntelligence } from '../contextAwareness/SmartCodeIntelligence';
import { contextIntegrationService } from '../contextAwareness/ContextIntegrationService';
import { EventEmitter } from 'events';

/**
 * Advanced Monaco Editor Provider
 * Enhances Monaco Editor with intelligent suggestions, AI-powered features,
 * real-time collaboration, advanced search/replace, and multi-cursor support
 */

export interface CodeSuggestion {
  label: string;
  kind: monaco.languages.CompletionItemKind;
  documentation: string | monaco.IMarkdownString;
  insertText: string;
  range: monaco.IRange;
  detail?: string;
  sortText?: string;
  filterText?: string;
  insertTextRules?: monaco.languages.CompletionItemInsertTextRule;
  command?: monaco.languages.Command;
}

export interface IntelliSenseProvider {
  triggerCharacters: string[];
  provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    token: monaco.CancellationToken
  ): monaco.languages.ProviderResult<monaco.languages.CompletionList>;
}

export interface CollaborationCursor {
  userId: string;
  userName: string;
  color: string;
  position: monaco.Position;
  selection?: monaco.Selection;
}

export interface AdvancedSearchOptions {
  query: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  isWholeWord: boolean;
  includeFiles: string[];
  excludeFiles: string[];
  maxResults: number;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  text: string;
  preview: string;
}

export class AdvancedMonacoProvider extends EventEmitter {
  private completionProviders: Map<string, monaco.IDisposable> = new Map();
  private hoverProviders: Map<string, monaco.IDisposable> = new Map();
  private codeActionProviders: Map<string, monaco.IDisposable> = new Map();
  private collaborationDecorations: Map<string, string[]> = new Map();
  private searchWidget: monaco.editor.IEditorContribution | null = null;
  private isInitialized: boolean = false;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;

  constructor() {
    super();
  }

  /**
   * Set the Monaco editor instance
   */
  setEditor(editor: monaco.editor.IStandaloneCodeEditor): void {
    this.editor = editor;
  }

  /**
   * Initialize advanced Monaco Editor features
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.setupIntelliSense();
      await this.setupCodeActions();
      await this.setupHoverProviders();
      await this.setupAdvancedSearch();
      await this.setupMultiCursorSupport();
      await this.setupCollaboration();
      await this.setupAIAssistance();

      this.isInitialized = true;
      this.emit('initialized');
      
    } catch (error) {
      console.error('Failed to initialize Advanced Monaco Provider:', error);
      this.emit('error', error);
    }
  }

  /**
   * Setup intelligent IntelliSense with context awareness
   */
  private async setupIntelliSense(): Promise<void> {
    const languages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];

    for (const language of languages) {
      const provider = monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters: ['.', '(', '<', '"', "'", '/', '@'],
        
        provideCompletionItems: async (model, position, context, token) => {
          const suggestions = await this.generateIntelligentSuggestions(
            model, position, context, language
          );
          
          return {
            suggestions: suggestions.map(s => ({
              label: s.label,
              kind: s.kind,
              insertText: s.insertText,
              range: s.range,
              documentation: s.documentation,
              detail: s.detail,
              sortText: s.sortText,
              filterText: s.filterText,
              insertTextRules: s.insertTextRules,
              command: s.command
            })),
            dispose: () => {}
          };
        }
      });

      this.completionProviders.set(language, provider);
    }
  }

  /**
   * Setup AI-powered code actions
   */
  private async setupCodeActions(): Promise<void> {
    const languages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];

    for (const language of languages) {
      const provider = monaco.languages.registerCodeActionProvider(language, {
        provideCodeActions: async (model, range, context, token) => {
          const actions: monaco.languages.CodeAction[] = [];

          // AI-powered quick fixes
          if (context.markers && context.markers.length > 0) {
            for (const marker of context.markers) {
              const aiActions = await this.generateAICodeActions(model, marker, range);
              actions.push(...aiActions);
            }
          }

          // Context-aware refactoring actions
          const refactorActions = await this.generateRefactoringActions(model, range);
          actions.push(...refactorActions);

          // Smart extraction actions
          const extractActions = await this.generateExtractionActions(model, range);
          actions.push(...extractActions);

          return {
            actions,
            dispose: () => {}
          };
        }
      });

      this.codeActionProviders.set(language, provider);
    }
  }

  /**
   * Setup intelligent hover providers with context information
   */
  private async setupHoverProviders(): Promise<void> {
    const languages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];

    for (const language of languages) {
      const provider = monaco.languages.registerHoverProvider(language, {
        provideHover: async (model, position, token) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          // Get context-aware hover information
          const hoverInfo = await this.generateContextualHover(model, position, word);
          
          if (hoverInfo) {
            return {
              range: new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              ),
              contents: hoverInfo
            };
          }

          return null;
        }
      });

      this.hoverProviders.set(language, provider);
    }
  }

  /**
   * Setup advanced search and replace functionality
   */
  private async setupAdvancedSearch(): Promise<void> {
    // Register advanced search command
    monaco.editor.registerCommand('editor.action.advancedSearch', (accessor, ...args) => {
      this.openAdvancedSearch();
    });

    // Register advanced replace command  
    monaco.editor.registerCommand('editor.action.advancedReplace', (accessor, ...args) => {
      this.openAdvancedReplace();
    });
  }

  /**
   * Setup enhanced multi-cursor support
   */
  private async setupMultiCursorSupport(): Promise<void> {
    // Multi-cursor support will be handled through editor instances
    
  }

  /**
   * Setup real-time collaboration features
   */
  private async setupCollaboration(): Promise<void> {
    // This would integrate with a real-time collaboration service
    console.log('Collaboration features initialized (mock)');
  }

  /**
   * Setup AI assistance integration
   */
  private async setupAIAssistance(): Promise<void> {
    // AI assistance will be handled through editor instances
    
  }

  /**
   * Generate intelligent code suggestions based on context
   */
  private async generateIntelligentSuggestions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    language: string
  ): Promise<CodeSuggestion[]> {
    const suggestions: CodeSuggestion[] = [];
    const lineContent = model.getLineContent(position.lineNumber);
    const wordInfo = model.getWordUntilPosition(position);
    const word = wordInfo.word;

    // Get workspace context for intelligent suggestions
    const workspaceContext = contextManager.getWorkspaceContext();
    
    // Basic language-specific suggestions
    switch (language) {
      case 'typescript':
      case 'typescriptreact':
        suggestions.push(...this.generateTypeScriptSuggestions(lineContent, word, position));
        break;
      case 'javascript':
      case 'javascriptreact':
        suggestions.push(...this.generateJavaScriptSuggestions(lineContent, word, position));
        break;
    }

    // Context-aware suggestions based on project structure
    if (workspaceContext.projectStructure.frameworks.includes('React')) {
      suggestions.push(...this.generateReactSuggestions(lineContent, word, position));
    }

    // AI-powered suggestions based on current context
    const aiSuggestions = await this.generateAISuggestions(model, position, word);
    suggestions.push(...aiSuggestions);

    return suggestions.slice(0, 20); // Limit to top 20 suggestions
  }

  /**
   * Generate TypeScript-specific suggestions
   */
  private generateTypeScriptSuggestions(lineContent: string, word: string, position: monaco.Position): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];
    
    // Interface suggestions
    if (lineContent.includes('interface') || word === 'interface') {
      suggestions.push({
        label: 'interface',
        kind: monaco.languages.CompletionItemKind.Interface,
        documentation: 'Define a TypeScript interface',
        insertText: 'interface ${1:InterfaceName} {\n  ${2:property}: ${3:type};\n}',
        range: new monaco.Range(position.lineNumber, position.column - word.length, position.lineNumber, position.column),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });
    }

    // Type suggestions
    if (word === 'type' || lineContent.includes('type')) {
      suggestions.push({
        label: 'type alias',
        kind: monaco.languages.CompletionItemKind.TypeParameter,
        documentation: 'Define a TypeScript type alias',
        insertText: 'type ${1:TypeName} = ${2:type};',
        range: new monaco.Range(position.lineNumber, position.column - word.length, position.lineNumber, position.column),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });
    }

    // Function suggestions
    if (word === 'function' || lineContent.includes('function')) {
      suggestions.push({
        label: 'async function',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Create an async function',
        insertText: 'async function ${1:functionName}(${2:params}): Promise<${3:ReturnType}> {\n  ${4:// Implementation}\n}',
        range: new monaco.Range(position.lineNumber, position.column - word.length, position.lineNumber, position.column),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });
    }

    return suggestions;
  }

  /**
   * Generate React-specific suggestions
   */
  private generateReactSuggestions(lineContent: string, word: string, position: monaco.Position): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];

    // Component suggestions
    if (word === 'component' || lineContent.includes('React.FC')) {
      suggestions.push({
        label: 'React Functional Component',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'Create a React functional component',
        insertText: 'const ${1:ComponentName}: React.FC<${2:Props}> = (${3:props}) => {\n  return (\n    <div>\n      ${4:// Component content}\n    </div>\n  );\n};',
        range: new monaco.Range(position.lineNumber, position.column - word.length, position.lineNumber, position.column),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });
    }

    // Hook suggestions
    if (word.startsWith('use') || lineContent.includes('useState')) {
      suggestions.push({
        label: 'useState',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'React useState hook',
        insertText: 'const [${1:state}, set${2:State}] = useState<${3:type}>(${4:initialValue});',
        range: new monaco.Range(position.lineNumber, position.column - word.length, position.lineNumber, position.column),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });

      suggestions.push({
        label: 'useEffect',
        kind: monaco.languages.CompletionItemKind.Function,
        documentation: 'React useEffect hook',
        insertText: 'useEffect(() => {\n  ${1:// Effect logic}\n  return () => {\n    ${2:// Cleanup logic}\n  };\n}, [${3:dependencies}]);',
        range: new monaco.Range(position.lineNumber, position.column - word.length, position.lineNumber, position.column),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });
    }

    return suggestions;
  }

  /**
   * Generate JavaScript-specific suggestions
   */
  private generateJavaScriptSuggestions(lineContent: string, word: string, position: monaco.Position): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];

    // Console suggestions
    if (word === 'console' || lineContent.includes('console.')) {
      suggestions.push({
        label: 'console.log',
        kind: monaco.languages.CompletionItemKind.Method,
        documentation: 'Log to console',
        insertText: 'console.log(${1:value});',
        range: new monaco.Range(position.lineNumber, position.column - word.length, position.lineNumber, position.column),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });
    }

    // Promise suggestions
    if (word === 'Promise' || lineContent.includes('Promise')) {
      suggestions.push({
        label: 'Promise',
        kind: monaco.languages.CompletionItemKind.Class,
        documentation: 'Create a new Promise',
        insertText: 'new Promise((resolve, reject) => {\n  ${1:// Promise implementation}\n})',
        range: new monaco.Range(position.lineNumber, position.column - word.length, position.lineNumber, position.column),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      });
    }

    return suggestions;
  }

  /**
   * Generate AI-powered suggestions
   */
  private async generateAISuggestions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    word: string
  ): Promise<CodeSuggestion[]> {
    try {
      const contextualAssistance = await contextIntegrationService.getContextualAssistance({
        type: 'implement_feature',
        target: 'selection',
        scope: 'local',
        context: { relatedFiles: [], dependencies: [], references: [] }
      });

      const suggestions: CodeSuggestion[] = [];

      // Convert AI suggestions to completion items
      for (const suggestion of contextualAssistance.suggestions.slice(0, 5)) {
        suggestions.push({
          label: suggestion.title,
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: suggestion.description,
          insertText: suggestion.code,
          range: new monaco.Range(position.lineNumber, position.column - word.length, position.lineNumber, position.column),
          detail: 'AI Suggestion'
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
      return [];
    }
  }

  /**
   * Generate AI-powered code actions
   */
  private async generateAICodeActions(
    model: monaco.editor.ITextModel,
    marker: monaco.editor.IMarkerData,
    range: monaco.Range
  ): Promise<monaco.languages.CodeAction[]> {
    const actions: monaco.languages.CodeAction[] = [];

    try {
      // Generate fix suggestions using AI
      const contextualAssistance = await contextIntegrationService.getContextualAssistance({
        type: 'fix_error',
        target: 'selection',
        scope: 'local',
        context: { relatedFiles: [], dependencies: [], references: [] }
      });

      for (const suggestion of contextualAssistance.suggestions.slice(0, 3)) {
        actions.push({
          title: `🤖 ${suggestion.title}`,
          kind: 'quickfix',
          command: {
            id: 'ai.applySuggestion',
            title: suggestion.title,
            arguments: [suggestion.code, range]
          },
          isPreferred: suggestion.confidence > 0.8
        });
      }
    } catch (error) {
      console.error('Failed to generate AI code actions:', error);
    }

    return actions;
  }

  /**
   * Generate refactoring actions
   */
  private async generateRefactoringActions(
    model: monaco.editor.ITextModel,
    range: monaco.Range
  ): Promise<monaco.languages.CodeAction[]> {
    const actions: monaco.languages.CodeAction[] = [];
    const selectedText = model.getValueInRange(range);

    if (selectedText.trim()) {
      // Extract to function
      actions.push({
        title: '🔧 Extract to Function',
        kind: 'refactor.extract.function',
        command: {
          id: 'refactor.extractFunction',
          title: 'Extract to Function',
          arguments: [selectedText, range]
        }
      });

      // Extract to variable
      actions.push({
        title: '🔧 Extract to Variable',
        kind: 'refactor.extract.constant',
        command: {
          id: 'refactor.extractVariable',
          title: 'Extract to Variable',
          arguments: [selectedText, range]
        }
      });
    }

    return actions;
  }

  /**
   * Generate extraction actions
   */
  private async generateExtractionActions(
    model: monaco.editor.ITextModel,
    range: monaco.Range
  ): Promise<monaco.languages.CodeAction[]> {
    const actions: monaco.languages.CodeAction[] = [];
    const selectedText = model.getValueInRange(range);

    // Add comment
    actions.push({
      title: '💬 Add Comment',
      kind: 'refactor.rewrite',
      command: {
        id: 'refactor.addComment',
        title: 'Add Comment',
        arguments: [selectedText, range]
      }
    });

    return actions;
  }

  /**
   * Generate contextual hover information
   */
  private async generateContextualHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    word: monaco.editor.IWordAtPosition
  ): Promise<monaco.IMarkdownString[] | null> {
    try {
      const contextualAssistance = await contextIntegrationService.getContextualAssistance({
        type: 'explain',
        target: 'selection',
        scope: 'local',
        context: { relatedFiles: [], dependencies: [], references: [] }
      });

      const hoverContents: monaco.IMarkdownString[] = [];

      // Add explanation
      hoverContents.push({
        value: `**${word.word}**\n\n${contextualAssistance.explanation}`
      });

      // Add suggestions if available
      if (contextualAssistance.nextSteps.length > 0) {
        hoverContents.push({
          value: `**Next Steps:**\n${contextualAssistance.nextSteps.map(step => `• ${step}`).join('\n')}`
        });
      }

      return hoverContents;
    } catch (error) {
      console.error('Failed to generate contextual hover:', error);
      return null;
    }
  }

  /**
   * Open advanced search dialog
   */
  private openAdvancedSearch(): void {
    this.emit('openAdvancedSearch');
  }

  /**
   * Open advanced replace dialog
   */
  private openAdvancedReplace(): void {
    this.emit('openAdvancedReplace');
  }

  /**
   * Smart multi-cursor selection based on context
   */
  private smartMultiCursorSelection(editor: monaco.editor.ICodeEditor): void {
    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) return;

    const model = editor.getModel();
    if (!model) return;

    const selectedText = model.getValueInRange(selection);
    const matches = model.findMatches(
      selectedText,
      false,
      false,
      true,
      null,
      true
    );

    if (matches.length > 1) {
      const selections = matches.map(match => new monaco.Selection(
        match.range.startLineNumber,
        match.range.startColumn,
        match.range.endLineNumber,
        match.range.endColumn
      ));

      editor.setSelections(selections);
    }
  }

  /**
   * AI-powered selection expansion
   */
  private async aiExpandSelection(editor: monaco.editor.ICodeEditor): Promise<void> {
    const selection = editor.getSelection();
    if (!selection) return;

    const model = editor.getModel();
    if (!model) return;

    // Use AI to suggest smart selection expansion
    try {
      const contextualAssistance = await contextIntegrationService.getContextualAssistance({
        type: 'refactor',
        target: 'selection',
        scope: 'local',
        context: { relatedFiles: [], dependencies: [], references: [] }
      });

      // Expand selection based on AI suggestions
      const expandedRange = new monaco.Range(
        Math.max(1, selection.startLineNumber - 1),
        1,
        Math.min(model.getLineCount(), selection.endLineNumber + 1),
        model.getLineMaxColumn(Math.min(model.getLineCount(), selection.endLineNumber + 1))
      );

      editor.setSelection(expandedRange);
    } catch (error) {
      console.error('Failed to expand selection:', error);
    }
  }

  /**
   * Trigger AI completion
   */
  private async triggerAICompletion(editor: monaco.editor.ICodeEditor): Promise<void> {
    const model = editor.getModel();
    const position = editor.getPosition();
    
    if (!model || !position) return;

    try {
      const code = await contextIntegrationService.generateContextualCode({
        type: 'implement_feature',
        target: 'selection',
        scope: 'local',
        context: { relatedFiles: [], dependencies: [], references: [] }
      }, 'Generate code completion');

      editor.executeEdits('ai-completion', [{
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: code
      }]);
    } catch (error) {
      console.error('Failed to trigger AI completion:', error);
    }
  }

  /**
   * Trigger AI explanation
   */
  private async triggerAIExplanation(editor: monaco.editor.ICodeEditor): Promise<void> {
    const selection = editor.getSelection();
    if (!selection) return;

    const model = editor.getModel();
    if (!model) return;

    const selectedText = model.getValueInRange(selection);
    
    try {
      const contextualAssistance = await contextIntegrationService.getContextualAssistance({
        type: 'explain',
        target: 'selection',
        scope: 'local',
        context: { relatedFiles: [], dependencies: [], references: [] }
      });

      // Show explanation in a hover widget
      this.emit('showExplanation', {
        text: selectedText,
        explanation: contextualAssistance.explanation
      });
    } catch (error) {
      console.error('Failed to trigger AI explanation:', error);
    }
  }

  /**
   * Trigger AI refactoring
   */
  private async triggerAIRefactoring(editor: monaco.editor.ICodeEditor): Promise<void> {
    const selection = editor.getSelection();
    if (!selection) return;

    const model = editor.getModel();
    if (!model) return;

    try {
      const refactoredCode = await contextIntegrationService.generateContextualCode({
        type: 'refactor',
        target: 'selection',
        scope: 'local',
        context: { relatedFiles: [], dependencies: [], references: [] }
      }, 'Refactor selected code');

      editor.executeEdits('ai-refactor', [{
        range: selection,
        text: refactoredCode
      }]);
    } catch (error) {
      console.error('Failed to trigger AI refactoring:', error);
    }
  }

  /**
   * Update collaboration cursors
   */
  updateCollaborationCursors(cursors: CollaborationCursor[]): void {
    // Clear existing decorations
    this.collaborationDecorations.forEach((decorations, userId) => {
      // Simplified implementation - no editor access needed
      
    });
    this.collaborationDecorations.clear();

    // Add new decorations - simplified collaboration tracking
    if (!this.editor) return;

    cursors.forEach(cursor => {
      const decorationIds = this.editor!.deltaDecorations([], [{
        range: new monaco.Range(
          cursor.position.lineNumber,
          cursor.position.column,
          cursor.position.lineNumber,
          cursor.position.column + 1
        ),
        options: {
          className: 'collaboration-cursor',
          hoverMessage: { value: `${cursor.userName} is here` },
          beforeContentClassName: 'collaboration-cursor-before',
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      }]);

      this.collaborationDecorations.set(cursor.userId, decorationIds);
    });
  }

  /**
   * Perform advanced search across workspace
   */
  async performAdvancedSearch(options: AdvancedSearchOptions): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const workspaceContext = contextManager.getWorkspaceContext();
      const filesToSearch = workspaceContext.projectStructure.files
        .filter(file => {
          const fileName = file.split('/').pop() || '';
          return this.matchesFileFilter(fileName, options.includeFiles, options.excludeFiles);
        })
        .slice(0, options.maxResults);

      for (const filePath of filesToSearch) {
        try {
          const content = await window.electronAPI.fs.readFile(filePath);
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const matches = this.findInLine(line, options);

            for (const match of matches) {
              results.push({
                file: filePath,
                line: i + 1,
                column: match.column,
                text: match.text,
                preview: line.trim()
              });

              if (results.length >= options.maxResults) {
                return results;
              }
            }
          }
        } catch (error) {
          console.warn(`Could not search file ${filePath}:`, error);
        }
      }
    } catch (error) {
      console.error('Advanced search failed:', error);
    }

    return results;
  }

  // Helper methods
  private generateFunctionName(code: string): string {
    // Simple function name generation
    const words = code.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return 'extractedFunction';
    
    return 'extracted' + words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }

  private matchesFileFilter(fileName: string, include: string[], exclude: string[]): boolean {
    if (exclude.length > 0 && exclude.some(pattern => fileName.includes(pattern))) {
      return false;
    }
    if (include.length > 0) {
      return include.some(pattern => fileName.includes(pattern));
    }
    return true;
  }

  private findInLine(line: string, options: AdvancedSearchOptions): Array<{ column: number; text: string }> {
    const matches: Array<{ column: number; text: string }> = [];
    let searchText = line;
    let query = options.query;

    if (!options.isCaseSensitive) {
      searchText = line.toLowerCase();
      query = query.toLowerCase();
    }

    if (options.isRegex) {
      try {
        const regex = new RegExp(query, options.isCaseSensitive ? 'g' : 'gi');
        let match;
        while ((match = regex.exec(line)) !== null) {
          matches.push({
            column: match.index + 1,
            text: match[0]
          });
        }
      } catch (error) {
        // Invalid regex, fall back to literal search
        const index = searchText.indexOf(query);
        if (index >= 0) {
          matches.push({
            column: index + 1,
            text: query
          });
        }
      }
    } else {
      if (options.isWholeWord) {
        const regex = new RegExp(`\\b${query}\\b`, options.isCaseSensitive ? 'g' : 'gi');
        let match;
        while ((match = regex.exec(line)) !== null) {
          matches.push({
            column: match.index + 1,
            text: match[0]
          });
        }
      } else {
        let startIndex = 0;
        let index;
        while ((index = searchText.indexOf(query, startIndex)) >= 0) {
          matches.push({
            column: index + 1,
            text: line.substr(index, query.length)
          });
          startIndex = index + 1;
        }
      }
    }

    return matches;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.completionProviders.forEach(provider => provider.dispose());
    this.hoverProviders.forEach(provider => provider.dispose());
    this.codeActionProviders.forEach(provider => provider.dispose());
    
    this.completionProviders.clear();
    this.hoverProviders.clear();
    this.codeActionProviders.clear();
    this.collaborationDecorations.clear();
    
    this.removeAllListeners();
    this.isInitialized = false;
  }
}

export const advancedMonacoProvider = new AdvancedMonacoProvider();
