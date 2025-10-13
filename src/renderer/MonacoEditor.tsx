import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { useTheme } from './ThemeContext';
// Inline AI action bar temporarily disabled to unblock build
// import InlineAIActionBar from './components/InlineAIActionBar';
import { AIRequest } from '../shared/aiTypes';

interface MonacoEditorProps {
  value: string;
  language: string;
  onChange?: (value: string) => void;
  minimapEnabled?: boolean;
  /** Optional Monaco editor construction options to override defaults */
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  onSelectionChange?: (payload: EditorSelectionPayload | null) => void;
  onCursorPositionChange?: (position: monaco.Position) => void;
}

export interface EditorSelectionPayload {
  selection: monaco.Selection;
  selectedText: string;
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  modelUri?: string;
}

export interface MonacoEditorHandle {
  getEditor: () => monaco.editor.IStandaloneCodeEditor | null;
  getValue: () => string;
  setValue: (value: string) => void;
  getAction: (actionId: string) => monaco.editor.IEditorAction | null;
  revealLine: (lineNumber: number) => void;
  setPosition: (position: { lineNumber: number; column: number }) => void;
  getSelection: () => monaco.Selection | null;
  getSelectedText: () => string;
  getCursorPosition: () => monaco.Position | null;
  revealOffset?: (offset: number) => void; // new optional helper
}

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(({ 
  value, 
  language, 
  onChange,
  minimapEnabled = false,
  options,
  onSelectionChange,
  onCursorPositionChange
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { effectiveTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectionMeta, setSelectionMeta] = useState<{ top: number; left: number; code: string; filePath?: string } | null>(null);
  const [sending, setSending] = useState(false);

  const clearSelectionMeta = useCallback(() => setSelectionMeta(null), []);

  const handleSelectionChange = useCallback(
    (selection: monaco.Selection | null = null) => {
      const editor = monacoRef.current;
      if (!editor) {
        return;
      }
      const sel = selection ?? editor.getSelection();
      if (!sel || sel.isEmpty()) {
        clearSelectionMeta();
        onSelectionChange?.(null);
        return;
      }
      const model = editor.getModel();
      if (!model) {
        onSelectionChange?.(null);
        return;
      }
      const selectedText = model.getValueInRange(sel);
      if (!selectedText.trim()) {
        clearSelectionMeta();
        onSelectionChange?.(null);
        return;
      }
      const domNode = editor.getDomNode();
      if (!domNode) {
        onSelectionChange?.(null);
        return;
      }
      const topForLine = editor.getTopForLineNumber(sel.startLineNumber);
      const { lineNumber, column } = { lineNumber: sel.startLineNumber, column: sel.startColumn };
      const pos = editor.getScrolledVisiblePosition({ lineNumber, column });
      if (!pos) {
        clearSelectionMeta();
        onSelectionChange?.(null);
        return;
      }
      const top = pos.top + topForLine - 24;
      const left = pos.left + 8;
      setSelectionMeta({ top, left, code: selectedText });
      onSelectionChange?.({
        selection: sel,
        selectedText,
        range: {
          startLineNumber: sel.startLineNumber,
          startColumn: sel.startColumn,
          endLineNumber: sel.endLineNumber,
          endColumn: sel.endColumn
        },
        modelUri: model.uri?.toString()
      });
    },
    [clearSelectionMeta, onSelectionChange]
  );

  const explainSelection = useCallback(async () => {
    if (!selectionMeta || sending || !monacoRef.current) return;
    setSending(true);
    try {
      const model = monacoRef.current.getModel();
      const sel = monacoRef.current.getSelection();
      if (!model || !sel) return;
      const code = selectionMeta.code;
      const lines = code.split(/\r?\n/);
      let truncated = false;
      if (lines.length > 400) {
        truncated = true;
        lines.splice(400);
      }
      let trimmed = lines.join('\n');
      if (trimmed.length > 20000) { // additional hard cap by chars
        trimmed = trimmed.slice(0, 20000) + '\n/* ... truncated (char limit) ... */';
        truncated = true;
      }
      const prompt = `Explain the following code selection (lines ${sel.startLineNumber}-${sel.endLineNumber}) focusing on purpose, data flow, side effects, and potential improvements.\n\n\n${'```'}${model.getLanguageId()}\n${trimmed}\n${'```'}`;
      const req: AIRequest = {
        id: `inline_explain_${Date.now()}`,
        operation: 'explain',
        prompt,
        editorSelection: {
          filePath: (model as any).uri?.fsPath || (model as any).uri?.path || 'in-memory',
          languageId: model.getLanguageId(),
          startLine: sel.startLineNumber,
            endLine: sel.endLineNumber,
          startColumn: sel.startColumn,
          endColumn: sel.endColumn,
          code: truncated ? trimmed + '\n/* ... truncated ... */' : trimmed,
          truncated
        }
      };
      const res = await (window as any).primus.ai.request(req);
      if ((res as any).error) {
        console.warn('AI explain error', res.error);
      } else {
        // For now just log; future: surface in side panel or inline diff
        
      }
    } catch (e:any) {
      console.error('Inline explain failed', e);
    } finally {
      setSending(false);
    }
  }, [selectionMeta, sending]);

  // TODO (Inline AI Roadmap):
  // - Centralize AI request dispatch via a dedicated hook (e.g. useInlineAI()) to share state across tabs.
  // - Provide visual inline result panel (markdown render + collapse) anchored to selection range.
  // - Add optimistic ghost text insertion for refactor preview with accept/reject controls.
  // - Support multi-selection or block selections (collect & batch into single prompt with separators).
  // - Stream partial explanation tokens into a hovering panel instead of console logging.
  // - Integrate with code changes panel to create a structured diff from refactor/test generation operations.

  // Expose editor methods through ref
  useImperativeHandle(ref, () => ({
    getEditor: () => monacoRef.current,
    getValue: () => monacoRef.current?.getValue() || '',
    setValue: (newValue: string) => monacoRef.current?.setValue(newValue),
    getAction: (actionId: string) => monacoRef.current?.getAction(actionId) || null,
    revealLine: (lineNumber: number) => monacoRef.current?.revealLine(lineNumber),
    setPosition: (position: { lineNumber: number; column: number }) =>
      monacoRef.current?.setPosition(position),
    getSelection: () => monacoRef.current?.getSelection() ?? null,
    getSelectedText: () => {
      const editor = monacoRef.current;
      if (!editor) {
        return '';
      }
      const model = editor.getModel();
      const selection = editor.getSelection();
      if (!model || !selection) {
        return '';
      }
      return model.getValueInRange(selection);
    },
    getCursorPosition: () => monacoRef.current?.getPosition() ?? null,
    revealOffset: (offset: number) => {
      if (!monacoRef.current) return;
      const model = monacoRef.current.getModel();
      if (!model) return;
      const pos = model.getPositionAt(offset);
      monacoRef.current.revealPositionInCenter(pos);
      monacoRef.current.setPosition(pos);
      monacoRef.current.focus();
    }
  }), []);

  useEffect(() => {
    if (editorRef.current && !monacoRef.current) {
      const baseOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
        value,
        language,
        theme: effectiveTheme === 'dark' ? 'vs-dark' : 'vs',
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        minimap: { enabled: minimapEnabled },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        wordWrap: 'off',
        tabSize: 2,
        insertSpaces: true,
        rulers: [80, 120],
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true
        }
      };

      // Merge user provided options, but enforce critical basics (value, language, theme)
      const finalOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
        ...baseOptions,
        ...(options || {}),
        value,
        language,
        theme: baseOptions.theme
      };

      monacoRef.current = monaco.editor.create(editorRef.current, finalOptions);

      monacoRef.current.onDidChangeModelContent(() => {
        if (onChange) {
          onChange(monacoRef.current!.getValue());
        }
      });

  // AI provider registration disabled in minimal build

    }

    return () => {
  // Cleanup AI providers (none in minimal build)
      
      if (monacoRef.current) {
        monacoRef.current.dispose();
        monacoRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!monacoRef.current) {
      return;
    }
    const editor = monacoRef.current;
    const disposable = editor.onDidChangeCursorSelection(e => {
      handleSelectionChange(e.selection);
    });
    handleSelectionChange(editor.getSelection());
    return () => {
      disposable.dispose();
    };
  }, [handleSelectionChange]);

  useEffect(() => {
    if (!monacoRef.current || !onCursorPositionChange) {
      return;
    }
    const editor = monacoRef.current;
    const disposable = editor.onDidChangeCursorPosition(e => {
      onCursorPositionChange(e.position);
    });
    const position = editor.getPosition();
    if (position) {
      onCursorPositionChange(position);
    }
    return () => {
      disposable.dispose();
    };
  }, [onCursorPositionChange]);

  useEffect(() => {
    if (monacoRef.current && monacoRef.current.getValue() !== value) {
      monacoRef.current.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (monacoRef.current) {
      const model = monacoRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [language]);

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.updateOptions({
        theme: effectiveTheme === 'dark' ? 'vs-dark' : 'vs'
      });
    }
  }, [effectiveTheme]);

  // Update minimap when enabled/disabled
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.updateOptions({
        minimap: { enabled: minimapEnabled }
      });
    }
  }, [minimapEnabled]);

  return (
    <div ref={editorRef} className="monaco-editor monaco-editor-with-inline-bar">
      {/* InlineAIActionBar disabled in minimal build */}
    </div>
  );
});

MonacoEditor.displayName = 'MonacoEditor';
