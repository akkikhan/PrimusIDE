# Primus IDE - Architecture Guide

## System Architecture

Primus IDE follows a **three-zone Electron architecture** with strict boundaries between processes for security and stability.

```
┌─────────────────────────────────────────────────────────────┐
│                      Operating System                        │
└────────────────────────────┬────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
┌───────▼────────┐                       ┌───────▼────────┐
│  Main Process  │◄─────── IPC ─────────►│    Renderer    │
│   (Node.js)    │                       │     (React)    │
│                │                       │                │
│  - File I/O    │                       │  - Monaco      │
│  - Process     │    ┌─────────────┐    │  - Components  │
│  - IPC Hub     │◄───┤   Preload   │───►│  - UI State    │
│  - Services    │    │  (Bridge)   │    │  - Hooks       │
└────────────────┘    └─────────────┘    └────────────────┘
        │                                         │
        │                                         │
        ▼                                         ▼
  Native APIs                            window.primus.*
```

---

## Process Model

### Main Process (`src/main/`)

**Role:** System orchestrator and resource manager

**Responsibilities:**
- Application lifecycle management
- Window creation and management
- Native menu bar and system tray
- File system operations
- Process spawning (terminal PTY)
- IPC channel registration
- Service initialization

**Key Files:**
- `main.ts` - Entry point, app setup
- `window.ts` - BrowserWindow management
- `ipc/*.ts` - IPC handler registration
- `services/*.ts` - Business logic (LSP, Git, AI)

**Security Model:**
- Full Node.js access
- No direct renderer communication (IPC only)
- Validates all incoming IPC messages
- Sandboxed renderer for safety

### Preload Script (`src/preload/`)

**Role:** Secure API bridge between main and renderer

**Responsibilities:**
- Expose controlled `window.primus.*` API
- Type-safe IPC wrappers
- Context isolation enforcement
- No business logic (pure bridge)

**Key File:**
- `preload.ts` - Entire preload (single file by design)

**Security Model:**
- `contextIsolation: true` (mandatory)
- `nodeIntegration: false` (mandatory)
- Only exposes whitelisted APIs
- No `require()` or `process` access in renderer

**API Structure:**
```typescript
window.primus = {
  fs: { readFile, writeFile, readDir, ... },
  terminal: { spawn, write, resize, ... },
  ai: { request, streamResponse, ... },
  lsp: { goToDefinition, hover, complete, ... },
  git: { status, commit, branch, ... },
  settings: { get, set, getAll, ... },
  app: { getVersion, platform, restart, ... }
}
```

### Renderer Process (`src/renderer/`)

**Role:** User interface and interaction

**Responsibilities:**
- React component rendering
- Monaco editor integration
- User input handling
- State management (React hooks/context)
- Visual feedback and animations

**Key Files:**
- `App.tsx` - Root component (1200+ lines)
- `MonacoEditor.tsx` - Editor wrapper
- `Terminal.tsx` - xterm.js integration
- `FileExplorer.tsx` - Tree view
- `components/` - UI components
- `hooks/` - Custom React hooks
- `contexts/` - React context providers

**Security Model:**
- **Sandboxed** (no Node.js access)
- All system operations via `window.primus.*`
- CSP headers enforced
- No `eval()` or `new Function()`

---

## Communication Patterns

### IPC Flow (Async Request/Response)

```typescript
// 1. Renderer initiates request
const content = await window.primus.fs.readFile('/path/to/file.ts');

// 2. Preload bridges to main
// src/preload/preload.ts
fs: {
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path)
}

// 3. Main handles request
// src/main/ipc/fsHandlers.ts
ipcMain.handle('fs:readFile', async (_, path: string) => {
  return await fs.promises.readFile(path, 'utf-8');
});

// 4. Response flows back to renderer
```

### IPC Flow (Event Streaming)

```typescript
// 1. Main sends events to renderer
// src/main/services/fileWatcher.ts
watcher.on('change', (path) => {
  mainWindow.webContents.send('fs:fileChanged', path);
});

// 2. Preload exposes listener
// src/preload/preload.ts
fs: {
  onFileChanged: (callback: (path: string) => void) => {
    ipcRenderer.on('fs:fileChanged', (_, path) => callback(path));
  }
}

// 3. Renderer subscribes
// src/renderer/FileExplorer.tsx
useEffect(() => {
  const cleanup = window.primus.fs.onFileChanged((path) => {
    refreshFile(path);
  });
  return cleanup;
}, []);
```

---

## Module Organization

### Main Process Structure

```
src/main/
├── main.ts              # App entry, initialization
├── window.ts            # BrowserWindow factory
├── menu.ts              # Native menus
├── ipc/                 # IPC handler modules
│   ├── fsHandlers.ts
│   ├── terminalHandlers.ts
│   ├── lspHandlers.ts
│   └── aiHandlers.ts
├── services/            # Business logic
│   ├── FileSystemService.ts
│   ├── TerminalService.ts
│   ├── LSPService.ts
│   └── GitService.ts
└── utils/               # Helpers
    ├── logger.ts
    ├── pathUtils.ts
    └── processManager.ts
```

### Renderer Structure

```
src/renderer/
├── App.tsx                      # Root component
├── index.tsx                    # React mount point
├── components/                  # React components
│   ├── Editor/
│   │   ├── MonacoEditor.tsx
│   │   ├── EditorTabs.tsx
│   │   └── StatusBar.tsx
│   ├── FileExplorer/
│   │   ├── TreeView.tsx
│   │   └── FileContextMenu.tsx
│   ├── Terminal/
│   │   └── TerminalPanel.tsx
│   └── Panels/
│       ├── SearchPanel.tsx
│       ├── ProblemsPanel.tsx
│       └── AIChatPanel.tsx
├── hooks/                       # Custom hooks
│   ├── useFileOperations.ts
│   ├── useTerminal.ts
│   ├── useMonaco.ts
│   └── useAI.ts
├── contexts/                    # React contexts
│   ├── ThemeContext.tsx
│   ├── SettingsContext.tsx
│   └── WorkspaceContext.tsx
└── styles/                      # CSS modules
    ├── App.css
    ├── Editor.css
    └── themes/
```

### Shared Types Structure

```
src/shared/
├── ipcChannels.ts       # Channel name constants
├── fileTypes.ts         # File system types
├── terminalTypes.ts     # Terminal types
├── lspTypes.ts          # LSP protocol types
├── aiTypes.ts           # AI request/response types
├── gitTypes.ts          # Git operation types
└── settingsSchema.ts    # Settings structure
```

---

## Key Design Patterns

### 1. Service Layer Pattern

Business logic encapsulated in service classes:

```typescript
// src/main/services/LSPService.ts
export class LSPService {
  private adapters: Map<string, ILSPAdapter> = new Map();
  
  async getDefinition(uri: string, position: Position) {
    const adapter = this.getAdapterForFile(uri);
    return await adapter.getDefinition(uri, position);
  }
}

// Singleton export
export const lspService = new LSPService();
```

### 2. Adapter Pattern (LSP Integration)

Wrap vendor code (VS Code LSP) with clean interfaces:

```typescript
// src/shared/adapters/ILSPAdapter.ts (interface)
export interface ILSPAdapter {
  initialize(workspaceRoot: string): Promise<void>;
  getDefinition(uri: string, position: Position): Promise<Location[]>;
}

// src/adapters/TypeScriptLSPAdapter.ts (implementation)
export class TypeScriptLSPAdapter implements ILSPAdapter {
  private tsServer: TSServer; // VS Code code wrapped here
  
  async initialize(workspaceRoot: string) {
    this.tsServer = new TSServer(workspaceRoot);
  }
  
  async getDefinition(uri: string, position: Position) {
    return this.tsServer.getDefinitionAtPosition(...);
  }
}
```

### 3. Hook Pattern (React State)

Encapsulate component logic in reusable hooks:

```typescript
// src/renderer/hooks/useFileOperations.ts
export function useFileOperations() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  
  const readDirectory = useCallback(async (path: string) => {
    const entries = await window.primus.fs.readDir(path);
    setFiles(entries);
  }, []);
  
  const deleteFile = useCallback(async (path: string) => {
    await window.primus.fs.delete(path);
    await readDirectory(dirname(path)); // Refresh
  }, [readDirectory]);
  
  return { files, readDirectory, deleteFile };
}
```

### 4. Context Provider Pattern

Share global state without prop drilling:

```typescript
// src/renderer/contexts/ThemeContext.tsx
interface ThemeContextValue {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const ThemeContext = createContext<ThemeContextValue>(null!);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  useEffect(() => {
    // Sync Monaco theme
    monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs-light');
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

## Data Flow Examples

### Opening a File

```
User clicks file in explorer
  ↓
FileExplorer.tsx: handleFileClick(path)
  ↓
await window.primus.fs.readFile(path)
  ↓
[IPC: fs:readFile]
  ↓
main/ipc/fsHandlers.ts: ipcMain.handle('fs:readFile', ...)
  ↓
fs.promises.readFile(path, 'utf-8')
  ↓
[IPC Response: file content]
  ↓
App.tsx: addTab({ path, content })
  ↓
MonacoEditor.tsx: monaco.editor.createModel(content, language)
  ↓
Editor displays file
```

### LSP Go-to-Definition

```
User Ctrl+Click on symbol
  ↓
Monaco triggers definition provider
  ↓
await window.primus.lsp.goToDefinition(uri, position)
  ↓
[IPC: lsp:goToDefinition]
  ↓
main/ipc/lspHandlers.ts
  ↓
lspService.getDefinition(uri, position)
  ↓
TypeScriptLSPAdapter.getDefinition(...)
  ↓
tsServer.getDefinitionAtPosition (VS Code code)
  ↓
[IPC Response: definition locations]
  ↓
Monaco navigates to definition
```

### AI Chat Request

```
User types prompt in AI panel
  ↓
AIChatPanel.tsx: handleSubmit(prompt)
  ↓
await window.primus.ai.request({ prompt, includeContext: true })
  ↓
[IPC: ai:request]
  ↓
main/ai/aiService.ts
  ↓
gatherContext() → selection, diagnostics, file
  ↓
providerRegistry.invoke('openai', prompt, context)
  ↓
OpenAI API call (streaming)
  ↓
[IPC Events: ai:responseChunk]
  ↓
AIChatPanel.tsx: appendMessage(chunk)
  ↓
UI updates in real-time
```

---

## Performance Optimizations

### Renderer Performance

**1. Code Splitting:**
```typescript
// Lazy load Monaco languages
const loadPython = () => import(
  /* webpackChunkName: "lang-python" */
  'monaco-editor/esm/vs/basic-languages/python/python'
);
```

**2. Virtual Scrolling:**
```typescript
// Large file trees use react-window
<FixedSizeList
  height={600}
  itemCount={files.length}
  itemSize={24}
>
  {({ index, style }) => <FileItem file={files[index]} style={style} />}
</FixedSizeList>
```

**3. Debouncing:**
```typescript
// File watcher events debounced
const debouncedRefresh = useMemo(
  () => debounce(refreshFileTree, 300),
  []
);
```

**4. Monaco Model Disposal:**
```typescript
useEffect(() => {
  const model = monaco.editor.createModel(content, language);
  editor.setModel(model);
  
  return () => {
    model.dispose(); // Critical: prevent memory leaks
  };
}, [content, language]);
```

### Main Process Performance

**1. Worker Threads:**
```typescript
// CPU-intensive tasks in workers
const { Worker } = require('worker_threads');
const searchWorker = new Worker('./searchWorker.js');
```

**2. Stream Processing:**
```typescript
// Large file reads as streams
const stream = fs.createReadStream(path);
stream.on('data', chunk => processChunk(chunk));
```

**3. Caching:**
```typescript
// LSP results cached with TTL
const cache = new Map<string, { result: any, expiry: number }>();
```

---

## Security Architecture

### Threat Model

**Protected Against:**
- Arbitrary code execution from malicious files
- Unauthorized file system access
- Process spawning attacks
- IPC injection attacks
- XSS in renderer

**Mitigations:**

1. **Context Isolation:**
```typescript
// main/window.ts
webPreferences: {
  contextIsolation: true,       // Mandatory
  nodeIntegration: false,        // Mandatory
  sandbox: true,                 // Extra safety
  preload: path.join(__dirname, 'preload.js')
}
```

2. **CSP Headers:**
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; script-src 'self'">
```

3. **IPC Validation:**
```typescript
ipcMain.handle('fs:readFile', async (_, path: string) => {
  // Validate path is within workspace
  if (!isWithinWorkspace(path)) {
    throw new Error('Access denied');
  }
  return await fs.promises.readFile(path, 'utf-8');
});
```

4. **Renderer Sandboxing:**
- No `eval()` or `new Function()`
- No inline scripts
- All external resources validated

---

## Testing Strategy

### Unit Tests (Jest)
- Service layer logic
- Utility functions
- React hooks (React Testing Library)

### Integration Tests
- IPC communication flows
- LSP adapter interactions
- File system operations

### E2E Tests (Playwright)
- Command palette workflows
- Editor operations
- Multi-window scenarios

---

## Build System

### TypeScript Compilation

**5 Separate Configs:**
```
tsconfig.main.json       → dist/main/*.js (CommonJS, Node target)
tsconfig.preload.json    → dist/preload/*.js (CommonJS, bridge)
tsconfig.renderer.json   → dist/renderer/*.js (ES modules, React)
tsconfig.tests.json      → For Jest (CommonJS, test types)
tsconfig.json            → IDE tooling only (extends others)
```

### Webpack Bundling

**Dev Mode:**
- Renderer: Webpack dev server (port 3001, HMR enabled)
- Main: TypeScript watch → electronmon restart
- Preload: TypeScript watch (must rebuild before main)

**Production:**
- Renderer: Optimized bundle with code splitting
- Main: Single bundle (src/main → dist/main/main.js)
- Preload: Single bundle (src/preload → dist/preload/preload.js)

---

## Deployment Architecture

### Packaging (electron-builder)

```yaml
# electron-builder.yml
appId: com.primuside.app
productName: Primus IDE
directories:
  output: release
  buildResources: build-resources
files:
  - dist/**/*
  - package.json
mac:
  category: public.app-category.developer-tools
  target: dmg
win:
  target: nsis
linux:
  target: AppImage
```

### Auto-Update System

```typescript
// main/autoUpdater.ts
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('app:updateAvailable');
});
```

---

**Last Updated:** November 4, 2025  
**Document Version:** 1.0  
**For Implementation Details:** See IMPLEMENTATION_GUIDE.md
