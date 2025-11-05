# Monaco Editor Integration - God-Level Expertise

## Deep Monaco Editor Architecture

### Complete Editor Setup and Configuration

```typescript
// src/renderer/MonacoEditor.tsx - Production-grade implementation
import * as monaco from 'monaco-editor';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Configure Monaco workers (CRITICAL for performance)
self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId: string, label: string) {
    // Lazy load workers for each language
    switch (label) {
      case 'json':
        return './json.worker.bundle.js';
      case 'css':
      case 'scss':
      case 'less':
        return './css.worker.bundle.js';
      case 'html':
      case 'handlebars':
      case 'razor':
        return './html.worker.bundle.js';
      case 'typescript':
      case 'javascript':
        return './ts.worker.bundle.js';
      default:
        return './editor.worker.bundle.js';
    }
  },
};

export function MonacoEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useTheme();
  
  // Initialize editor once
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create editor with optimal configuration
    const editor = monaco.editor.create(containerRef.current, {
      // Content
      value: '',
      language: 'typescript',
      
      // Theme
      theme: theme === 'dark' ? 'vs-dark' : 'vs-light',
      
      // Editor behavior
      automaticLayout: true, // Auto-resize with container
      wordWrap: 'on',
      wrappingIndent: 'indent',
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      
      // Line numbers and folding
      lineNumbers: 'on',
      lineNumbersMinChars: 3,
      lineDecorationsWidth: 10,
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'mouseover',
      
      // Minimap
      minimap: {
        enabled: true,
        maxColumn: 80,
        renderCharacters: false,
        showSlider: 'mouseover',
      },
      
      // Scrollbar
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        useShadows: true,
        verticalScrollbarSize: 14,
        horizontalScrollbarSize: 14,
      },
      
      // Find widget
      find: {
        addExtraSpaceOnTop: false,
        autoFindInSelection: 'multiline',
        seedSearchStringFromSelection: 'selection',
      },
      
      // Suggestions
      suggest: {
        insertMode: 'replace',
        showIcons: true,
        showStatusBar: true,
        preview: true,
        previewMode: 'subwordSmart',
        snippetsPreventQuickSuggestions: false,
      },
      
      // Quick suggestions
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
      },
      quickSuggestionsDelay: 100,
      
      // Parameter hints
      parameterHints: {
        enabled: true,
        cycle: true,
      },
      
      // Hover
      hover: {
        enabled: true,
        delay: 300,
        sticky: true,
      },
      
      // Code lens
      codeLens: true,
      
      // Links
      links: true,
      
      // Formatting
      formatOnPaste: true,
      formatOnType: true,
      
      // Font
      fontSize: 14,
      fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
      fontLigatures: true,
      
      // Tab settings
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: true,
      
      // Bracket pair colorization
      'bracketPairColorization.enabled': true,
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      
      // Diff editor
      renderSideBySide: true,
      
      // Accessibility
      accessibilitySupport: 'auto',
      
      // Performance
      renderWhitespace: 'selection',
      renderControlCharacters: false,
      renderLineHighlight: 'all',
      renderValidationDecorations: 'on',
      
      // Selection
      selectionHighlight: true,
      occurrencesHighlight: true,
      
      // Sticky scroll (new feature)
      stickyScroll: {
        enabled: true,
        maxLineCount: 5,
      },
    });
    
    editorRef.current = editor;
    
    // Setup event listeners
    setupEditorEvents(editor);
    
    // Cleanup
    return () => {
      editor.dispose();
    };
  }, []);
  
  // Update theme dynamically
  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs-light');
    }
  }, [theme]);
  
  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}

function setupEditorEvents(editor: monaco.editor.IStandaloneCodeEditor) {
  // Content changes
  editor.onDidChangeModelContent((e) => {
    const model = editor.getModel();
    if (!model) return;
    
    const content = model.getValue();
    const uri = model.uri.toString();
    
    // Debounced save
    debouncedSave(uri, content);
  });
  
  // Cursor position changes
  editor.onDidChangeCursorPosition((e) => {
    const position = e.position;
    updateStatusBar(position.lineNumber, position.column);
  });
  
  // Selection changes
  editor.onDidChangeCursorSelection((e) => {
    const selection = e.selection;
    const model = editor.getModel();
    if (!model) return;
    
    const selectedText = model.getValueInRange(selection);
    if (selectedText) {
      // Update search context with selection
      updateSearchContext(selectedText);
    }
  });
  
  // Focus events
  editor.onDidFocusEditorText(() => {
    setEditorFocused(true);
  });
  
  editor.onDidBlurEditorText(() => {
    setEditorFocused(false);
  });
}
```

### Advanced Model Management

```typescript
// src/renderer/services/EditorModelManager.ts
export class EditorModelManager {
  private models = new Map<string, monaco.editor.ITextModel>();
  private disposables: monaco.IDisposable[] = [];
  
  // Get or create model
  getOrCreateModel(uri: string, content: string, language?: string): monaco.editor.ITextModel {
    let model = this.models.get(uri);
    
    if (!model) {
      const monacoUri = monaco.Uri.parse(uri);
      const detectedLanguage = language || this.detectLanguage(uri);
      
      model = monaco.editor.createModel(content, detectedLanguage, monacoUri);
      this.models.set(uri, model);
      
      // Setup model events
      this.setupModelEvents(model);
    }
    
    return model;
  }
  
  private setupModelEvents(model: monaco.editor.ITextModel) {
    // Track changes for undo/redo
    const disposable = model.onDidChangeContent((e) => {
      const uri = model.uri.toString();
      this.markDirty(uri);
      
      // Auto-save after delay
      this.scheduleSave(uri);
    });
    
    this.disposables.push(disposable);
  }
  
  // Dispose model (when tab closes)
  disposeModel(uri: string) {
    const model = this.models.get(uri);
    if (model) {
      model.dispose();
      this.models.delete(uri);
    }
  }
  
  // Get all open models
  getAllModels(): monaco.editor.ITextModel[] {
    return Array.from(this.models.values());
  }
  
  // Language detection
  private detectLanguage(uri: string): string {
    const ext = uri.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      html: 'html',
      css: 'css',
      scss: 'scss',
      less: 'less',
      md: 'markdown',
      py: 'python',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      sql: 'sql',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      sh: 'shell',
      bash: 'shell',
      ps1: 'powershell',
    };
    
    return languageMap[ext || ''] || 'plaintext';
  }
  
  private markDirty(uri: string) {
    // Update UI to show unsaved indicator
    window.primus.workspace.markFileDirty(uri);
  }
  
  private scheduleSave(uri: string) {
    // Debounced auto-save
    clearTimeout(this.saveTimers.get(uri));
    
    const timer = setTimeout(async () => {
      const model = this.models.get(uri);
      if (model) {
        const content = model.getValue();
        await window.primus.fs.writeFile(uri, content);
        this.markClean(uri);
      }
    }, 2000); // 2 second delay
    
    this.saveTimers.set(uri, timer);
  }
  
  // Cleanup
  dispose() {
    this.models.forEach(model => model.dispose());
    this.models.clear();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
```

### Custom Language Registration

```typescript
// src/renderer/languages/customLanguage.ts
export function registerCustomLanguage() {
  // Register language
  monaco.languages.register({
    id: 'primus-spec',
    extensions: ['.spec.md'],
    aliases: ['Primus Spec', 'spec'],
  });
  
  // Define syntax highlighting
  monaco.languages.setMonarchTokensProvider('primus-spec', {
    tokenizer: {
      root: [
        // Frontmatter
        [/^---$/, 'frontmatter.delimiter'],
        [/^(id|name|version|status|priority):\s*/, 'frontmatter.key'],
        
        // Markdown headers
        [/^#{1,6}\s+.*$/, 'header'],
        
        // Task references
        [/TASK:\d+/, 'task.reference'],
        
        // Code blocks
        [/^```.*$/, 'code.delimiter'],
        
        // Lists
        [/^\s*[-*+]\s+/, 'list.bullet'],
        [/^\s*\d+\.\s+/, 'list.number'],
        
        // Bold and italic
        [/\*\*.*?\*\*/, 'bold'],
        [/\*.*?\*/, 'italic'],
        
        // Links
        [/\[.*?\]\(.*?\)/, 'link'],
      ],
    },
  });
  
  // Define language configuration
  monaco.languages.setLanguageConfiguration('primus-spec', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['[', ']'],
      ['(', ')'],
      ['{', '}'],
    ],
    autoClosingPairs: [
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '{', close: '}' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
    ],
    surroundingPairs: [
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '{', close: '}' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
    ],
    folding: {
      markers: {
        start: /^---$/,
        end: /^---$/,
      },
    },
  });
  
  // Register completion provider
  monaco.languages.registerCompletionItemProvider('primus-spec', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      
      const suggestions: monaco.languages.CompletionItem[] = [
        {
          label: 'spec-template',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            '---',
            'id: ${1:spec-id}',
            'name: ${2:Spec Name}',
            'version: ${3:1.0.0}',
            'status: ${4:draft}',
            'priority: ${5:P1}',
            '---',
            '',
            '## Overview',
            '${6:Description}',
            '',
            '## Requirements',
            '${7:Requirements}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          documentation: 'Insert spec template',
        },
        {
          label: 'task-ref',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'TASK:${1:id}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          documentation: 'Insert task reference',
        },
      ];
      
      return { suggestions };
    },
  });
}
```

### Advanced Decorations and Markers

```typescript
// src/renderer/services/EditorDecorationService.ts
export class EditorDecorationService {
  private decorations = new Map<string, string[]>();
  
  // Highlight search results
  highlightSearchResults(
    editor: monaco.editor.IStandaloneCodeEditor,
    query: string,
    options: { caseSensitive?: boolean; wholeWord?: boolean; regex?: boolean } = {}
  ) {
    const model = editor.getModel();
    if (!model) return;
    
    const matches = model.findMatches(
      query,
      true, // searchOnlyEditableRange
      options.regex || false,
      options.caseSensitive || false,
      options.wholeWord ? '\\b' : null,
      true // captureMatches
    );
    
    const decorations = matches.map(match => ({
      range: match.range,
      options: {
        isWholeLine: false,
        className: 'search-highlight',
        overviewRuler: {
          color: 'rgba(255, 165, 0, 0.5)',
          position: monaco.editor.OverviewRulerLane.Center,
        },
        minimap: {
          color: 'rgba(255, 165, 0, 0.5)',
          position: monaco.editor.MinimapPosition.Inline,
        },
      },
    }));
    
    const decorationIds = editor.deltaDecorations([], decorations);
    this.decorations.set('search', decorationIds);
  }
  
  // Clear search highlights
  clearSearchHighlights(editor: monaco.editor.IStandaloneCodeEditor) {
    const decorationIds = this.decorations.get('search') || [];
    editor.deltaDecorations(decorationIds, []);
    this.decorations.delete('search');
  }
  
  // Show error/warning decorations
  setDiagnostics(
    editor: monaco.editor.IStandaloneCodeEditor,
    diagnostics: Array<{
      range: monaco.IRange;
      message: string;
      severity: 'error' | 'warning' | 'info';
    }>
  ) {
    const model = editor.getModel();
    if (!model) return;
    
    // Set Monaco markers
    const markers = diagnostics.map(diag => ({
      startLineNumber: diag.range.startLineNumber,
      startColumn: diag.range.startColumn,
      endLineNumber: diag.range.endLineNumber,
      endColumn: diag.range.endColumn,
      message: diag.message,
      severity: this.getSeverity(diag.severity),
    }));
    
    monaco.editor.setModelMarkers(model, 'primus', markers);
  }
  
  private getSeverity(severity: string): monaco.MarkerSeverity {
    switch (severity) {
      case 'error':
        return monaco.MarkerSeverity.Error;
      case 'warning':
        return monaco.MarkerSeverity.Warning;
      case 'info':
        return monaco.MarkerSeverity.Info;
      default:
        return monaco.MarkerSeverity.Hint;
    }
  }
  
  // Add inline hints (like TypeScript parameter hints)
  addInlayHints(
    editor: monaco.editor.IStandaloneCodeEditor,
    hints: Array<{
      position: monaco.IPosition;
      text: string;
      kind: 'parameter' | 'type';
    }>
  ) {
    const model = editor.getModel();
    if (!model) return;
    
    const decorations = hints.map(hint => ({
      range: new monaco.Range(
        hint.position.lineNumber,
        hint.position.column,
        hint.position.lineNumber,
        hint.position.column
      ),
      options: {
        description: 'inlay-hint',
        after: {
          content: hint.text,
          inlineClassName: `inlay-hint ${hint.kind}`,
        },
      },
    }));
    
    const decorationIds = editor.deltaDecorations([], decorations);
    this.decorations.set('inlayHints', decorationIds);
  }
  
  // Show code lens (clickable annotations above lines)
  registerCodeLensProvider(language: string) {
    return monaco.languages.registerCodeLensProvider(language, {
      provideCodeLenses: async (model, token) => {
        // Example: Show "Run" button above test functions
        const text = model.getValue();
        const regex = /^(\s*)(it|test)\s*\(/gm;
        const lenses: monaco.languages.CodeLens[] = [];
        
        let match;
        while ((match = regex.exec(text)) !== null) {
          const position = model.getPositionAt(match.index);
          
          lenses.push({
            range: {
              startLineNumber: position.lineNumber,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: 1,
            },
            command: {
              id: 'primus.runTest',
              title: '▶ Run Test',
              arguments: [model.uri.toString(), position.lineNumber],
            },
          });
        }
        
        return { lenses, dispose: () => {} };
      },
    });
  }
}
```

### Diff Editor Integration

```typescript
// src/renderer/components/DiffEditor/DiffEditor.tsx
import * as monaco from 'monaco-editor';

export function DiffEditor({
  original,
  modified,
  language = 'typescript',
}: {
  original: string;
  modified: string;
  language?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create diff editor
    const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
      enableSplitViewResizing: true,
      renderSideBySide: true,
      readOnly: false,
      automaticLayout: true,
      
      // Diff options
      ignoreTrimWhitespace: true,
      renderIndicators: true,
      
      // Same editor options as regular editor
      theme: 'vs-dark',
      fontSize: 14,
      minimap: { enabled: false },
    });
    
    // Create models
    const originalModel = monaco.editor.createModel(original, language);
    const modifiedModel = monaco.editor.createModel(modified, language);
    
    // Set models
    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel,
    });
    
    diffEditorRef.current = diffEditor;
    
    return () => {
      originalModel.dispose();
      modifiedModel.dispose();
      diffEditor.dispose();
    };
  }, [original, modified, language]);
  
  // Navigate to next/previous diff
  const goToNextDiff = useCallback(() => {
    diffEditorRef.current?.getModifiedEditor().getAction('editor.action.diffReview.next')?.run();
  }, []);
  
  const goToPrevDiff = useCallback(() => {
    diffEditorRef.current?.getModifiedEditor().getAction('editor.action.diffReview.prev')?.run();
  }, []);
  
  return (
    <div style={{ height: '100%' }}>
      <div className="diff-toolbar">
        <button onClick={goToPrevDiff}>Previous Change</button>
        <button onClick={goToNextDiff}>Next Change</button>
      </div>
      <div ref={containerRef} style={{ height: 'calc(100% - 40px)' }} />
    </div>
  );
}
```

### Custom Commands and Actions

```typescript
// src/renderer/services/EditorCommandService.ts
export function registerCustomCommands(editor: monaco.editor.IStandaloneCodeEditor) {
  // Command: Format selection or document
  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
    () => {
      editor.getAction('editor.action.formatDocument')?.run();
    }
  );
  
  // Command: Duplicate line
  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD,
    () => {
      const selection = editor.getSelection();
      if (!selection) return;
      
      const model = editor.getModel();
      if (!model) return;
      
      const lineContent = model.getLineContent(selection.startLineNumber);
      
      editor.executeEdits('duplicate-line', [{
        range: {
          startLineNumber: selection.endLineNumber,
          startColumn: model.getLineMaxColumn(selection.endLineNumber),
          endLineNumber: selection.endLineNumber,
          endColumn: model.getLineMaxColumn(selection.endLineNumber),
        },
        text: '\n' + lineContent,
      }]);
    }
  );
  
  // Command: Move line up
  editor.addCommand(
    monaco.KeyMod.Alt | monaco.KeyCode.UpArrow,
    () => {
      editor.getAction('editor.action.moveLinesUpAction')?.run();
    }
  );
  
  // Command: Move line down
  editor.addCommand(
    monaco.KeyMod.Alt | monaco.KeyCode.DownArrow,
    () => {
      editor.getAction('editor.action.moveLinesDownAction')?.run();
    }
  );
  
  // Command: Toggle comment
  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
    () => {
      editor.getAction('editor.action.commentLine')?.run();
    }
  );
  
  // Custom action: Insert console.log
  editor.addAction({
    id: 'primus.insertConsoleLog',
    label: 'Insert console.log',
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL,
    ],
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    run: (ed) => {
      const selection = ed.getSelection();
      if (!selection) return;
      
      const model = ed.getModel();
      if (!model) return;
      
      const selectedText = model.getValueInRange(selection);
      const insertText = selectedText
        ? `console.log('${selectedText}:', ${selectedText});`
        : `console.log();`;
      
      ed.executeEdits('insert-console-log', [{
        range: selection,
        text: insertText,
      }]);
    },
  });
  
  // Custom action: Go to task reference
  editor.addAction({
    id: 'primus.goToTask',
    label: 'Go to Task',
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT,
    ],
    run: async (ed) => {
      const selection = ed.getSelection();
      if (!selection) return;
      
      const model = ed.getModel();
      if (!model) return;
      
      const word = model.getWordAtPosition(selection.getStartPosition());
      if (word && /^TASK:\d+$/.test(word.word)) {
        const taskId = word.word.split(':')[1];
        await window.primus.tasks.openTask(taskId);
      }
    },
  });
}
```

### Performance Monitoring

```typescript
// src/renderer/services/EditorPerformanceMonitor.ts
export class EditorPerformanceMonitor {
  private metrics = {
    modelLoadTime: 0,
    renderTime: 0,
    tokenizationTime: 0,
  };
  
  monitorModelLoad(model: monaco.editor.ITextModel) {
    const start = performance.now();
    
    // Wait for tokenization
    model.onDidChangeContent(() => {
      const end = performance.now();
      this.metrics.tokenizationTime = end - start;
      
      console.log('Tokenization time:', this.metrics.tokenizationTime, 'ms');
    });
  }
  
  monitorRenderPerformance(editor: monaco.editor.IStandaloneCodeEditor) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          console.log('Render time:', entry.duration, 'ms');
          this.metrics.renderTime = entry.duration;
        }
      }
    });
    
    observer.observe({ entryTypes: ['measure'] });
  }
  
  getMetrics() {
    return this.metrics;
  }
}
```

---

**Last Updated:** November 4, 2025  
**Expertise Level:** God-Tier  
**Use When:** Advanced Monaco integration, custom languages, editor features
