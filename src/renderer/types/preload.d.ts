import { FileEntry } from "../indexing/types";

// Git interfaces
export interface GitStatusResult {
  current: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  not_added: string[];
  conflicted: string[];
  created: string[];
  deleted: string[];
  renamed: string[];
}

export interface GitLogResult {
  all: Array<{
    hash: string;
    date: string;
    message: string;
    author_name: string;
    author_email: string;
  }>;
}

export interface GitBranchesResult {
  all: string[];
  current: string;
  branches: Record<string, any>;
}

declare global {
  interface Window {
    primus: {
      ping: () => string;
      fs: {
        readFile: (filePath: string) => Promise<string>;
        writeFile: (filePath: string, content: string) => Promise<boolean>;
        readDir: (dirPath: string) => Promise<FileEntry[]>;
        stat: (path: string) => Promise<{ isDirectory: boolean } | null>;
        selectFolder: () => Promise<string | null>;
        selectFile: () => Promise<string | null>;
        deleteFile: (filePath: string) => Promise<boolean>;
        deleteDirectory: (dirPath: string) => Promise<boolean>;
        renameFile: (oldPath: string, newPath: string) => Promise<boolean>;
        copyFile: (sourcePath: string, destPath: string) => Promise<boolean>;
        createDirectory: (dirPath: string) => Promise<boolean>;
        exists: (path: string) => Promise<boolean>;
      };
      terminal: {
        executeCommand: (command: string, options?: { cwd?: string }) => Promise<string>;
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
      tools: {
        invoke: (id: string, req: any, args?: any) => Promise<any>;
      };
      dialog: {
        showOpenDialog: (options: any) => Promise<any>;
        showSaveDialog: (options: any) => Promise<any>;
        showMessageBox: (options: any) => Promise<any>;
        showErrorBox: (title: string, content: string) => Promise<void>;
      };
      git: {
        init: (repoPath: string) => Promise<{ success: boolean; isNew: boolean }>;
        status: (repoPath: string) => Promise<GitStatusResult>;
        add: (repoPath: string, files: string[]) => Promise<{ success: boolean }>;
        reset: (repoPath: string, files?: string[]) => Promise<{ success: boolean }>;
        commit: (repoPath: string, message: string) => Promise<{ success: boolean; hash: string; summary: any }>;
        push: (repoPath: string, remote: string, branch: string) => Promise<{ success: boolean }>;
        pull: (repoPath: string, remote: string, branch: string) => Promise<{ success: boolean; files: any[]; insertions: number; deletions: number }>;
        branches: (repoPath: string) => Promise<GitBranchesResult>;
        checkout: (repoPath: string, branch: string) => Promise<{ success: boolean }>;
        checkoutLocalBranch: (repoPath: string, branch: string) => Promise<{ success: boolean }>;
        createBranch: (repoPath: string, branch: string) => Promise<{ success: boolean }>;
        log: (repoPath: string, options?: any) => Promise<GitLogResult>;
        diff: (repoPath: string, files?: string[]) => Promise<string>;
        // Legacy methods for compatibility
        isRepo: (dirPath?: string) => Promise<boolean>;
        getStatus: (dirPath?: string) => Promise<any>;
        getBranches: (dirPath?: string) => Promise<any>;
        stageFile: (filePath: string, dirPath?: string) => Promise<boolean>;
        unstageFile: (filePath: string, dirPath?: string) => Promise<boolean>;
        getDiff: (filePath?: string) => Promise<{ diff: string }>;
      };
      security: {
        scanText: (text: string) => Promise<{ findings: any[]; redactedText: string; durationMs: number; error?: string }>;
      };
      context: {
        build: (options: { taskIds?: number[]; top?: number; fromBatch?: boolean }) => Promise<any>;
      };
      ai?: {
        request: (req: any) => Promise<any>;
        listProviders: () => Promise<any[]>;
        getStats: () => Promise<any>;
        getProviderConfig: (options?: { redacted?: boolean }) => Promise<any>;
        getProviderConfigSync: () => any;
        saveProviderConfig: (config: any) => Promise<any>;
        clearProviderConfig: () => Promise<any>;
        gatherContext?: (req: any) => Promise<any>;
        stream: (req: any, onChunk: (c: { delta: string; streamId: string }) => void, onComplete?: (m: any) => void) => string;
        cancelStream: (streamId: string) => void;
        listTools: () => Promise<Array<{ id: string; name?: string; description?: string; capabilities?: string[] }>>;
        invokeTool: (toolId: string, req: any, args?: any) => Promise<any>;
      };
      retrieval?: {
        startReindex: () => Promise<{ runId: string } | { error: string }>;
        cancelReindex: () => Promise<{ cancelled: boolean; runId?: string; error?: string }>;
        getReindexSummary: () => Promise<any | null>;
        onReindexProgress: (cb: (e: { runId: string; processed: number; totalFiles: number; vectors: number; phase: string }) => void) => void;
        onReindexComplete: (cb: (e: { runId: string; summary: any }) => void) => void;
      };
      diagnostics: {
        snapshot: () => { collectedAt: string; metrics: Array<{ id: string; label: string; value: number | string }> };
      };
      tasks: {
        getLifecycleStats: () => Promise<any>;
      };
    };
    electronAPI: any;
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      receive: (channel: string, func: (...args: any[]) => void) => void;
      send: (channel: string, data: any) => void;
    };
  }
}

// Debug channels exposed via electron.send/receive include:
// send: 'debug:start','debug:stop','debug:continue','debug:stepOver','debug:stepIn','debug:stepOut'
// receive: 'debug:output','debug:stopped','debug:terminated','debug:stack','debug:variables'

export {};
