# Electron Mastery - God-Level Expertise

## Deep Electron Architecture

### Process Model Internals

#### Main Process Deep-Dive

**Process Lifecycle:**
```typescript
// src/main/main.ts - Complete lifecycle management
import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import { setupProtocolHandlers } from './protocols';
import { initializeServices } from './services';
import { registerAllHandlers } from './ipc';

// Critical: Handle single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
  // User tried to run a second instance, focus existing window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    
    // Handle CLI args from second instance
    handleCommandLineArgs(commandLine);
  }
});

// App lifecycle events (order matters!)
app.on('will-finish-launching', () => {
  // macOS: Register protocol handlers before app is ready
  app.setAsDefaultProtocolClient('primus');
});

app.on('ready', async () => {
  // Critical order:
  // 1. Register custom protocols (must be before window creation)
  protocol.registerFileProtocol('primus-resource', handleResourceProtocol);
  
  // 2. Initialize all services
  await initializeServices();
  
  // 3. Register IPC handlers (before window loads)
  registerAllHandlers();
  
  // 4. Create window
  createMainWindow();
  
  // 5. Setup app menu
  setupApplicationMenu();
  
  // 6. Start background services
  startFileWatcher();
  startAutoUpdater();
});

app.on('activate', () => {
  // macOS: Re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', async (event) => {
  // Prevent quit until cleanup is done
  event.preventDefault();
  
  await cleanupServices();
  await saveWorkspaceState();
  
  app.exit(0);
});

app.on('window-all-closed', () => {
  // Windows/Linux: Quit when all windows closed
  // macOS: Keep app running (standard behavior)
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle unexpected errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  dialog.showErrorBox('Fatal Error', error.message);
  app.quit();
});
```

#### Window Management Mastery

**Advanced BrowserWindow Configuration:**
```typescript
// src/main/window.ts - Production-grade window setup
import { BrowserWindow, screen, nativeTheme } from 'electron';

export function createMainWindow(): BrowserWindow {
  // Get optimal window size based on screen
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // Default to 80% of screen, max 1920x1080
  const windowWidth = Math.min(Math.floor(width * 0.8), 1920);
  const windowHeight = Math.min(Math.floor(height * 0.8), 1080);
  
  const window = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 800,
    minHeight: 600,
    
    // Visual configuration
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    show: false, // Don't show until ready-to-show
    frame: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    
    // Performance
    webPreferences: {
      // Security (CRITICAL - never compromise these)
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      
      // Preload script (our bridge)
      preload: path.join(__dirname, '../preload/preload.js'),
      
      // Performance optimizations
      backgroundThrottling: false, // Keep services running when hidden
      spellcheck: true,
      
      // Development
      devTools: !app.isPackaged,
    },
    
    // Window features
    autoHideMenuBar: false,
    fullscreenable: true,
  });
  
  // Critical: Wait for ready-to-show to prevent flicker
  window.once('ready-to-show', () => {
    window.show();
    
    // Open DevTools in development
    if (!app.isPackaged) {
      window.webContents.openDevTools({ mode: 'right' });
    }
  });
  
  // Handle window close (save state first)
  window.on('close', async (event) => {
    event.preventDefault();
    
    // Save window bounds
    const bounds = window.getBounds();
    await saveWindowState(bounds);
    
    // Save workspace state
    await window.webContents.executeJavaScript(
      'window.primus.workspace.saveState()'
    );
    
    window.destroy();
  });
  
  // Handle navigation (security)
  window.webContents.on('will-navigate', (event, url) => {
    // Only allow navigation to our app
    if (!url.startsWith('http://localhost:3001') && !url.startsWith('primus://')) {
      event.preventDefault();
      logger.warn('Blocked navigation to:', url);
    }
  });
  
  // Handle new window requests
  window.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  
  // Performance: Throttle updates when window is hidden
  window.on('hide', () => {
    window.webContents.setFrameRate(5);
  });
  
  window.on('show', () => {
    window.webContents.setFrameRate(60);
  });
  
  // Load content
  if (app.isPackaged) {
    window.loadFile(path.join(__dirname, '../renderer/index.html'));
  } else {
    window.loadURL('http://localhost:3001');
  }
  
  return window;
}

// Multi-window management
const windows = new Map<string, BrowserWindow>();

export function createEditorWindow(filePath: string): BrowserWindow {
  const window = createMainWindow();
  windows.set(filePath, window);
  
  window.on('closed', () => {
    windows.delete(filePath);
  });
  
  // Send file path to renderer after load
  window.webContents.once('did-finish-load', () => {
    window.webContents.send('editor:openFile', filePath);
  });
  
  return window;
}

export function getWindowForFile(filePath: string): BrowserWindow | undefined {
  return windows.get(filePath);
}

export function getAllWindows(): BrowserWindow[] {
  return Array.from(windows.values());
}
```

#### Preload Script Mastery (Critical Security Boundary)

**Complete Preload Implementation:**
```typescript
// src/preload/preload.ts - Secure API bridge
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { 
  FileEntry, 
  TerminalOptions, 
  AIRequest, 
  LSPRequest,
  GitStatus 
} from '../shared/types';

// CRITICAL: Never expose ipcRenderer directly
// CRITICAL: Never expose require() or process
// CRITICAL: All APIs must be explicitly whitelisted

// Type-safe IPC wrapper
function createInvokeWrapper<T extends any[], R>(channel: string) {
  return (...args: T): Promise<R> => {
    return ipcRenderer.invoke(channel, ...args);
  };
}

// Event listener wrapper with cleanup
function createEventListener<T>(channel: string) {
  return (callback: (data: T) => void) => {
    const listener = (_: IpcRendererEvent, data: T) => callback(data);
    ipcRenderer.on(channel, listener);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  };
}

// Streaming response handler
function createStreamHandler<T>(channel: string) {
  return (onData: (chunk: T) => void, onEnd: () => void, onError: (error: Error) => void) => {
    const dataListener = (_: IpcRendererEvent, chunk: T) => onData(chunk);
    const endListener = () => onEnd();
    const errorListener = (_: IpcRendererEvent, error: Error) => onError(error);
    
    ipcRenderer.on(`${channel}:data`, dataListener);
    ipcRenderer.once(`${channel}:end`, endListener);
    ipcRenderer.once(`${channel}:error`, errorListener);
    
    return () => {
      ipcRenderer.removeAllListeners(`${channel}:data`);
      ipcRenderer.removeAllListeners(`${channel}:end`);
      ipcRenderer.removeAllListeners(`${channel}:error`);
    };
  };
}

// Expose secure API to renderer
contextBridge.exposeInMainWorld('primus', {
  // File System API
  fs: {
    readFile: createInvokeWrapper<[string], string>('fs:readFile'),
    writeFile: createInvokeWrapper<[string, string], void>('fs:writeFile'),
    readDir: createInvokeWrapper<[string], FileEntry[]>('fs:readDir'),
    createDir: createInvokeWrapper<[string], void>('fs:createDir'),
    delete: createInvokeWrapper<[string], void>('fs:delete'),
    rename: createInvokeWrapper<[string, string], void>('fs:rename'),
    exists: createInvokeWrapper<[string], boolean>('fs:exists'),
    stat: createInvokeWrapper<[string], any>('fs:stat'),
    watch: createInvokeWrapper<[string], string>('fs:watch'),
    unwatch: createInvokeWrapper<[string], void>('fs:unwatch'),
    
    // Events
    onFileChanged: createEventListener<string>('fs:fileChanged'),
    onFileCreated: createEventListener<string>('fs:fileCreated'),
    onFileDeleted: createEventListener<string>('fs:fileDeleted'),
  },
  
  // Terminal API
  terminal: {
    create: createInvokeWrapper<[TerminalOptions], string>('terminal:create'),
    write: createInvokeWrapper<[string, string], void>('terminal:write'),
    resize: createInvokeWrapper<[string, number, number], void>('terminal:resize'),
    kill: createInvokeWrapper<[string], void>('terminal:kill'),
    
    // Events
    onData: (terminalId: string, callback: (data: string) => void) => {
      const listener = (_: IpcRendererEvent, id: string, data: string) => {
        if (id === terminalId) callback(data);
      };
      ipcRenderer.on('terminal:data', listener);
      return () => ipcRenderer.removeListener('terminal:data', listener);
    },
    
    onExit: (terminalId: string, callback: (code: number) => void) => {
      const listener = (_: IpcRendererEvent, id: string, code: number) => {
        if (id === terminalId) callback(code);
      };
      ipcRenderer.on('terminal:exit', listener);
      return () => ipcRenderer.removeListener('terminal:exit', listener);
    },
  },
  
  // LSP API (Language Server Protocol)
  lsp: {
    initialize: createInvokeWrapper<[string, string], void>('lsp:initialize'),
    goToDefinition: createInvokeWrapper<[LSPRequest], any>('lsp:goToDefinition'),
    hover: createInvokeWrapper<[LSPRequest], any>('lsp:hover'),
    complete: createInvokeWrapper<[LSPRequest], any>('lsp:complete'),
    rename: createInvokeWrapper<[LSPRequest, string], any>('lsp:rename'),
    findReferences: createInvokeWrapper<[LSPRequest], any>('lsp:findReferences'),
    documentSymbol: createInvokeWrapper<[string], any>('lsp:documentSymbol'),
    workspaceSymbol: createInvokeWrapper<[string], any>('lsp:workspaceSymbol'),
    format: createInvokeWrapper<[string], any>('lsp:format'),
    
    // Diagnostics (errors/warnings)
    onDiagnostics: createEventListener<any>('lsp:diagnostics'),
  },
  
  // AI API
  ai: {
    request: createInvokeWrapper<[AIRequest], any>('ai:request'),
    
    // Streaming responses
    streamRequest: (request: AIRequest, onChunk: (chunk: string) => void) => {
      const requestId = crypto.randomUUID();
      
      const cleanup = createStreamHandler<string>(`ai:stream:${requestId}`)(
        onChunk,
        () => cleanup(),
        (error) => console.error('AI stream error:', error)
      );
      
      ipcRenderer.invoke('ai:streamRequest', { ...request, requestId });
      
      return cleanup;
    },
    
    cancel: createInvokeWrapper<[string], void>('ai:cancel'),
  },
  
  // Git API
  git: {
    status: createInvokeWrapper<[string], GitStatus>('git:status'),
    commit: createInvokeWrapper<[string, string], void>('git:commit'),
    push: createInvokeWrapper<[string], void>('git:push'),
    pull: createInvokeWrapper<[string], void>('git:pull'),
    branch: createInvokeWrapper<[string], string[]>('git:branch'),
    checkout: createInvokeWrapper<[string, string], void>('git:checkout'),
    diff: createInvokeWrapper<[string, string], string>('git:diff'),
    log: createInvokeWrapper<[string, number], any[]>('git:log'),
  },
  
  // Settings API
  settings: {
    get: createInvokeWrapper<[string], any>('settings:get'),
    set: createInvokeWrapper<[string, any], void>('settings:set'),
    getAll: createInvokeWrapper<[], any>('settings:getAll'),
    reset: createInvokeWrapper<[string], void>('settings:reset'),
    
    // Watch for changes
    onChange: createEventListener<{ key: string; value: any }>('settings:changed'),
  },
  
  // App API
  app: {
    getVersion: createInvokeWrapper<[], string>('app:getVersion'),
    getPlatform: createInvokeWrapper<[], string>('app:getPlatform'),
    restart: createInvokeWrapper<[], void>('app:restart'),
    quit: createInvokeWrapper<[], void>('app:quit'),
    openExternal: createInvokeWrapper<[string], void>('app:openExternal'),
    showItemInFolder: createInvokeWrapper<[string], void>('app:showItemInFolder'),
    
    // Dialogs
    showOpenDialog: createInvokeWrapper<[any], any>('app:showOpenDialog'),
    showSaveDialog: createInvokeWrapper<[any], any>('app:showSaveDialog'),
    showMessageBox: createInvokeWrapper<[any], any>('app:showMessageBox'),
  },
  
  // Workspace API
  workspace: {
    open: createInvokeWrapper<[string], void>('workspace:open'),
    close: createInvokeWrapper<[], void>('workspace:close'),
    getRoot: createInvokeWrapper<[], string>('workspace:getRoot'),
    saveState: createInvokeWrapper<[], void>('workspace:saveState'),
    restoreState: createInvokeWrapper<[], any>('workspace:restoreState'),
  },
});

// Type declaration for renderer process
declare global {
  interface Window {
    primus: typeof primus;
  }
}
```

### IPC Communication Mastery

#### Advanced IPC Patterns

**1. Request-Response Pattern (Standard):**
```typescript
// Main process
ipcMain.handle('fs:readFile', async (event, filePath: string): Promise<string> => {
  try {
    // Validate input (CRITICAL)
    if (!isValidPath(filePath)) {
      throw new Error('Invalid file path');
    }
    
    // Check permissions
    if (!canAccessFile(filePath)) {
      throw new Error('Access denied');
    }
    
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    logger.error('Failed to read file:', error);
    throw error; // Electron will serialize this
  }
});

// Renderer process
try {
  const content = await window.primus.fs.readFile('/path/to/file.ts');
  console.log(content);
} catch (error) {
  console.error('Failed to read file:', error);
}
```

**2. Event Streaming Pattern (Fire and Forget):**
```typescript
// Main process
export function startFileWatcher(workspaceRoot: string) {
  const watcher = chokidar.watch(workspaceRoot, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
  });
  
  watcher.on('change', (path) => {
    // Broadcast to all windows
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('fs:fileChanged', path);
    });
  });
  
  return watcher;
}

// Renderer process
useEffect(() => {
  const cleanup = window.primus.fs.onFileChanged((path) => {
    console.log('File changed:', path);
    refreshFile(path);
  });
  
  return cleanup; // CRITICAL: Always cleanup listeners
}, []);
```

**3. Streaming Response Pattern (Large Data):**
```typescript
// Main process
ipcMain.handle('ai:streamRequest', async (event, request: AIRequest) => {
  const { requestId } = request;
  const channel = `ai:stream:${requestId}`;
  
  try {
    const stream = await openAIProvider.streamChat(request.prompt);
    
    for await (const chunk of stream) {
      event.sender.send(`${channel}:data`, chunk);
    }
    
    event.sender.send(`${channel}:end`);
  } catch (error) {
    event.sender.send(`${channel}:error`, error);
  }
});

// Renderer process
const cleanup = window.primus.ai.streamRequest(
  { prompt: 'Explain this code' },
  (chunk) => {
    setResponse(prev => prev + chunk);
  }
);
```

**4. Progress Pattern (Long Operations):**
```typescript
// Main process
ipcMain.handle('search:inFiles', async (event, query: string) => {
  const files = await getAllFiles(workspaceRoot);
  const results: SearchResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const matches = await searchInFile(files[i], query);
    results.push(...matches);
    
    // Report progress
    const progress = (i + 1) / files.length;
    event.sender.send('search:progress', progress);
  }
  
  return results;
});

// Renderer process
const performSearch = async (query: string) => {
  const cleanup = window.primus.search.onProgress((progress) => {
    setProgress(progress);
  });
  
  try {
    const results = await window.primus.search.inFiles(query);
    return results;
  } finally {
    cleanup();
  }
};
```

### Performance Optimization Mastery

#### Main Process Performance

**1. Worker Threads for CPU-Intensive Tasks:**
```typescript
// src/main/workers/searchWorker.ts
import { Worker } from 'worker_threads';
import path from 'path';

class SearchWorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Array<{ resolve: Function; reject: Function; data: any }> = [];
  
  constructor(size: number = 4) {
    for (let i = 0; i < size; i++) {
      this.createWorker();
    }
  }
  
  private createWorker() {
    const worker = new Worker(path.join(__dirname, 'search.worker.js'));
    
    worker.on('message', ({ id, result, error }) => {
      const task = this.taskQueue.shift();
      if (task) {
        error ? task.reject(error) : task.resolve(result);
        this.processNextTask(worker);
      }
    });
    
    this.workers.push(worker);
  }
  
  async search(query: string, files: string[]): Promise<SearchResult[]> {
    return new Promise((resolve, reject) => {
      const task = { resolve, reject, data: { query, files } };
      this.taskQueue.push(task);
      
      const availableWorker = this.workers.find(w => !w.busy);
      if (availableWorker) {
        this.processNextTask(availableWorker);
      }
    });
  }
  
  private processNextTask(worker: Worker) {
    if (this.taskQueue.length === 0) return;
    
    const task = this.taskQueue[0];
    worker.postMessage(task.data);
  }
}

export const searchPool = new SearchWorkerPool(4);
```

**2. Memory Management:**
```typescript
// Implement caching with TTL
class LRUCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>();
  private maxSize: number;
  private ttl: number;
  
  constructor(maxSize: number = 100, ttl: number = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }
  
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }
  
  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl,
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// Use for LSP results
const lspCache = new LRUCache<string, any>(500, 30000);
```

**3. Database for Persistence:**
```typescript
// Use SQLite for structured data
import Database from 'better-sqlite3';

export class WorkspaceDB {
  private db: Database.Database;
  
  constructor(workspacePath: string) {
    const dbPath = path.join(workspacePath, '.primus', 'workspace.db');
    this.db = new Database(dbPath);
    this.initialize();
  }
  
  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_index (
        path TEXT PRIMARY KEY,
        content TEXT,
        language TEXT,
        size INTEGER,
        modified INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_language ON file_index(language);
      CREATE INDEX IF NOT EXISTS idx_modified ON file_index(modified);
      
      CREATE VIRTUAL TABLE IF NOT EXISTS file_search 
      USING fts5(path, content);
    `);
  }
  
  indexFile(filePath: string, content: string, language: string) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO file_index (path, content, language, size, modified)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(filePath, content, language, content.length, Date.now());
    
    // Add to FTS index
    const ftsStmt = this.db.prepare(`
      INSERT OR REPLACE INTO file_search (path, content) VALUES (?, ?)
    `);
    ftsStmt.run(filePath, content);
  }
  
  search(query: string): Array<{ path: string; content: string }> {
    const stmt = this.db.prepare(`
      SELECT path, snippet(file_search, 1, '<mark>', '</mark>', '...', 64) as content
      FROM file_search
      WHERE file_search MATCH ?
      ORDER BY rank
      LIMIT 100
    `);
    
    return stmt.all(query);
  }
  
  close() {
    this.db.close();
  }
}
```

### Security Best Practices

**1. Input Validation (CRITICAL):**
```typescript
// src/main/utils/validation.ts
import path from 'path';

export function isValidPath(filePath: string): boolean {
  // No null bytes
  if (filePath.includes('\0')) return false;
  
  // Must be absolute
  if (!path.isAbsolute(filePath)) return false;
  
  // No path traversal
  const normalized = path.normalize(filePath);
  if (normalized !== filePath) return false;
  
  // Must be within workspace
  const workspaceRoot = getWorkspaceRoot();
  if (!normalized.startsWith(workspaceRoot)) return false;
  
  return true;
}

export function sanitizeCommand(cmd: string): string {
  // Remove shell metacharacters
  return cmd.replace(/[;&|`$()]/g, '');
}

// Always validate in IPC handlers
ipcMain.handle('fs:readFile', async (event, filePath: string) => {
  if (!isValidPath(filePath)) {
    throw new Error('Invalid file path');
  }
  
  // ... rest of implementation
});
```

**2. CSP Headers:**
```typescript
// src/main/window.ts
window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'", // Monaco needs inline styles
        "img-src 'self' data:",
        "font-src 'self' data:",
        "connect-src 'self' ws://localhost:* http://localhost:*", // Dev server
      ].join('; '),
    },
  });
});
```

**3. Secure External Communication:**
```typescript
// Only allow trusted URLs
const TRUSTED_DOMAINS = ['api.openai.com', 'api.anthropic.com'];

export async function secureFetch(url: string, options: RequestInit) {
  const urlObj = new URL(url);
  
  if (!TRUSTED_DOMAINS.includes(urlObj.hostname)) {
    throw new Error('Untrusted domain');
  }
  
  return fetch(url, {
    ...options,
    // Force HTTPS
    agent: new https.Agent({
      rejectUnauthorized: true,
    }),
  });
}
```

---

## Advanced Electron Techniques

### Custom Protocols

```typescript
// Register custom protocol for resource loading
protocol.registerFileProtocol('primus-resource', (request, callback) => {
  const url = request.url.replace('primus-resource://', '');
  const filePath = path.join(app.getPath('userData'), 'resources', url);
  
  callback({ path: filePath });
});
```

### Native Modules Integration

```typescript
// src/main/native/addon.ts
import native from '../build/Release/addon.node';

export const nativeSearcher = {
  search: (query: string, paths: string[]): string[] => {
    return native.search(query, paths);
  },
};
```

### Crash Reporting

```typescript
import { crashReporter } from 'electron';

crashReporter.start({
  productName: 'Primus IDE',
  companyName: 'Primus',
  submitURL: 'https://crashes.primuside.dev/submit',
  uploadToServer: true,
});
```

---

**Last Updated:** November 4, 2025  
**Expertise Level:** God-Tier  
**Use When:** Building/debugging Electron main process, IPC, security
