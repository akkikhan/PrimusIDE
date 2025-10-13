"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/preload/preload.ts
const electron_1 = require("electron");
const primusApi = {
    ping: () => 'pong',
    fs: {
        readFile: (filePath) => electron_1.ipcRenderer.invoke('fs:readFile', filePath),
        writeFile: (filePath, content) => electron_1.ipcRenderer.invoke('fs:writeFile', filePath, content),
        readDir: (dirPath) => electron_1.ipcRenderer.invoke('fs:readDir', dirPath),
        stat: (path) => electron_1.ipcRenderer.invoke('fs:stat', path),
        selectFolder: () => electron_1.ipcRenderer.invoke('fs:selectFolder'),
        selectFile: () => electron_1.ipcRenderer.invoke('fs:selectFile'),
    },
    terminal: {
        executeCommand: (command) => electron_1.ipcRenderer.invoke('terminal:executeCommand', command),
        getCurrentDir: () => electron_1.ipcRenderer.invoke('terminal:getCurrentDir'),
    },
    search: {
        searchFiles: (query, options) => electron_1.ipcRenderer.invoke('search:searchFiles', query, options),
        replaceInFiles: (searchTerm, replaceTerm, options) => electron_1.ipcRenderer.invoke('search:replaceInFiles', searchTerm, replaceTerm, options),
    },
    settings: {
        getSettings: () => electron_1.ipcRenderer.invoke('settings:getSettings'),
        saveSettings: (settings) => electron_1.ipcRenderer.invoke('settings:saveSettings', settings),
    },
    plugins: {
        getInstalled: () => electron_1.ipcRenderer.invoke('plugins:getInstalled'),
        getMarketplace: () => electron_1.ipcRenderer.invoke('plugins:getMarketplace'),
        install: (pluginId) => electron_1.ipcRenderer.invoke('plugins:install', pluginId),
        uninstall: (pluginId) => electron_1.ipcRenderer.invoke('plugins:uninstall', pluginId),
        enable: (pluginId) => electron_1.ipcRenderer.invoke('plugins:enable', pluginId),
        disable: (pluginId) => electron_1.ipcRenderer.invoke('plugins:disable', pluginId),
        loadLocal: (folderPath) => electron_1.ipcRenderer.invoke('plugins:loadLocal', folderPath),
    },
    dialog: {
        showOpenDialog: (options) => electron_1.ipcRenderer.invoke('dialog:showOpenDialog', options),
        showSaveDialog: (options) => electron_1.ipcRenderer.invoke('dialog:showSaveDialog', options),
        showMessageBox: (options) => electron_1.ipcRenderer.invoke('dialog:showMessageBox', options),
        showErrorBox: (title, content) => electron_1.ipcRenderer.invoke('dialog:showErrorBox', title, content),
    },
    git: {
        isRepo: (dirPath) => electron_1.ipcRenderer.invoke('git:isRepo', dirPath),
        getStatus: () => electron_1.ipcRenderer.invoke('git:getStatus'),
        getBranches: () => electron_1.ipcRenderer.invoke('git:getBranches'),
        commit: (message, files) => electron_1.ipcRenderer.invoke('git:commit', message, files),
        push: (remote, branch) => electron_1.ipcRenderer.invoke('git:push', remote, branch),
        pull: (remote, branch) => electron_1.ipcRenderer.invoke('git:pull', remote, branch),
        getDiff: (file) => electron_1.ipcRenderer.invoke('git:getDiff', file),
    },
};
electron_1.contextBridge.exposeInMainWorld('primus', primusApi);
electron_1.contextBridge.exposeInMainWorld('electron', {
    receive: (channel, func) => {
        const validChannels = ['file-changed', 'debug:output', 'debug:stopped', 'debug:terminated'];
        if (validChannels.includes(channel)) {
            electron_1.ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    send: (channel, data) => {
        const validChannels = ['watcher:start', 'watcher:stop', 'debug:start', 'debug:stop'];
        if (validChannels.includes(channel)) {
            electron_1.ipcRenderer.send(channel, data);
        }
    }
});
