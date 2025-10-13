// src/preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipcChannels';
import { ContextGatherRequest, ContextGatherResponse } from '../shared/aiContext';

// TASK:7 Preload script security hardening - Define valid channels for ipcRenderer.invoke
const INVOKE_CHANNELS = new Set([
  // File system operations
  'fs:readFile',
  'fs:writeFile',
  'fs:readDir',
  'fs:stat',
  'fs:selectFolder',
  'fs:selectFile',
  'fs:deleteFile',
  'fs:deleteDirectory',
  'fs:renameFile',
  'fs:copyFile',
  'fs:createDirectory',
  'fs:exists',
  
  // Terminal operations
  'terminal:executeCommand',
  'terminal:getCurrentDir',
  
  // Search operations
  'search:searchFiles',
  'search:replaceInFiles',
  
  // Settings operations
  'settings:getSettings',
  'settings:saveSettings',
  
  // Plugin operations
  'plugins:getInstalled',
  'plugins:getMarketplace',
  'plugins:install',
  'plugins:uninstall',
  'plugins:enable',
  'plugins:disable',
  'plugins:loadLocal',
  
  // Tool operations
  IPC_CHANNELS.TOOL_INVOKE,
  
  // Dialog operations
  'dialog:showOpenDialog',
  'dialog:showSaveDialog',
  'dialog:showMessageBox',
  'dialog:showErrorBox',
  
  // Git operations
  'git:init',
  'git:status',
  'git:add',
  'git:reset',
  'git:commit',
  'git:push',
  'git:pull',
  'git:branches',
  'git:checkout',
  'git:checkoutLocalBranch',
  'git:createBranch',
  'git:log',
  'git:diff',
  // Legacy git methods
  'git:isRepo',
  'git:getStatus',
  'git:getBranches',
  'git:stage',
  'git:unstage',
  // Object-based git methods
  'git:getDiff',

  // Patch operations
  'patch:create-session',
  'patch:get-session',
  'patch:apply-session',
  'patch:discard-session',
  'patch:update-hunk-status',

  // Security operations
  'security:scan-text',
  
  // Context operations
  IPC_CHANNELS.CONTEXT_BUILD,
  
  // AI operations
  IPC_CHANNELS.AI_REQUEST,
  IPC_CHANNELS.AI_PROVIDERS_LIST,
  IPC_CHANNELS.AI_STATS_GET,
  IPC_CHANNELS.AI_CONFIG_GET,
  IPC_CHANNELS.AI_CONFIG_SET,
  IPC_CHANNELS.AI_CONFIG_CLEAR,
  IPC_CHANNELS.AI_CONTEXT_GATHER,
  IPC_CHANNELS.AI_STREAM_REQUEST,
  IPC_CHANNELS.AI_STREAM_CANCEL,
  
  // Retrieval operations
  IPC_CHANNELS.REINDEX_START,
  IPC_CHANNELS.REINDEX_CANCEL,
  IPC_CHANNELS.REINDEX_SUMMARY_GET,
  
  // Task operations
  'tasks:lifecycle:stats'
]);

// TASK:7 Preload script security hardening - Define valid channels for ipcRenderer.send
const SEND_CHANNELS = new Set([
  'watcher:start',
  'watcher:stop',
  'debug:start',
  'debug:stop',
  'debug:continue',
  'debug:stepOver',
  'debug:stepIn',
  'debug:stepOut',
  IPC_CHANNELS.AI_STREAM_REQUEST,
  IPC_CHANNELS.AI_STREAM_CANCEL
]);

// TASK:7 Preload script security hardening - Define valid channels for ipcRenderer.on
const RECEIVE_CHANNELS = new Set([
  'file-changed',
  'debug:output',
  'debug:stopped',
  'debug:terminated',
  'debug:stack',
  'debug:variables',
  IPC_CHANNELS.AI_STREAM_CHUNK,
  IPC_CHANNELS.AI_STREAM_COMPLETE,
  IPC_CHANNELS.REINDEX_PROGRESS_EVENT,
  IPC_CHANNELS.REINDEX_COMPLETE_EVENT
]);

const primusApi = {
  ping: () => 'pong',
  fs: {
    readFile: (filePath: string) => {
      // TASK:7 Input validation
      if (typeof filePath !== 'string') throw new Error('Invalid file path');
      return ipcRenderer.invoke('fs:readFile', filePath);
    },
    writeFile: (filePath: string, content: string) => {
      // TASK:7 Input validation
      if (typeof filePath !== 'string') throw new Error('Invalid file path');
      if (typeof content !== 'string') throw new Error('Invalid content');
      return ipcRenderer.invoke('fs:writeFile', filePath, content);
    },
    readDir: (dirPath: string) => {
      // TASK:7 Input validation
      if (typeof dirPath !== 'string') throw new Error('Invalid directory path');
      return ipcRenderer.invoke('fs:readDir', dirPath);
    },
    stat: (path: string) => {
      // TASK:7 Input validation
      if (typeof path !== 'string') throw new Error('Invalid path');
      return ipcRenderer.invoke('fs:stat', path);
    },
    selectFolder: () => ipcRenderer.invoke('fs:selectFolder'),
    selectFile: () => ipcRenderer.invoke('fs:selectFile'),
    deleteFile: (filePath: string) => {
      // TASK:7 Input validation
      if (typeof filePath !== 'string') throw new Error('Invalid file path');
      return ipcRenderer.invoke('fs:deleteFile', filePath);
    },
    deleteDirectory: (dirPath: string) => {
      // TASK:7 Input validation
      if (typeof dirPath !== 'string') throw new Error('Invalid directory path');
      return ipcRenderer.invoke('fs:deleteDirectory', dirPath);
    },
    renameFile: (oldPath: string, newPath: string) => {
      // TASK:7 Input validation
      if (typeof oldPath !== 'string') throw new Error('Invalid old path');
      if (typeof newPath !== 'string') throw new Error('Invalid new path');
      return ipcRenderer.invoke('fs:renameFile', oldPath, newPath);
    },
    copyFile: (sourcePath: string, destPath: string) => {
      // TASK:7 Input validation
      if (typeof sourcePath !== 'string') throw new Error('Invalid source path');
      if (typeof destPath !== 'string') throw new Error('Invalid destination path');
      return ipcRenderer.invoke('fs:copyFile', sourcePath, destPath);
    },
    createDirectory: (dirPath: string) => {
      // TASK:7 Input validation
      if (typeof dirPath !== 'string') throw new Error('Invalid directory path');
      return ipcRenderer.invoke('fs:createDirectory', dirPath);
    },
    exists: (path: string) => {
      // TASK:7 Input validation
      if (typeof path !== 'string') throw new Error('Invalid path');
      return ipcRenderer.invoke('fs:exists', path);
    }
  },
  terminal: {
    executeCommand: (command: string, options?: { cwd?: string }) => {
      // TASK:7 Input validation
      if (typeof command !== 'string') throw new Error('Invalid command');
      return ipcRenderer.invoke('terminal:executeCommand', command, options || {});
    },
    getCurrentDir: () => ipcRenderer.invoke('terminal:getCurrentDir'),
  },
  search: {
    searchFiles: (query: string, options: any) => {
      // TASK:7 Input validation
      if (typeof query !== 'string') throw new Error('Invalid query');
      return ipcRenderer.invoke('search:searchFiles', query, options);
    },
    replaceInFiles: (searchTerm: string, replaceTerm: string, options: any) => {
      // TASK:7 Input validation
      if (typeof searchTerm !== 'string') throw new Error('Invalid search term');
      if (typeof replaceTerm !== 'string') throw new Error('Invalid replace term');
      return ipcRenderer.invoke('search:replaceInFiles', searchTerm, replaceTerm, options);
    },
  },
  settings: {
    getSettings: () => ipcRenderer.invoke('settings:getSettings'),
    saveSettings: (settings: any) => {
      // TASK:7 Basic input validation
      if (typeof settings !== 'object' || settings === null) throw new Error('Invalid settings object');
      return ipcRenderer.invoke('settings:saveSettings', settings);
    },
  },
  plugins: {
    getInstalled: () => ipcRenderer.invoke('plugins:getInstalled'),
    getMarketplace: () => ipcRenderer.invoke('plugins:getMarketplace'),
    install: (pluginId: string) => {
      // TASK:7 Input validation
      if (typeof pluginId !== 'string') throw new Error('Invalid plugin ID');
      return ipcRenderer.invoke('plugins:install', pluginId);
    },
    uninstall: (pluginId: string) => {
      // TASK:7 Input validation
      if (typeof pluginId !== 'string') throw new Error('Invalid plugin ID');
      return ipcRenderer.invoke('plugins:uninstall', pluginId);
    },
    enable: (pluginId: string) => {
      // TASK:7 Input validation
      if (typeof pluginId !== 'string') throw new Error('Invalid plugin ID');
      return ipcRenderer.invoke('plugins:enable', pluginId);
    },
    disable: (pluginId: string) => {
      // TASK:7 Input validation
      if (typeof pluginId !== 'string') throw new Error('Invalid plugin ID');
      return ipcRenderer.invoke('plugins:disable', pluginId);
    },
    loadLocal: (folderPath: string) => {
      // TASK:7 Input validation
      if (typeof folderPath !== 'string') throw new Error('Invalid folder path');
      return ipcRenderer.invoke('plugins:loadLocal', folderPath);
    },
  },
  tools: {
    invoke: (id: string, req: any, args?: any) => {
      // TASK:7 Input validation
      if (typeof id !== 'string') throw new Error('Invalid tool ID');
      return ipcRenderer.invoke(IPC_CHANNELS.TOOL_INVOKE, id, req, args);
    }
  },
  dialog: {
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options),
    showMessageBox: (options: any) => ipcRenderer.invoke('dialog:showMessageBox', options),
    showErrorBox: (title: string, content: string) => {
      // TASK:7 Input validation
      if (typeof title !== 'string') throw new Error('Invalid title');
      if (typeof content !== 'string') throw new Error('Invalid content');
      return ipcRenderer.invoke('dialog:showErrorBox', title, content);
    },
  },
  git: {
    init: (repoPath: string) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      return ipcRenderer.invoke('git:init', repoPath);
    },
    status: (repoPath: string) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      return ipcRenderer.invoke('git:status', repoPath);
    },
    add: (repoPath: string, files: string[]) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      if (!Array.isArray(files)) throw new Error('Invalid files array');
      return ipcRenderer.invoke('git:add', repoPath, files);
    },
    reset: (repoPath: string, files?: string[]) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      if (files && !Array.isArray(files)) throw new Error('Invalid files array');
      return ipcRenderer.invoke('git:reset', repoPath, files);
    },
    commit: (repoPath: string, message: string) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      if (typeof message !== 'string') throw new Error('Invalid message');
      return ipcRenderer.invoke('git:commit', repoPath, message);
    },
    push: (repoPath: string, remote: string, branch: string) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      if (typeof remote !== 'string') throw new Error('Invalid remote');
      if (typeof branch !== 'string') throw new Error('Invalid branch');
      return ipcRenderer.invoke('git:push', repoPath, remote, branch);
    },
    pull: (repoPath: string, remote: string, branch: string) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      if (typeof remote !== 'string') throw new Error('Invalid remote');
      if (typeof branch !== 'string') throw new Error('Invalid branch');
      return ipcRenderer.invoke('git:pull', repoPath, remote, branch);
    },
    branches: (repoPath: string) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      return ipcRenderer.invoke('git:branches', repoPath);
    },
    checkout: (repoPath: string, branch: string) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      if (typeof branch !== 'string') throw new Error('Invalid branch');
      return ipcRenderer.invoke('git:checkout', repoPath, branch);
    },
    checkoutLocalBranch: (repoPath: string, branch: string) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      if (typeof branch !== 'string') throw new Error('Invalid branch');
      return ipcRenderer.invoke('git:checkoutLocalBranch', repoPath, branch);
    },
    createBranch: (repoPath: string, branch: string) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      if (typeof branch !== 'string') throw new Error('Invalid branch');
      return ipcRenderer.invoke('git:createBranch', repoPath, branch);
    },
    log: (repoPath: string, options?: any) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      return ipcRenderer.invoke('git:log', repoPath, options);
    },
    diff: (repoPath: string, files?: string[]) => {
      // TASK:7 Input validation
      if (typeof repoPath !== 'string') throw new Error('Invalid repo path');
      if (files && !Array.isArray(files)) throw new Error('Invalid files array');
      return ipcRenderer.invoke('git:diff', repoPath, files);
    },
    // Legacy methods for compatibility
    isRepo: (dirPath?: string) => {
      // TASK:7 Input validation
      if (dirPath && typeof dirPath !== 'string') throw new Error('Invalid directory path');
      return ipcRenderer.invoke('git:isRepo', dirPath);
    },
    getStatus: (dirPath?: string) => {
      // TASK:7 Input validation
      if (dirPath && typeof dirPath !== 'string') throw new Error('Invalid directory path');
      return ipcRenderer.invoke('git:getStatus', dirPath);
    },
    getBranches: (dirPath?: string) => {
      // TASK:7 Input validation
      if (dirPath && typeof dirPath !== 'string') throw new Error('Invalid directory path');
      return ipcRenderer.invoke('git:getBranches', dirPath);
    },
    stageFile: (filePath: string, dirPath?: string) => {
      // TASK:7 Input validation
      if (typeof filePath !== 'string') throw new Error('Invalid file path');
      if (dirPath && typeof dirPath !== 'string') throw new Error('Invalid directory path');
      return ipcRenderer.invoke('git:stage', filePath, dirPath);
    },
    unstageFile: (filePath: string, dirPath?: string) => {
      // TASK:7 Input validation
      if (typeof filePath !== 'string') throw new Error('Invalid file path');
      if (dirPath && typeof dirPath !== 'string') throw new Error('Invalid directory path');
      return ipcRenderer.invoke('git:unstage', filePath, dirPath);
    },
    getDiff: (filePath?: string) => {
      // TASK:7 Input validation
      if (filePath && typeof filePath !== 'string') throw new Error('Invalid file path');
      return ipcRenderer.invoke('git:getDiff', filePath);
    },
  },
  security: {
    scanText: (text: string) => {
      // TASK:7 Input validation
      if (typeof text !== 'string') throw new Error('Invalid text');
      return ipcRenderer.invoke('security:scan-text', text);
    }
  },
  context: {
    build: (options: { taskIds?: number[]; top?: number; fromBatch?: boolean }) => {
      // TASK:7 Basic input validation
      if (options && typeof options !== 'object') throw new Error('Invalid options object');
      return ipcRenderer.invoke(IPC_CHANNELS.CONTEXT_BUILD, options);
    }
  },
  ai: {
    request: (req: any) => {
      // TASK:7 Basic input validation
      if (typeof req !== 'object' || req === null) throw new Error('Invalid request object');
      return ipcRenderer.invoke(IPC_CHANNELS.AI_REQUEST, req);
    },
    listProviders: () => ipcRenderer.invoke(IPC_CHANNELS.AI_PROVIDERS_LIST),
    listTools: () => ipcRenderer.invoke(IPC_CHANNELS.TOOL_LIST),
    invokeTool: (toolId: string, req: any, args?: any) => {
      if (typeof toolId !== 'string') throw new Error('Invalid toolId');
      if (req && (typeof req !== 'object')) throw new Error('Invalid req');
      return ipcRenderer.invoke(IPC_CHANNELS.TOOL_INVOKE, toolId, req, args);
    },
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.AI_STATS_GET),
    getProviderConfig: (options?: { redacted?: boolean }) => {
      // TASK:7 Basic input validation
      if (options && typeof options !== 'object') throw new Error('Invalid options object');
      return ipcRenderer.invoke(IPC_CHANNELS.AI_CONFIG_GET, options ?? {});
    },
    getProviderConfigSync: () => ipcRenderer.sendSync(IPC_CHANNELS.AI_CONFIG_GET_SYNC),
    saveProviderConfig: (config: any) => {
      // TASK:7 Basic input validation
      if (typeof config !== 'object' || config === null) throw new Error('Invalid config object');
      return ipcRenderer.invoke(IPC_CHANNELS.AI_CONFIG_SET, config);
    },
    clearProviderConfig: () => ipcRenderer.invoke(IPC_CHANNELS.AI_CONFIG_CLEAR),
    gatherContext: (req: ContextGatherRequest): Promise<ContextGatherResponse> => {
      // TASK:7 Basic input validation
      if (typeof req !== 'object' || req === null) throw new Error('Invalid request object');
      return ipcRenderer.invoke(IPC_CHANNELS.AI_CONTEXT_GATHER, req);
    },
    stream: (req: any, onChunk: (c: { delta: string; streamId: string }) => void, onComplete?: (m:any)=>void) => {
      // TASK:7 Basic input validation
      if (typeof req !== 'object' || req === null) throw new Error('Invalid request object');
      if (typeof onChunk !== 'function') throw new Error('Invalid onChunk callback');
      if (onComplete && typeof onComplete !== 'function') throw new Error('Invalid onComplete callback');
      
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const chunkHandler = (_:any, payload: any) => {
        if(payload.streamId === streamId) onChunk(payload);
      };
      const completeHandler = (_:any, payload: any) => {
        if(payload.streamId === streamId){
          ipcRenderer.removeListener(IPC_CHANNELS.AI_STREAM_CHUNK, chunkHandler as any);
          ipcRenderer.removeListener(IPC_CHANNELS.AI_STREAM_COMPLETE, completeHandler as any);
          onComplete && onComplete(payload);
        }
      };
      ipcRenderer.on(IPC_CHANNELS.AI_STREAM_CHUNK, chunkHandler as any);
      ipcRenderer.on(IPC_CHANNELS.AI_STREAM_COMPLETE, completeHandler as any);
      ipcRenderer.send(IPC_CHANNELS.AI_STREAM_REQUEST, { ...req, streamId });
      return streamId;
    },
    cancelStream: (streamId: string) => {
      // TASK:7 Input validation
      if (typeof streamId !== 'string') throw new Error('Invalid stream ID');
      ipcRenderer.send(IPC_CHANNELS.AI_STREAM_CANCEL, { streamId });
    }
  },
  retrieval: (() => {
    const progressListeners: Array<(e: { runId: string; processed: number; totalFiles: number; vectors: number; phase: string }) => void> = [];
    const completeListeners: Array<(e: { runId: string; summary: any }) => void> = [];

    ipcRenderer.on(IPC_CHANNELS.REINDEX_PROGRESS_EVENT, (_evt, payload) => {
      for (const l of progressListeners) {
        try { l(payload); } catch { /* ignore listener errors */ }
      }
    });
    ipcRenderer.on(IPC_CHANNELS.REINDEX_COMPLETE_EVENT, (_evt, payload) => {
      for (const l of completeListeners) {
        try { l(payload); } catch { /* ignore */ }
      }
    });

    return {
      startReindex: () => ipcRenderer.invoke(IPC_CHANNELS.REINDEX_START),
      cancelReindex: () => ipcRenderer.invoke(IPC_CHANNELS.REINDEX_CANCEL),
      getReindexSummary: () => ipcRenderer.invoke(IPC_CHANNELS.REINDEX_SUMMARY_GET),
      onReindexProgress: (cb: (e: { runId: string; processed: number; totalFiles: number; vectors: number; phase: string }) => void) => { 
        // TASK:7 Input validation
        if (typeof cb !== 'function') throw new Error('Invalid callback');
        progressListeners.push(cb); 
      },
      onReindexComplete: (cb: (e: { runId: string; summary: any }) => void) => { 
        // TASK:7 Input validation
        if (typeof cb !== 'function') throw new Error('Invalid callback');
        completeListeners.push(cb); 
      }
    };
  })(),
  diagnostics: {
    snapshot: () => {
      // Lightweight renderer-side snapshot (no main round-trip yet)
      const metrics = [
        { id: 'mem.rss', label: 'RSS (MB)', value: Math.round((process.memoryUsage().rss/1024/1024)*10)/10 },
        { id: 'models.open', label: 'Monaco Models', value: (window as any).monaco?.editor?.getModels?.().length ?? 0 },
        { id: 'ts', label: 'Timestamp', value: Date.now() }
      ];
      return { collectedAt: new Date().toISOString(), metrics };
    }
  },
  
  // Task operations
  tasks: {
    getLifecycleStats: () => ipcRenderer.invoke('tasks:lifecycle:stats')
  },
  patch: {
    createSession: (multiPatch: any, providerId?: string) => {
      if (!multiPatch || typeof multiPatch !== 'object') throw new Error('Invalid patch payload');
      if (providerId && typeof providerId !== 'string') throw new Error('Invalid providerId');
      return ipcRenderer.invoke('patch:create-session', multiPatch, providerId);
    },
    getSession: (sessionId: string) => {
      if (typeof sessionId !== 'string') throw new Error('Invalid sessionId');
      return ipcRenderer.invoke('patch:get-session', sessionId);
    },
    updateHunkStatus: (sessionId: string, filePath: string, hunkId: string, status: 'pending'|'accepted'|'rejected'|'conflict') => {
      if (typeof sessionId !== 'string') throw new Error('Invalid sessionId');
      if (typeof filePath !== 'string') throw new Error('Invalid filePath');
      if (typeof hunkId !== 'string') throw new Error('Invalid hunkId');
      if (!['pending','accepted','rejected','conflict'].includes(status)) throw new Error('Invalid status');
      return ipcRenderer.invoke('patch:update-hunk-status', sessionId, filePath, hunkId, status);
    },
    discardSession: (sessionId: string) => {
      if (typeof sessionId !== 'string') throw new Error('Invalid sessionId');
      return ipcRenderer.invoke('patch:discard-session', sessionId);
    },
    applySession: (sessionId: string) => {
      if (typeof sessionId !== 'string') throw new Error('Invalid sessionId');
      return ipcRenderer.invoke('patch:apply-session', sessionId);
    }
  }
};

contextBridge.exposeInMainWorld('primus', primusApi);

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: string, ...args: any[]) => {
    // TASK:7 Security hardening - Validate channel
    if (!INVOKE_CHANNELS.has(channel)) {
      throw new Error(`Unauthorized invoke channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    // TASK:7 Security hardening - Validate channel
    if (!RECEIVE_CHANNELS.has(channel)) {
      throw new Error(`Unauthorized receive channel: ${channel}`);
    }
    if (typeof func !== 'function') {
      throw new Error('Invalid callback function');
    }
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  send: (channel: string, data: any) => {
    // TASK:7 Security hardening - Validate channel
    if (!SEND_CHANNELS.has(channel)) {
      throw new Error(`Unauthorized send channel: ${channel}`);
    }
    ipcRenderer.send(channel, data);
  }
});
