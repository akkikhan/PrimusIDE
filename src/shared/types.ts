// src/shared/types.ts

export interface FileEntry {
  name: string;
  isDirectory: () => boolean;
}

export interface PrimusAPI {
  ping: () => string;
  fs: {
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    readDir: (dirPath: string) => Promise<FileEntry[]>;
    stat: (path: string) => Promise<{ isDirectory: boolean } | null>;
    selectFolder: () => Promise<string | null>;
    selectFile: () => Promise<string | null>;
  };
  terminal: {
    executeCommand: (command: string) => Promise<string>;
    getCurrentDir: () => Promise<string>;
  };
  search: {
    searchFiles: (query: string, options: any) => Promise<any>;
    replaceInFiles: (searchTerm: string, replaceTerm: string, options: any) => Promise<any>;
  };
  settings: {
    getSettings: () => Promise<any>;
    saveSettings: (settings: any) => Promise<void>;
  };
  plugins: {
    getInstalled: () => Promise<any[]>;
    getMarketplace: () => Promise<any[]>;
    install: (pluginId: string) => Promise<void>;
    uninstall: (pluginId: string) => Promise<void>;
    enable: (pluginId: string) => Promise<void>;
    disable: (pluginId: string) => Promise<void>;
    loadLocal: (folderPath: string) => Promise<void>;
  };
  dialog: {
    showOpenDialog: (options: any) => Promise<any>;
    showSaveDialog: (options: any) => Promise<any>;
    showMessageBox: (options: any) => Promise<any>;
    showErrorBox: (title: string, content: string) => Promise<void>;
  };
  git: {
    getStatus: () => Promise<any>;
    stageFile: (filePath: string) => Promise<void>;
    unstageFile: (filePath: string) => Promise<void>;
    commit: (message: string) => Promise<void>;
    push: () => Promise<void>;
    pull: () => Promise<void>;
    init: () => Promise<void>;
    clone: (url: string, directory: string) => Promise<void>;
    createBranch: (branchName: string) => Promise<void>;
    switchBranch: (branchName: string) => Promise<void>;
    mergeBranch: (branchName: string) => Promise<void>;
    getBranches: () => Promise<string[]>;
    getCommitHistory: (limit?: number) => Promise<any[]>;
  };
}

export interface IRecentProject {
  name: string;
  path: string;
  lastOpened: string;
}
