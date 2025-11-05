# React + TypeScript Mastery - God-Level Expertise

## Advanced React Patterns for Primus IDE

### Component Architecture Excellence

#### 1. Compound Component Pattern

**Problem:** Tightly coupled components with prop drilling  
**Solution:** Use React Context with compound components

```typescript
// src/renderer/components/Editor/EditorTabs.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Internal context (not exported)
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => void;
  tabs: Tab[];
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within Tabs');
  }
  return context;
}

// Main component
interface TabsProps {
  children: ReactNode;
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
}

export function Tabs({ children, defaultTab, onTabChange }: TabsProps) {
  const [activeTab, setActiveTabState] = useState(defaultTab || '');
  const [tabs, setTabs] = useState<Tab[]>([]);
  
  const setActiveTab = (id: string) => {
    setActiveTabState(id);
    onTabChange?.(id);
  };
  
  const closeTab = (id: string) => {
    setTabs(prev => prev.filter(tab => tab.id !== id));
    
    // Switch to next tab
    const index = tabs.findIndex(tab => tab.id === id);
    if (activeTab === id && tabs.length > 1) {
      const nextTab = tabs[index + 1] || tabs[index - 1];
      setActiveTab(nextTab.id);
    }
  };
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, closeTab, tabs }}>
      <div className="tabs-container">
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// Sub-components
Tabs.List = function TabsList({ children }: { children: ReactNode }) {
  const { tabs, activeTab, setActiveTab, closeTab } = useTabs();
  
  return (
    <div className="tabs-list">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span>{tab.title}</span>
          <button onClick={(e) => {
            e.stopPropagation();
            closeTab(tab.id);
          }}>×</button>
        </div>
      ))}
    </div>
  );
};

Tabs.Panel = function TabPanel({ 
  id, 
  children 
}: { 
  id: string; 
  children: ReactNode 
}) {
  const { activeTab } = useTabs();
  
  if (activeTab !== id) return null;
  
  return <div className="tab-panel">{children}</div>;
};

// Usage
<Tabs defaultTab="file1">
  <Tabs.List />
  <Tabs.Panel id="file1">
    <MonacoEditor content={file1Content} />
  </Tabs.Panel>
  <Tabs.Panel id="file2">
    <MonacoEditor content={file2Content} />
  </Tabs.Panel>
</Tabs>
```

#### 2. Render Props Pattern (Advanced)

```typescript
// src/renderer/components/VirtualList/VirtualList.tsx
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 3,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + height) / itemHeight);
  
  const start = Math.max(0, visibleStart - overscan);
  const end = Math.min(items.length, visibleEnd + overscan);
  
  const visibleItems = items.slice(start, end);
  
  return (
    <div
      style={{ height, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={start + index}
            style={{
              position: 'absolute',
              top: (start + index) * itemHeight,
              height: itemHeight,
              width: '100%',
            }}
          >
            {renderItem(item, start + index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Usage in FileExplorer
<VirtualList
  items={files}
  itemHeight={24}
  height={600}
  renderItem={(file, index) => (
    <FileItem
      file={file}
      onClick={() => openFile(file.path)}
      onContextMenu={(e) => showContextMenu(e, file)}
    />
  )}
/>
```

#### 3. Higher-Order Components for Cross-Cutting Concerns

```typescript
// src/renderer/hoc/withErrorBoundary.tsx
import React, { Component, ComponentType, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  FallbackComponent?: ComponentType<{ error: Error; reset: () => void }>
) {
  return class extends Component<P, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };
    
    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
      return { hasError: true, error };
    }
    
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Error caught by boundary:', error, errorInfo);
      
      // Send to error reporting service
      window.primus.app.reportError({
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
    
    reset = () => {
      this.setState({ hasError: false, error: undefined });
    };
    
    render() {
      if (this.state.hasError && this.state.error) {
        if (FallbackComponent) {
          return <FallbackComponent error={this.state.error} reset={this.reset} />;
        }
        
        return (
          <div className="error-boundary">
            <h2>Something went wrong</h2>
            <pre>{this.state.error.message}</pre>
            <button onClick={this.reset}>Try Again</button>
          </div>
        );
      }
      
      return <WrappedComponent {...this.props} />;
    }
  };
}

// Usage
const SafeMonacoEditor = withErrorBoundary(MonacoEditor, EditorErrorFallback);
```

### Advanced Hooks Mastery

#### 1. Custom Hook for File Operations

```typescript
// src/renderer/hooks/useFileOperations.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';

interface UseFileOperationsReturn {
  files: FileEntry[];
  loading: boolean;
  error: Error | null;
  
  // Operations
  readDirectory: (path: string) => Promise<void>;
  createFile: (path: string, content?: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  
  // Watching
  watchDirectory: (path: string) => void;
  unwatchDirectory: (path: string) => void;
}

export function useFileOperations(): UseFileOperationsReturn {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { workspaceRoot } = useWorkspace();
  
  // Track watchers for cleanup
  const watchers = useRef<Map<string, () => void>>(new Map());
  
  const readDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const entries = await window.primus.fs.readDir(path);
      setFiles(entries);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const createFile = useCallback(async (path: string, content = '') => {
    try {
      await window.primus.fs.writeFile(path, content);
      await readDirectory(workspaceRoot);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [workspaceRoot, readDirectory]);
  
  const deleteFile = useCallback(async (path: string) => {
    try {
      await window.primus.fs.delete(path);
      setFiles(prev => prev.filter(f => f.path !== path));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);
  
  const renameFile = useCallback(async (oldPath: string, newPath: string) => {
    try {
      await window.primus.fs.rename(oldPath, newPath);
      await readDirectory(workspaceRoot);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [workspaceRoot, readDirectory]);
  
  const watchDirectory = useCallback((path: string) => {
    if (watchers.current.has(path)) return;
    
    const cleanup = window.primus.fs.onFileChanged((changedPath) => {
      if (changedPath.startsWith(path)) {
        readDirectory(path);
      }
    });
    
    watchers.current.set(path, cleanup);
  }, [readDirectory]);
  
  const unwatchDirectory = useCallback((path: string) => {
    const cleanup = watchers.current.get(path);
    if (cleanup) {
      cleanup();
      watchers.current.delete(path);
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      watchers.current.forEach(cleanup => cleanup());
      watchers.current.clear();
    };
  }, []);
  
  return {
    files,
    loading,
    error,
    readDirectory,
    createFile,
    deleteFile,
    renameFile,
    watchDirectory,
    unwatchDirectory,
  };
}
```

#### 2. Advanced State Management Hook

```typescript
// src/renderer/hooks/useMonacoEditor.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';

interface UseMonacoEditorOptions {
  language?: string;
  theme?: string;
  readOnly?: boolean;
  minimap?: boolean;
}

export function useMonacoEditor(
  containerRef: React.RefObject<HTMLDivElement>,
  options: UseMonacoEditorOptions = {}
) {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [model, setModel] = useState<monaco.editor.ITextModel | null>(null);
  const modelsCache = useRef<Map<string, monaco.editor.ITextModel>>(new Map());
  
  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;
    
    const editorInstance = monaco.editor.create(containerRef.current, {
      language: options.language || 'typescript',
      theme: options.theme || 'vs-dark',
      readOnly: options.readOnly || false,
      automaticLayout: true,
      minimap: { enabled: options.minimap ?? true },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      tabSize: 2,
    });
    
    setEditor(editorInstance);
    
    return () => {
      editorInstance.dispose();
    };
  }, [containerRef]);
  
  // Open file in editor
  const openFile = useCallback(async (filePath: string) => {
    if (!editor) return;
    
    // Check cache first
    let cachedModel = modelsCache.current.get(filePath);
    
    if (!cachedModel) {
      const content = await window.primus.fs.readFile(filePath);
      const language = detectLanguage(filePath);
      
      cachedModel = monaco.editor.createModel(content, language, monaco.Uri.file(filePath));
      modelsCache.current.set(filePath, cachedModel);
    }
    
    editor.setModel(cachedModel);
    setModel(cachedModel);
  }, [editor]);
  
  // Save current file
  const saveFile = useCallback(async () => {
    if (!model) return;
    
    const content = model.getValue();
    const uri = model.uri.toString();
    const filePath = uri.replace('file://', '');
    
    await window.primus.fs.writeFile(filePath, content);
  }, [model]);
  
  // Close file and dispose model
  const closeFile = useCallback((filePath: string) => {
    const cachedModel = modelsCache.current.get(filePath);
    if (cachedModel) {
      cachedModel.dispose();
      modelsCache.current.delete(filePath);
    }
  }, []);
  
  // Get current content
  const getContent = useCallback(() => {
    return model?.getValue() || '';
  }, [model]);
  
  // Set content
  const setContent = useCallback((content: string) => {
    model?.setValue(content);
  }, [model]);
  
  // Go to line
  const goToLine = useCallback((lineNumber: number) => {
    editor?.revealLineInCenter(lineNumber);
    editor?.setPosition({ lineNumber, column: 1 });
  }, [editor]);
  
  // Find and replace
  const findAndReplace = useCallback((find: string, replace: string) => {
    if (!editor || !model) return;
    
    const matches = model.findMatches(
      find,
      true, // searchOnlyEditableRange
      false, // isRegex
      true, // matchCase
      null, // wordSeparators
      true // captureMatches
    );
    
    editor.executeEdits('find-replace', matches.map(match => ({
      range: match.range,
      text: replace,
    })));
  }, [editor, model]);
  
  // Register LSP providers
  const registerLSPProviders = useCallback(() => {
    if (!editor) return;
    
    // Definition provider
    const definitionProvider = monaco.languages.registerDefinitionProvider('typescript', {
      provideDefinition: async (model, position) => {
        const result = await window.primus.lsp.goToDefinition({
          uri: model.uri.toString(),
          position: { line: position.lineNumber, column: position.column },
        });
        
        return result.locations.map((loc: any) => ({
          uri: monaco.Uri.parse(loc.uri),
          range: new monaco.Range(
            loc.range.start.line,
            loc.range.start.column,
            loc.range.end.line,
            loc.range.end.column
          ),
        }));
      },
    });
    
    // Hover provider
    const hoverProvider = monaco.languages.registerHoverProvider('typescript', {
      provideHover: async (model, position) => {
        const result = await window.primus.lsp.hover({
          uri: model.uri.toString(),
          position: { line: position.lineNumber, column: position.column },
        });
        
        return {
          contents: result.contents.map((content: any) => ({
            value: content.value,
          })),
        };
      },
    });
    
    // Completion provider
    const completionProvider = monaco.languages.registerCompletionItemProvider('typescript', {
      triggerCharacters: ['.', '/', '@'],
      
      provideCompletionItems: async (model, position) => {
        const result = await window.primus.lsp.complete({
          uri: model.uri.toString(),
          position: { line: position.lineNumber, column: position.column },
        });
        
        return {
          suggestions: result.items.map((item: any) => ({
            label: item.label,
            kind: monaco.languages.CompletionItemKind[item.kind],
            insertText: item.insertText,
            documentation: item.documentation,
          })),
        };
      },
    });
    
    return () => {
      definitionProvider.dispose();
      hoverProvider.dispose();
      completionProvider.dispose();
    };
  }, [editor]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      modelsCache.current.forEach(model => model.dispose());
      modelsCache.current.clear();
    };
  }, []);
  
  return {
    editor,
    model,
    openFile,
    saveFile,
    closeFile,
    getContent,
    setContent,
    goToLine,
    findAndReplace,
    registerLSPProviders,
  };
}
```

#### 3. Debounce and Throttle Hooks

```typescript
// src/renderer/hooks/useDebounce.ts
import { useEffect, useState, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// src/renderer/hooks/useThrottle.ts
export function useThrottle<T>(value: T, limit: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));
    
    return () => clearTimeout(timer);
  }, [value, limit]);
  
  return throttledValue;
}

// Usage in SearchPanel
export function SearchPanel() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery]);
  
  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### Performance Optimization Patterns

#### 1. Memoization Mastery

```typescript
// src/renderer/components/FileExplorer/FileTree.tsx
import { memo, useMemo, useCallback } from 'react';

interface FileTreeProps {
  files: FileEntry[];
  onFileClick: (path: string) => void;
  onFileContextMenu: (event: React.MouseEvent, file: FileEntry) => void;
}

// Memoize entire component
export const FileTree = memo(function FileTree({
  files,
  onFileClick,
  onFileContextMenu,
}: FileTreeProps) {
  // Memoize expensive tree computation
  const fileTree = useMemo(() => {
    return buildFileTree(files);
  }, [files]);
  
  // Memoize callbacks (critical for preventing re-renders)
  const handleClick = useCallback((path: string) => {
    onFileClick(path);
  }, [onFileClick]);
  
  const handleContextMenu = useCallback((event: React.MouseEvent, file: FileEntry) => {
    event.preventDefault();
    onFileContextMenu(event, file);
  }, [onFileContextMenu]);
  
  return (
    <div className="file-tree">
      {fileTree.map(node => (
        <FileNode
          key={node.path}
          node={node}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison (shallow comparison not enough)
  return (
    prevProps.files.length === nextProps.files.length &&
    prevProps.onFileClick === nextProps.onFileClick &&
    prevProps.onFileContextMenu === nextProps.onFileContextMenu
  );
});

// Memoize individual nodes
const FileNode = memo(function FileNode({
  node,
  onClick,
  onContextMenu,
}: {
  node: FileTreeNode;
  onClick: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, file: FileEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="file-node">
      <div
        className="file-item"
        onClick={() => onClick(node.path)}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        {node.type === 'directory' && (
          <button onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}>
            {expanded ? '▼' : '▶'}
          </button>
        )}
        <span>{node.name}</span>
      </div>
      
      {expanded && node.children && (
        <div className="file-children">
          {node.children.map(child => (
            <FileNode
              key={child.path}
              node={child}
              onClick={onClick}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
});
```

#### 2. Code Splitting and Lazy Loading

```typescript
// src/renderer/App.tsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const MonacoEditor = lazy(() => import('./components/Editor/MonacoEditor'));
const SettingsPanel = lazy(() => import('./components/Settings/SettingsPanel'));
const AIChat = lazy(() => import('./components/AI/AIChat'));

// Loading fallback
function LoadingFallback({ message }: { message?: string }) {
  return (
    <div className="loading-fallback">
      <div className="spinner" />
      <p>{message || 'Loading...'}</p>
    </div>
  );
}

export function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showAI, setShowAI] = useState(false);
  
  return (
    <div className="app">
      <Suspense fallback={<LoadingFallback message="Loading editor..." />}>
        <MonacoEditor />
      </Suspense>
      
      {showSettings && (
        <Suspense fallback={<LoadingFallback message="Loading settings..." />}>
          <SettingsPanel />
        </Suspense>
      )}
      
      {showAI && (
        <Suspense fallback={<LoadingFallback message="Loading AI chat..." />}>
          <AIChat />
        </Suspense>
      )}
    </div>
  );
}
```

#### 3. Virtual Scrolling for Large Lists

```typescript
// src/renderer/components/ProblemsPanel/ProblemsPanel.tsx
import { FixedSizeList } from 'react-window';

interface Problem {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export function ProblemsPanel({ problems }: { problems: Problem[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const problem = problems[index];
    
    return (
      <div style={style} className={`problem ${problem.severity}`}>
        <span className="file">{problem.file}:{problem.line}</span>
        <span className="message">{problem.message}</span>
      </div>
    );
  };
  
  return (
    <FixedSizeList
      height={400}
      itemCount={problems.length}
      itemSize={32}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Advanced TypeScript Patterns

#### 1. Discriminated Unions for State Management

```typescript
// src/renderer/types/editorState.ts
type EditorState =
  | { status: 'idle' }
  | { status: 'loading'; progress: number }
  | { status: 'editing'; file: string; content: string; isDirty: boolean }
  | { status: 'saving'; file: string }
  | { status: 'error'; error: Error };

// Reducer with exhaustive checking
function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'OPEN_FILE':
      return { status: 'loading', progress: 0 };
      
    case 'FILE_LOADED':
      return {
        status: 'editing',
        file: action.file,
        content: action.content,
        isDirty: false,
      };
      
    case 'CONTENT_CHANGED':
      if (state.status !== 'editing') return state;
      return { ...state, content: action.content, isDirty: true };
      
    case 'SAVE_FILE':
      if (state.status !== 'editing') return state;
      return { status: 'saving', file: state.file };
      
    case 'SAVE_COMPLETE':
      if (state.status !== 'saving') return state;
      return { status: 'editing', file: state.file, content: '', isDirty: false };
      
    case 'ERROR':
      return { status: 'error', error: action.error };
      
    default:
      // TypeScript ensures all cases are handled
      const _exhaustive: never = action;
      return state;
  }
}
```

#### 2. Generic Components with Constraints

```typescript
// src/renderer/components/Select/Select.tsx
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps<T extends SelectOption> {
  options: T[];
  value: T['value'];
  onChange: (value: T['value']) => void;
  renderOption?: (option: T) => ReactNode;
}

export function Select<T extends SelectOption>({
  options,
  value,
  onChange,
  renderOption,
}: SelectProps<T>) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {renderOption ? renderOption(option) : option.label}
        </option>
      ))}
    </select>
  );
}

// Usage with type inference
interface LanguageOption extends SelectOption {
  icon: string;
  extensions: string[];
}

<Select<LanguageOption>
  options={languages}
  value={selectedLanguage}
  onChange={setSelectedLanguage}
  renderOption={(lang) => (
    <>
      <img src={lang.icon} alt="" />
      {lang.label}
    </>
  )}
/>
```

---

**Last Updated:** November 4, 2025  
**Expertise Level:** God-Tier  
**Use When:** Building React components, optimizing renderer performance
