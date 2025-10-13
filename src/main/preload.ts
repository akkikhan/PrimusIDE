// Preload script: expose minimal safe APIs
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipcChannels.js';

const primusAPI = {
  ping: () => 'pong',
  ai: {
    listProviders: () => ipcRenderer.invoke(IPC_CHANNELS.AI_PROVIDERS_LIST),
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.AI_STATS_GET),
    request: (req: any) => ipcRenderer.invoke(IPC_CHANNELS.AI_REQUEST, req),
    gatherContext: (req: any) => ipcRenderer.invoke(IPC_CHANNELS.AI_CONTEXT_GATHER, req),
    stream: (req: any, onChunk: (c:any)=>void, onComplete: (f:any)=>void) => {
      const streamId = req.streamId || ('s_' + Date.now());
      const chunkHandler = (_evt: any, payload: any) => {
        if(payload.streamId !== streamId) return;
        onChunk && onChunk(payload);
      };
      const completeHandler = (_evt: any, payload: any) => {
        if(payload.streamId !== streamId) return;
        ipcRenderer.removeListener(IPC_CHANNELS.AI_STREAM_CHUNK, chunkHandler);
        ipcRenderer.removeListener(IPC_CHANNELS.AI_STREAM_COMPLETE, completeHandler);
        onComplete && onComplete(payload);
      };
      ipcRenderer.on(IPC_CHANNELS.AI_STREAM_CHUNK, chunkHandler);
      ipcRenderer.on(IPC_CHANNELS.AI_STREAM_COMPLETE, completeHandler);
      ipcRenderer.send(IPC_CHANNELS.AI_STREAM_REQUEST, { ...req, streamId });
      return streamId;
    },
    cancelStream: (streamId: string) => ipcRenderer.send(IPC_CHANNELS.AI_STREAM_CANCEL, { streamId })
  },
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
    stat: (path: string) => ipcRenderer.invoke('fs:stat', path),
    selectFolder: () => ipcRenderer.invoke('fs:selectFolder'),
    selectFile: () => ipcRenderer.invoke('fs:selectFile'),
    deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
    deleteDirectory: (dirPath: string) => ipcRenderer.invoke('fs:deleteDirectory', dirPath),
    renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:renameFile', oldPath, newPath),
    copyFile: (sourcePath: string, destPath: string) => ipcRenderer.invoke('fs:copyFile', sourcePath, destPath),
    createDirectory: (dirPath: string) => ipcRenderer.invoke('fs:createDirectory', dirPath),
    exists: (path: string) => ipcRenderer.invoke('fs:exists', path)
  },
  terminal: {
    executeCommand: (command: string) => ipcRenderer.invoke('terminal:executeCommand', command),
    getCurrentDir: () => ipcRenderer.invoke('terminal:getCurrentDir')
  },
  search: {
    searchFiles: (query: string, options: any) => ipcRenderer.invoke('search:searchFiles', query, options),
    replaceInFiles: (searchTerm: string, replaceTerm: string, options: any) => ipcRenderer.invoke('search:replaceInFiles', searchTerm, replaceTerm, options)
  },
  settings: {
    getSettings: () => ipcRenderer.invoke('settings:getSettings'),
    saveSettings: (settings: any) => ipcRenderer.invoke('settings:saveSettings', settings)
  },
  plugins: {
    getInstalled: () => ipcRenderer.invoke('plugins:getInstalled'),
    getMarketplace: () => ipcRenderer.invoke('plugins:getMarketplace'),
    install: (pluginId: string) => ipcRenderer.invoke('plugins:install', pluginId),
    uninstall: (pluginId: string) => ipcRenderer.invoke('plugins:uninstall', pluginId),
    enable: (pluginId: string) => ipcRenderer.invoke('plugins:enable', pluginId),
    disable: (pluginId: string) => ipcRenderer.invoke('plugins:disable', pluginId),
    loadLocal: (folderPath: string) => ipcRenderer.invoke('plugins:loadLocal', folderPath)
  },
  dialog: {
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options),
    showMessageBox: (options: any) => ipcRenderer.invoke('dialog:showMessageBox', options),
    showErrorBox: (title: string, content: string) => ipcRenderer.invoke('dialog:showErrorBox', title, content)
  },
  git: {
    getStatus: () => ipcRenderer.invoke('git:getStatus'),
    stageFile: (filePath: string) => ipcRenderer.invoke('git:stageFile', filePath),
    unstageFile: (filePath: string) => ipcRenderer.invoke('git:unstageFile', filePath),
    commit: (message: string) => ipcRenderer.invoke('git:commit', message),
    push: () => ipcRenderer.invoke('git:push'),
    pull: () => ipcRenderer.invoke('git:pull'),
    init: () => ipcRenderer.invoke('git:init'),
    clone: (url: string, directory: string) => ipcRenderer.invoke('git:clone', url, directory),
    createBranch: (branchName: string) => ipcRenderer.invoke('git:createBranch', branchName),
    switchBranch: (branchName: string) => ipcRenderer.invoke('git:switchBranch', branchName),
    mergeBranch: (branchName: string) => ipcRenderer.invoke('git:mergeBranch', branchName),
    getBranches: () => ipcRenderer.invoke('git:getBranches'),
    getCommitHistory: (limit?: number) => ipcRenderer.invoke('git:getCommitHistory', limit)
  }
};

contextBridge.exposeInMainWorld('primus', primusAPI);
contextBridge.exposeInMainWorld('electronAPI', primusAPI);
