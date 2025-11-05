const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
app.on('will-finish-launching', () => {
  console.log('[App] will-finish-launching');
});

app.on('ready', () => {
  console.log('[App] ready');
});

app.on('window-all-closed', () => {
  console.log('[App] window-all-closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// TASK:6 Graceful shutdown handlers for processes
async function cleanupBeforeQuit() {
  console.log('[App] Performing graceful shutdown...');
  
  // Save window state one final time
  if (mainWindow) {
    await saveWindowState(mainWindow);
  }
  
  // Stop file watcher
  if (fileWatcher) {
    try {
      fileWatcher.unwatch();
      console.log('[App] File watcher stopped');
    } catch (err) {
      console.warn('[App] Failed to stop file watcher:', err);
    }
  }
  
  // Stop retrieval indexer
  if (retrievalIndexInterval) {
    clearInterval(retrievalIndexInterval);
    console.log('[App] Retrieval indexer stopped');
  }
  
  // Save AI provider metrics - TEMPORARILY DISABLED to prevent electronmon restart loop
  // TODO: Re-enable with proper file watching exclusion
  // try {
  //   const metrics = getProviderMetricsSnapshot();
  //   const metricsPath = path.join(app.getPath('userData'), 'ai', 'metrics.json');
  //   await fs.mkdir(path.dirname(metricsPath), { recursive: true });
  //   await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2), 'utf8');
  //   console.log('[App] AI metrics saved');
  // } catch (err) {
  //   console.warn('[App] Failed to save AI metrics:', err);
  // }
  
  console.log('[App] Graceful shutdown completed');
}

app.on('before-quit', async (e: any) => {
  console.log('[App] before-quit');
  // Prevent default behavior to allow async cleanup
  e.preventDefault();
  
  try {
    await cleanupBeforeQuit();
  } catch (err) {
    console.error('[App] Error during cleanup:', err);
  } finally {
    // Now actually quit
    app.exit(0);
  }
});

app.on('will-quit', () => {
  console.log('[App] will-quit');
});

app.on('quit', () => {
  console.log('[App] quit');
});
// TASK:669 secret scanning
const fs = require('fs').promises;
const fsSync = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const { fileURLToPath } = require('url');
const FileWatcher = require('./services/FileWatcher.js');
const { gitIPCHandler } = require('./services/GitIPCHandler.js'); // Git IPC handlers
const { patchSessionStore } = require('./patchSessionStore.js'); // Patch session store (main process)
require('./ipc/patch.js'); // Patch IPC handlers
require('./ipc/tools.js'); // Tool IPC handlers (list/invoke)
const { DebugManager } = require('./debug/DebugManager.js');
const { IPC_CHANNELS } = require('../shared/ipcChannels.js');
const { ContextBundle } = require('../shared/contextTypes.js');
const { AIRequest, AIInvokeResult, AIResponse } = require('../shared/aiTypes.js');
const { ContextGatherRequest, ContextGatherResponse } = require('../shared/aiContext.js');
const { approxTokensFromText } = require('../shared/aiContext.js');
const { providerRegistry } = require('./ai/providerRegistry.js');
const { toolRegistry } = require('./ai/toolRegistry.js');
const { scanSecrets } = require('../shared/secretScanner.js');
const { vectorStore } = require('./ai/retrieval/vectorStore.js');
const { bulkReindex, reindexFile, bulkReindexAsync } = require('./ai/retrieval/indexer.js');
const { reindexManager } = require('./ai/retrieval/reindexManager.js');
const { embeddingProviderRegistry } = require('./ai/embeddings/providerRegistry.js');
const { ensureMetrics, getProviderMetricsSnapshot } = require('./ai/embeddings/embeddingMetrics.js');
const simpleGit = require('simple-git');
// Avoid name conflict with lib.dom's global `crypto`
const nodeCrypto = require('crypto');
let autoUpdater: any = null; try { autoUpdater = require('electron-updater').autoUpdater; } catch(_) {}

// TASK:2 Add BrowserWindow size persistence stub
interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

function getWindowStatePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'window-state.json');
}

async function loadWindowState(): Promise<WindowState | null> {
  try {
    const statePath = getWindowStatePath();
    const data = await fs.readFile(statePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // Return default state if file doesn't exist or is invalid
    return null;
  }
}

async function saveWindowState(window: Electron.BrowserWindow): Promise<void> {
  try {
    const statePath = getWindowStatePath();
    const state: WindowState = {
      width: window.getSize()[0],
      height: window.getSize()[1],
      x: window.getPosition()[0],
      y: window.getPosition()[1],
      isMaximized: window.isMaximized()
    };
    
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.warn('[WindowState] Failed to save window state:', err);
  }
}

// TASK:4 Implement safe single-instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', (_event: any, _argv: any, _cwd: any) => {
  // Focus the existing window if a second instance is launched
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

process.on('uncaughtException', (err) => {
  console.error('[Primus][uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Primus][unhandledRejection]', reason);
});
app.on('render-process-gone', (_event: any, webContents: any, details: any) => {
  console.error('[Primus][render-process-gone]', details);
});
app.on('child-process-gone', (_event: any, details: any) => {
  console.error('[Primus][child-process-gone]', details);
});

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

let mainWindow: any | null = null;
let fileWatcher: any | null = null;
let retrievalWatcherInitialized = false;
let debugManager: any | null = null;
let currentWorkspacePath = process.cwd();
let retrievalIndexInterval: NodeJS.Timeout | null = null;
// Metrics aggregation handled in embeddingMetrics.ts
// AI Policy (simple Phase 1)
interface ProviderPolicy {
    allowed?: string[]; // whitelist: if present, operation must be included
    blocked?: string[]; // blacklist: if present and contains operation, block
    maxPromptChars?: number; // optional tighter cap per provider
}
interface AIPolicy { 
    version: number; 
    maxPromptChars: number; 
    blockedOperations: string[]; 
    providerPolicies?: Record<string, ProviderPolicy>; 
}
let aiPolicy: AIPolicy | null = null;

interface ProviderSecretConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
    enabled: boolean;
    endpoint?: string;
}

interface ProviderSettings {
    claude: ProviderSecretConfig;
    openai: ProviderSecretConfig;
    gemini: ProviderSecretConfig;
    azure: ProviderSecretConfig & { endpoint: string };
}

const PROVIDER_CONFIG_FILENAME = 'provider-settings.json';
let providerSettingsCache: ProviderSettings | null = null;

function getDefaultProviderSettings(): ProviderSettings {
    return {
        claude: { apiKey: '', model: 'claude-3-5-sonnet-20241022', maxTokens: 4000, enabled: false },
        openai: { apiKey: '', model: 'gpt-4o', maxTokens: 4000, enabled: false },
        gemini: { apiKey: '', model: 'gemini-1.5-pro', maxTokens: 4000, enabled: false },
        azure: { apiKey: '', endpoint: '', model: 'gpt-4o', maxTokens: 4000, enabled: false }
    };
}

function ensureProviderSettingsShape(raw?: Partial<ProviderSettings>): ProviderSettings {
    const defaults = getDefaultProviderSettings();
    return {
        claude: { ...defaults.claude, ...(raw?.claude ?? {}) },
        openai: { ...defaults.openai, ...(raw?.openai ?? {}) },
        gemini: { ...defaults.gemini, ...(raw?.gemini ?? {}) },
        azure: { ...defaults.azure, ...(raw?.azure ?? {}) }
    };
}

function getProviderConfigPath(): string {
    const dir = path.join(app.getPath('userData'), 'ai');
    try { fsSync.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
    return path.join(dir, PROVIDER_CONFIG_FILENAME);
}

function loadProviderSettingsFromDisk(): ProviderSettings {
    try {
        const data = fsSync.readFileSync(getProviderConfigPath(), 'utf8');
        const parsed = JSON.parse(data);
        return ensureProviderSettingsShape(parsed);
    } catch {
        return getDefaultProviderSettings();
    }
}

function cloneProviderSettings(settings: ProviderSettings): ProviderSettings {
    return JSON.parse(JSON.stringify(settings));
}

async function loadProviderSettings(): Promise<ProviderSettings> {
    if (!providerSettingsCache) {
        providerSettingsCache = loadProviderSettingsFromDisk();
    }
    return cloneProviderSettings(providerSettingsCache);
}

function loadProviderSettingsSync(): ProviderSettings {
    if (!providerSettingsCache) {
        providerSettingsCache = loadProviderSettingsFromDisk();
    }
    return cloneProviderSettings(providerSettingsCache);
}


async function updateWorkspacePath(requestedPath?: string): Promise<void> {
    const fallback = process.cwd();
    let target = fallback;
    if (typeof requestedPath === 'string' && requestedPath.trim()) {
        target = path.resolve(requestedPath.trim());
    }

    try {
        const stats = fsSync.statSync(target);
        if (!stats.isDirectory()) {
            throw new Error('workspace path is not a directory');
        }
    } catch (error) {
        console.warn('[Workspace] invalid path provided, ignoring', error);
        return;
    }

    if (currentWorkspacePath === target) {
        return;
    }

    currentWorkspacePath = target;
    
    try {
        process.chdir(target);
    } catch (error) {
        console.warn('[Workspace] failed to change cwd', error);
    }

    try {
        gitIPCHandler.setProjectDir(target).catch((err: any) => {
            console.warn('[Git] setProjectDir failed', err?.message || err);
        });
    } catch (error) {
        console.warn('[Workspace] gitIPCHandler setProjectDir threw synchronously', error);
    }

    const persistFile = path.join(currentWorkspacePath, 'artifacts', 'ai', 'vectors.json');
    try {
        vectorStore.configurePersistence(persistFile);
        vectorStore.loadFromDisk();
    } catch (error) {
        console.warn('[Workspace] failed to configure vector store persistence', error);
    }

    try {
        if (typeof reindexManager.setRoot === 'function') {
            reindexManager.setRoot(currentWorkspacePath);
        }
    } catch (error) {
        console.warn('[Workspace] failed to update reindex manager root', error);
    }

    if (retrievalIndexInterval) {
        clearInterval(retrievalIndexInterval);
        retrievalIndexInterval = null;
    }
    startRetrievalIndexer();

    if (fileWatcher && !retrievalWatcherInitialized) {
        try {
            const srcDir = path.join(currentWorkspacePath, 'src');
            fileWatcher.watch(srcDir);
            retrievalWatcherInitialized = true;
            
        } catch (error) {
            console.warn('[Workspace] failed to start default watcher', error);
        }
    }
}
async function saveProviderSettings(next: ProviderSettings): Promise<void> {
    providerSettingsCache = ensureProviderSettingsShape(next);
    const configPath = getProviderConfigPath();
    await fs.writeFile(configPath, JSON.stringify(providerSettingsCache, null, 2), 'utf8');
}

function redactProviderSettings(config: ProviderSettings): any {
    return {
        claude: { ...config.claude, apiKey: config.claude.apiKey ? '***' : '' },
        openai: { ...config.openai, apiKey: config.openai.apiKey ? '***' : '' },
        gemini: { ...config.gemini, apiKey: config.gemini.apiKey ? '***' : '' },
        azure: { ...config.azure, apiKey: config.azure.apiKey ? '***' : '', endpoint: config.azure.endpoint ? '***' : '' }
    };
}
ipcMain.on(IPC_CHANNELS.AI_CONFIG_GET_SYNC, (event: Electron.IpcMainEvent) => {
    event.returnValue = loadProviderSettingsSync();
});

ipcMain.handle(IPC_CHANNELS.AI_CONFIG_GET, async (_evt: any, options?: { redacted?: boolean }) => {
    const config = await loadProviderSettings();
    return options?.redacted ? redactProviderSettings(config) : config;
});

ipcMain.handle(IPC_CHANNELS.AI_CONFIG_SET, async (_evt: any, nextConfig: Partial<ProviderSettings>) => {
    const current = await loadProviderSettings();
    const merged = ensureProviderSettingsShape({ ...current, ...(nextConfig ?? {}) });
    await saveProviderSettings(merged);
    return merged;
});

ipcMain.handle(IPC_CHANNELS.AI_CONFIG_CLEAR, async () => {
    const defaults = getDefaultProviderSettings();
    await saveProviderSettings(defaults);
    return redactProviderSettings(defaults);
});

ipcMain.on('watcher:start', (_event: any, dirPath?: string) => {
    updateWorkspacePath(dirPath).catch((error: any) => console.warn("[Workspace] failed to update path from watcher:start", error));
    if (fileWatcher && typeof dirPath === 'string' && dirPath.trim()) {
        try {
            fileWatcher.watch(dirPath);
        } catch (error) {
            console.warn('[Watcher] failed to start', error);
        }
    }
});

ipcMain.on('watcher:stop', () => {
    try {
        fileWatcher?.unwatch?.();
    } catch (error) {
        console.warn('[Watcher] failed to stop', error);
    }
});


function loadAIPolicy(){
    try {
        // Attempt several candidate locations. In production the compiled main file lives at:
        //   dist/main/main/main.js ( __dirname )
        // The policy file is copied to dist/ai.policy.json. During dev it may live at project root.
        const candidates: string[] = [];
        const cwd = process.cwd();
        candidates.push(path.join(cwd, 'ai.policy.json'));
        // dist root relative to compiled file (../../.. from dist/main/main)
        candidates.push(path.join(__dirname, '../../../ai.policy.json'));
        // one level up (in case structure changes)
        candidates.push(path.join(__dirname, '../../ai.policy.json'));
        // project root heuristic: if running from ts-node/electron in dev, __dirname may already be src/main
        candidates.push(path.join(__dirname, '../../..', 'ai.policy.json'));

        let foundPath: string | null = null;
        for (const p of candidates) {
            try {
                if (fsSync.existsSync(p)) { foundPath = p; break; }
            } catch (e: any) {
                // ignore path errors
            }
        }
        if (!foundPath) {
            console.warn('[AI][policy] not found. Candidates:', candidates);
            throw new Error('ai.policy.json not found');
        }
        const raw = fsSync.readFileSync(foundPath, 'utf8');
        aiPolicy = JSON.parse(raw);
        
    } catch(e: any){
        console.warn('[AI][policy] load failed, using defaults', e && e.message)
        aiPolicy = { version: 1, maxPromptChars: 10000, blockedOperations: [] };
    }
}

async function createWindow() {
  // TASK:2 Load window state or use defaults
  const savedState = await loadWindowState();
  const defaultState: WindowState = { width: 1200, height: 800 };
  const windowState: WindowState = savedState || defaultState;
  
  const browserWindowOptions: Electron.BrowserWindowConstructorOptions = {
    width: windowState.width,
    height: windowState.height,
    webPreferences: {
      // Adjusted relative path because compiled output nests main files under dist/main/main
      preload: path.join(__dirname, '../../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  };

  // TASK:2 Only set x/y position if they exist in the saved state
  if (windowState.x !== undefined && windowState.y !== undefined) {
    browserWindowOptions.x = windowState.x;
    browserWindowOptions.y = windowState.y;
  }

  mainWindow = new BrowserWindow(browserWindowOptions);

  // TASK:2 Restore maximized state
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5001');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    try {
            
        // Adjusted relative path due to nested dist/main/main structure
        const indexPath = path.join(__dirname, '../../renderer/index.html');
        
        await mainWindow.loadFile(indexPath);
    } catch (err) {
      console.error('[Primus] failed to load index.html', err);
    }
  }

  fileWatcher = new FileWatcher(mainWindow);
  debugManager = new DebugManager(mainWindow);

  await updateWorkspacePath(currentWorkspacePath);

  mainWindow.on('closed', () => { 
    
    mainWindow = null;
    fileWatcher?.unwatch();
  });

  // TASK:2 Save window state on resize, move, and close
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      saveWindowState(mainWindow);
    }
  });

  mainWindow.on('move', () => {
    if (!mainWindow.isMaximized()) {
      saveWindowState(mainWindow);
    }
  });

  mainWindow.on('close', () => {
    saveWindowState(mainWindow);
  });

  // Auto-update check (disabled by default) - enable via env PRIMUS_AUTO_UPDATE=1
  if(autoUpdater && process.env.PRIMUS_AUTO_UPDATE === '1') {
    try {
      autoUpdater.on('error', (e: any) => console.warn('[Updater] error', e?.message));
      autoUpdater.on('update-available', (info: any) => console.log('[Updater] update available', info?.version));
      autoUpdater.on('update-downloaded', () => console.log('[Updater] update downloaded (apply on quit)'));
      setTimeout(()=> { try { autoUpdater.checkForUpdates(); } catch (e: any){ console.warn('[Updater] check failed', e); } }, 4000);
    } catch (e: any){ console.warn('[Updater] init failed', e); }
  }
}

// Retrieval indexing (enhanced chunk-based)
function startRetrievalIndexer(){
  if(retrievalIndexInterval) return;
  const rootSrc = path.join(currentWorkspacePath, 'src');
  const persistFile = path.join(currentWorkspacePath, 'artifacts','ai','vectors.json');
  try { vectorStore.configurePersistence(persistFile); vectorStore.loadFromDisk(); } catch {/* ignore */}
  async function runIndex(){
      try {
          const res = bulkReindex(rootSrc, /\.(ts|tsx|js|jsx|md)$/i, 350);
          if(res.processed){
              
          }
      } catch (e: any){ console.warn('[Retrieval][bulk] failed', e); }
  }
  runIndex();
  retrievalIndexInterval = setInterval(runIndex, 5 * 60 * 1000); // every 5 minutes (heavier pass)
  app.on('before-quit', () => { if(retrievalIndexInterval) clearInterval(retrievalIndexInterval); });
}

// File system IPC handlers
ipcMain.handle('fs:readDir', async (_: any, dirPath: string) => {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map((e: any) => ( {
            name: e.name,
            path: path.join(dirPath, e.name),
            isDirectory: e.isDirectory()
    } ));
    } catch (error) {
        console.error('Failed to read directory', dirPath, error);
        throw new Error(`Failed to read directory: ${error}`);
    }
});
ipcMain.handle('fs:readFile', async (_: any, filePath: string) => {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch (error) {
        throw new Error(`Failed to read file: ${error}`);
    }
});
ipcMain.handle('fs:writeFile', async (_: any, filePath: string, content: string) => {
    try {
        await fs.writeFile(filePath, content, 'utf8');
        return true;
    } catch (error) {
        throw new Error(`Failed to write file: ${error}`);
    }
});
ipcMain.handle('fs:stat', async (_: any, path: string) => {
    try {
        const stats = await fs.stat(path);
        return { isDirectory: stats.isDirectory(), size: stats.size, mtime: stats.mtimeMs };
    } catch (error) {
        console.error(`Failed to get file stats for ${path}:`, error);
        return null;
    }
});
ipcMain.handle('fs:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('fs:selectFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile'],
        filters: [
            { name: 'All Files', extensions: ['*'] },
            { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'tsx', 'jsx', 'json', 'css'] }
        ]
    });
    return result.canceled ? null : result.filePaths[0];
});
// Note: git IPC handlers are registered centrally in src/main/services/GitIPCHandler.ts
// Remove duplicate registrations here to avoid duplicate handler errors.
// Additional git operations
// ipcMain.handle('git:log', async (_: any, repoPath: string, options?: any) => {
//   // moved to GitIPCHandler
// });

// ipcMain.handle('git:diff', async (_: any, repoPath: string, files?: string[]) => {
//   // moved to GitIPCHandler
// });

// ipcMain.handle('git:checkoutLocalBranch', async (_: any, repoPath: string, branch: string) => {
//   // moved to GitIPCHandler
// });

// git:reset handler removed from main startup; canonical registration is in services/GitIPCHandler.ts
// Keeping this commented out avoids duplicate ipcMain registrations which cause Electron to crash at startup.
// ipcMain.handle('git:reset', async (_: any, repoPath: string, files?: string[]) => {
//     try {
//         const git = simpleGit(repoPath);
//         if (files && files.length > 0) {
//             await git.reset('hard', files);
//         } else {
//             await git.reset('hard');
//         }
//         return true;
//     } catch (error) {
//         console.error(`Failed to reset git repository ${repoPath}:`, error);
//         throw new Error(`Failed to reset git repository: ${error}`);
//     }
// });
// Additional file operations
ipcMain.handle('fs:deleteFile', async (_: any, filePath: string) => {
    try {
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        console.error(`Failed to delete file ${filePath}:`, error);
        return false;
    }
});
ipcMain.handle('fs:deleteDirectory', async (_: any, dirPath: string) => {
    try {
        await fs.rmdir(dirPath, { recursive: true });
        return true;
    } catch (error) {
        console.error(`Failed to delete directory ${dirPath}:`, error);
        return false;
    }
});
ipcMain.handle('fs:renameFile', async (_: any, oldPath: string, newPath: string) => {
    try {
        await fs.rename(oldPath, newPath);
        return true;
    } catch (error) {
        console.error(`Failed to rename file from ${oldPath} to ${newPath}:`, error);
        return false;
    }
});
ipcMain.handle('fs:copyFile', async (_: any, sourcePath: string, destPath: string) => {
    try {
        await fs.copyFile(sourcePath, destPath);
        return true;
    } catch (error) {
        console.error(`Failed to copy file from ${sourcePath} to ${destPath}:`, error);
        return false;
    }
});
// TASK:669 Security: secret scanning IPC
ipcMain.handle('security:scan-text', async (_evt: any, text: string) => {
    try {
        if (typeof text !== 'string') throw new Error('Invalid text');
        const start = Date.now();
        const result = scanSecrets(text);
        return { ...result, durationMs: Date.now() - start };
    } catch (e:any) {
        return { error: String(e?.message || e) };
    }
});
ipcMain.handle('fs:createDirectory', async (_: any, dirPath: string) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return true;
    } catch (error) {
        console.error(`Failed to create directory ${dirPath}:`, error);
        return false;
    }
});
ipcMain.handle('fs:exists', async (_: any, path: string) => {
    try {
        await fs.access(path);
        return true;
    } catch (error) {
        return false;
    }
});
// Task lifecycle stats (planned/in-progress/done + empty tasks counts)
ipcMain.handle('tasks:lifecycle:stats', async () => {
    try {
        const root = process.cwd();
        const tasksFile = path.join(root,'tasks_all.json');
        const raw = await fs.readFile(tasksFile,'utf8');
        const parsed = JSON.parse(raw);
        const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
        let planned = 0, inProgress = 0, done = 0, empty = 0;
        for(const t of tasks){
            const ls = t.lifecycleStatus || 'planned';
            if(ls === 'planned') planned++; else if(ls === 'in-progress') inProgress++; else if(ls === 'done') done++;
            const storyEmpty = !t.userStory || !String(t.userStory).trim();
            const criteriaEmpty = !Array.isArray(t.acceptanceCriteria) || t.acceptanceCriteria.length === 0;
            if(storyEmpty && criteriaEmpty) empty++;
        }
        return { planned, inProgress, done, empty, total: tasks.length, generatedAt: new Date().toISOString() };
    } catch(e:any){
        return { error: String(e?.message||e) };
    }
});
// Context bundle IPC (lightweight in-process implementation mirroring buildContextBundle.cjs logic)
ipcMain.handle(IPC_CHANNELS.CONTEXT_BUILD, async (_evt: any, args: { taskIds?: number[]; top?: number; fromBatch?: boolean }) => {
    try {
        const root = process.cwd();
        const tasksFile = path.join(root, 'tasks_all.json');
        const traceFile = path.join(root, 'trace_map.json');
        if(!fs) throw new Error('fs module not available');
        const raw = await fs.readFile(tasksFile, 'utf8');
        const all = JSON.parse(raw).tasks || [];
        let trace = {} as any;
        try { const trRaw = await fs.readFile(traceFile,'utf8'); trace = JSON.parse(trRaw); } catch(_){ /* ignore missing */ }

        let ids: number[] = [];
        if(args?.taskIds && args.taskIds.length){ ids = args.taskIds; }
        else if(args?.fromBatch){
            try {
                const batchRaw = await fs.readFile(path.join(root,'artifacts','batch_current_tasks.json'),'utf8');
                const batch = JSON.parse(batchRaw); ids = (batch.tasks||[]).map((t:any)=> t.id); }
            catch(_){ /* ignore */ }
        } else if(args?.top && args.top > 0){
            ids = all.filter((t:any)=> (t.lifecycleStatus||'planned')==='planned')
                     .sort((a:any,b:any)=> (b.impactScore||0)-(a.impactScore||0))
                     .slice(0,args.top)
                     .map((t:any)=> t.id);
        }
        if(!ids.length) throw new Error('No task IDs resolved for context build');
        const chosen = all.filter((t:any)=> ids.includes(t.id));
        const summaries = chosen.map((t:any)=> {
            const tr = trace[String(t.id)];
            const files = tr && tr.files ? tr.files.map((f:any)=>({ path: f.path, occurrences: f.occurrences||1 })) : [];
            return {
                id: t.id,
                title: t.title,
                lifecycleStatus: t.lifecycleStatus,
                status: t.status,
                userStory: t.userStory,
                acceptanceCriteria: t.acceptanceCriteria,
                impactScore: t.impactScore,
                priorityScore: t.priorityScore,
                riskScore: t.riskScore,
                complexityScore: t.complexityScore,
                placeholderAdded: t.placeholderAdded,
                hasCodeRefs: !!(files.length),
                files
            };
        });
        const relatedSet = new Set<string>();
        (summaries as any[]).forEach((s: any)=> ((s.files||[]) as any[]).forEach((f:any)=> relatedSet.add(f.path)) );
        const bundle = {
            meta: { generatedAt: new Date().toISOString(), source: 'ipc:context:build', taskCount: summaries.length },
            tasks: summaries as any,
            relatedFiles: Array.from(relatedSet).sort(),
            stats: { tasksWithRefs: (summaries as any[]).filter((s:any)=> s.hasCodeRefs).length, tasksWithoutRefs: (summaries as any[]).filter((s:any)=> !s.hasCodeRefs).length }
        };
        return bundle;
    } catch(e:any){
        return { error: String(e?.message || e) };
    }
});
// AI request handler using provider registry (Phase 1 enriched skeleton)
ipcMain.handle(IPC_CHANNELS.AI_REQUEST, async (_evt: any, req: any): Promise<any> => {
    const started = Date.now();
    try {
        const provider = providerRegistry.get(req.providerHint);
        const providerSettings = await loadProviderSettings();
        const providerConfig = (providerSettings as any)[provider.id as keyof ProviderSettings];
        if (provider.id === 'claude' || provider.id === 'openai' || provider.id === 'gemini' || provider.id === 'azure') {
            if (!providerConfig || !providerConfig.enabled || !providerConfig.apiKey) {
                return { error: `Provider '${provider.id}' is not configured`, requestId: req.id };
            }
            if (provider.id === 'azure' && !providerConfig.endpoint) {
                return { error: `Provider '${provider.id}' endpoint not configured`, requestId: req.id };
            }
        }
        // Policy enforcement
        let policyMeta: any = undefined;
        if (aiPolicy) {
            // Global checks
            if (aiPolicy.blockedOperations.includes(req.operation)) {
                return { error: `Operation '${req.operation}' blocked by global policy`, requestId: req.id };
            }
            if (req.prompt && req.prompt.length > aiPolicy.maxPromptChars) {
                return { error: `Prompt exceeds global policy limit (${req.prompt.length} > ${aiPolicy.maxPromptChars})`, requestId: req.id };
            }
            // Provider-level checks
            const pPol = aiPolicy.providerPolicies?.[provider.id];
            if (pPol) {
                if (pPol.allowed && pPol.allowed.length && !pPol.allowed.includes(req.operation)) {
                    return { error: `Operation '${req.operation}' not allowed for provider '${provider.id}'`, requestId: req.id };
                }
                if (pPol.blocked && pPol.blocked.includes(req.operation)) {
                    return { error: `Operation '${req.operation}' blocked for provider '${provider.id}'`, requestId: req.id };
                }
                if (pPol.maxPromptChars && req.prompt && req.prompt.length > pPol.maxPromptChars) {
                    return { error: `Prompt exceeds provider policy limit (${req.prompt.length} > ${pPol.maxPromptChars})`, requestId: req.id };
                }
                policyMeta = { providerPolicyApplied: true, providerId: provider.id };
            }
        }
        const contextSummary = req.includeContext
        ? { taskIds: req.contextTaskIds || [], fileCount: (req.contextTaskIds?.length || 0) * 3, symbolBreakRisk: 0 }
        : undefined;
        // Special case: planning operation (aggregate stub tool outputs then let provider wrap prompt)
        if (req.operation === 'planning') {
            const toolOutputs: Record<string, any> = {};
            for (const t of toolRegistry.list()) {
                try { toolOutputs[t.id] = await toolRegistry.invoke(t.id, req); } catch (e:any) { toolOutputs[t.id] = { error: String(e?.message||e) }; }
            }
            // Opportunistic retrieval summary: if embedding index exists, perform a semantic query using user's prompt head (truncated)
            try {
                if (toolRegistry.get('semantic-retrieve')) {
                    const head = (req.prompt || '').slice(0, 256);
                    const retrieval = await toolRegistry.invoke('semantic-retrieve', req, { query: head, topK: 5 });
                    toolOutputs['semantic-retrieve'] = retrieval;
                }
            } catch (e:any) {
                toolOutputs['semantic-retrieve'] = { error: String(e?.message||e) };
            }
            // Prepend toolOutputs JSON into prompt for provider visibility (Phase 1 simplistic approach)
            req = { ...req, prompt: `Tool context:\n${JSON.stringify(toolOutputs)}\n\nUser Prompt:\n${req.prompt}` };
        }

    const base = await provider.invoke(req) as any; // current providers return AIResponse shape
        // If mock provider, optionally augment content with context summary for observability
        let content = base.content;
        if (contextSummary && base.meta?.mock) {
            content = content + ` | ctx tasks=${contextSummary.taskIds?.length} filesâ‰ˆ${contextSummary.fileCount}`;
        }
        // Token & cost estimation (heuristic: 1 token â‰ˆ 4 chars)
        const tokensEst = Math.ceil(content.length / 4);
        // Simple tiered model pricing placeholder (future: provider-specific) USD per 1K tokens
        const pricePerK = provider.id === 'openai' ? 0.002 : 0; // dummy read-only cost mapping
        const costEst = +(tokensEst / 1000 * pricePerK).toFixed(6);
    const enriched: any = {
            ...base,
            content,
            context: contextSummary || base.context,
            meta: { mock: true, ...(base.meta || {}), provider: provider.id, latencyMs: Date.now() - started, tokensEst, costEst, ...(policyMeta||{}) }
        };
        // Metrics update
        const m = ensureMetrics(provider.id);
        m.calls += 1;
        m.totalLatencyMs += enriched.meta?.latencyMs || 0;
        m.totalTokensEst += tokensEst;
        m.totalCostEst += costEst;
        // Logging (NDJSON per-day file)
        try {
            const root = process.cwd();
            const aiDir = path.join(root, 'artifacts', 'ai');
            await fs.mkdir(aiDir, { recursive: true });
            const sessionFile = path.join(aiDir, `session_${new Date().toISOString().slice(0,10)}.ndjson`);
            const logEntry = JSON.stringify({ ts: new Date().toISOString(), request: req, response: { ...enriched, content: enriched.content }, policy: policyMeta });
            await fs.appendFile(sessionFile, logEntry + '\n', 'utf8');
        } catch (logErr) {
            console.warn('[AI][log] append failed', logErr);
        }
        return enriched;

    } catch (e: any) {
        // Attempt provider id for metrics error counting
        try {
            const provider = providerRegistry.get(req.providerHint);
            const m = ensureMetrics(provider.id);
            m.errors += 1;
        } catch { /* ignore */}
        return { error: String(e?.message || e), requestId: req?.id };
    }
});
// Streaming AI request (sends chunk events over dedicated channels)
// Track additional guardrail aggregation metadata per stream.

const activeStreams = new Map<string, {
    controller: AbortController;
    started: number;
    providerId: string;
    full: string;
    // guardrail aggregation
    secretsTypes: Set<string>;
    secretsFindings: number;
}>();

ipcMain.on(IPC_CHANNELS.AI_STREAM_REQUEST, async (evt: any, req: any) => {
    const webContents = evt.sender;
    const streamId = req.streamId || `str_${Date.now()}`;
    const started = Date.now();
    try {
        const provider = providerRegistry.get(req.providerHint);
        const controller = new AbortController();
        activeStreams.set(streamId, {
            controller,
            started,
            providerId: provider.id,
            full: '',
            secretsTypes: new Set(),
            secretsFindings: 0
        });
        const stream = provider.createStream(req, { abortSignal: controller.signal });

        const encoder = new TextEncoder();
        for await (const data of stream) {
            if (!data.content/* || !data.content.trim()*/) continue; // ignore empty content
            const textData = data.content;
            const full = (activeStreams.get(streamId)?.full || '') + textData;
            activeStreams.set(streamId, { ...activeStreams.get(streamId)!, full });

            // Handle secret scanning for streaming pass
            const secretScan = scanSecrets(full);
            const currentFindings = secretScan.totalFindings - (activeStreams.get(streamId)?.secretsFindings || 0);
            const anyNew = currentFindings > 0;
            if (anyNew){
                secretScan.newResults = (secretScan.results || []).slice(secretScan.totalFindings - currentFindings);
                console.warn('\nAI [SECRETS warn] API stream contains secrets - new:', currentFindings, 'accumulated:', secretScan.totalFindings);
                // Strategies:
                // 1. Quiet: Hide live errors, show aggregates (X:/tokens) and caution in red caution triangle
                // 2. Alert on certain criticals: // The following may lead to false positives
                //  - High conf regex match human-readable credentials/apitokens
                //  - detect-gpt usage/own hash

                const SCAN_PYTHON_SOURCE = true;
                let alertType = 'quiet';
                // Aggregate new findings/types
                try {
                    const prev = activeStreams.get(streamId);
                    if (prev) {
                        prev.secretsFindings = secretScan.totalFindings;
                        for (const r of (secretScan.newResults || [])) {
                            if (r && r.type) prev.secretsTypes.add(String(r.type));
                        }
                        activeStreams.set(streamId, prev);
                    }
                } catch { /* ignore aggregation errors */ }
                // Optionally emit a sentinel warning chunk to renderer
                const warnTypes = Array.from(activeStreams.get(streamId)?.secretsTypes || []).join(',');
                webContents.send(IPC_CHANNELS.AI_STREAM_CHUNK, {
                    streamId,
                    content: `__warn:secrets_detected:${warnTypes}`
                });
            }
            // Emit normal content chunk
            webContents.send(IPC_CHANNELS.AI_STREAM_CHUNK, { streamId, content: textData });
        }
        // Complete event with aggregate meta
        const agg = activeStreams.get(streamId);
        webContents.send(IPC_CHANNELS.AI_STREAM_COMPLETE, {
            streamId,
            meta: {
                providerId: agg?.providerId,
                latencyMs: Date.now() - started,
                guardrails: {
                    secrets: {
                        findings: agg?.secretsFindings || 0,
                        types: Array.from(agg?.secretsTypes || [])
                    }
                }
            }
        });
        activeStreams.delete(streamId);
    } catch (e: any) {
        console.warn('[AI][stream] failed', e);
        try {
            webContents.send(IPC_CHANNELS.AI_STREAM_COMPLETE, { streamId, error: String((e as any)?.message || e) });
        } catch {}
        activeStreams.delete(streamId);
    }
});

// Cancellation handler
ipcMain.on(IPC_CHANNELS.AI_STREAM_CANCEL, (_evt: Electron.IpcMainEvent, streamId: string) => {
    try {
        const s = activeStreams.get(streamId);
        if (s) {
            s.controller.abort();
            activeStreams.delete(streamId);
        }
    } catch {}
});
