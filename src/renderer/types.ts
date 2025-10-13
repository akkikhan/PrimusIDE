// Type definitions for the Primus IDE

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface SearchResult {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface ReplaceResult extends SearchResult {
  replacedContent: string;
}

export interface SettingsData {
  theme: 'light' | 'dark';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoSave: boolean;
  formatOnSave: boolean;
  trimTrailingWhitespace: boolean;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  main: string;
  activationEvents: string[];
  contributes?: {
    commands?: Array<{
      command: string;
      title: string;
      category?: string;
    }>;
    menus?: {
      [key: string]: Array<{
        command: string;
        when?: string;
        group?: string;
      }>;
    };
    keybindings?: Array<{
      command: string;
      key: string;
      when?: string;
    }>;
    languages?: Array<{
      id: string;
      extensions: string[];
      aliases?: string[];
      configuration?: string;
    }>;
    themes?: Array<{
      label: string;
      uiTheme: 'vs' | 'vs-dark' | 'hc-black';
      path: string;
    }>;
  };
  engines: {
    primusIDE: string;
  };
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
}

export interface PluginData {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  downloads: number;
  rating: number;
  updatedAt: string;
  publishedAt: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords: string[];
}

export interface TerminalResult {
  output: string;
  error: string;
  exitCode: number;
}

export interface SearchOptions {
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
}

export interface ReplaceOptions extends SearchOptions {
  replaceAll: boolean;
}

export interface SearchResult {
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  text: string;
  preview: string;
}

export interface ReplaceResult {
  filePath: string;
  replacements: number;
}

export interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
  isRepo: boolean;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  shortHash: string;
}

export interface PrimusAPI {
  ping(): string;
  fs: {
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<boolean>;
    readDir(dirPath: string): Promise<FileEntry[]>;
    selectFolder(): Promise<string | null>;
    selectFile(): Promise<string | null>;
  };
  terminal: {
    executeCommand(command: string): Promise<TerminalResult>;
    getCurrentDir(): Promise<string>;
  };
  search: {
    searchFiles(query: string, options: SearchOptions): Promise<SearchResult[]>;
    replaceInFiles(searchTerm: string, replaceTerm: string, options: ReplaceOptions): Promise<ReplaceResult[]>;
  };
  settings: {
    getSettings(): Promise<Partial<SettingsData>>;
    saveSettings(settings: SettingsData): Promise<boolean>;
  };
  plugins: {
    getInstalled(): Promise<Array<{
      id: string;
      manifest: PluginManifest;
      enabled: boolean;
      loadedAt: Date;
    }>>;
    getMarketplace(): Promise<PluginData[]>;
    install(pluginId: string): Promise<boolean>;
    uninstall(pluginId: string): Promise<boolean>;
    enable(pluginId: string): Promise<boolean>;
    disable(pluginId: string): Promise<boolean>;
    loadLocal(folderPath: string): Promise<PluginManifest>;
  };
  dialog: {
    showOpenDialog(options: any): Promise<string[] | null>;
    showSaveDialog(options: any): Promise<string | null>;
    showMessageBox(options: any): Promise<any>;
    showErrorBox(title: string, content: string): Promise<boolean>;
  };
  git: {
    getStatus(): Promise<GitStatus>;
    stageFile(filePath: string): Promise<boolean>;
    unstageFile(filePath: string): Promise<boolean>;
    commit(message: string): Promise<boolean>;
    push(): Promise<boolean>;
    pull(): Promise<boolean>;
    init(): Promise<boolean>;
    clone(url: string, directory: string): Promise<boolean>;
    createBranch(branchName: string): Promise<boolean>;
    switchBranch(branchName: string): Promise<boolean>;
    mergeBranch(branchName: string): Promise<boolean>;
    getBranches(): Promise<string[]>;
    getCommitHistory(limit?: number): Promise<GitCommit[]>;
  };
  security?: {
    scanText(text: string): Promise<any>;
  };
  context?: {
    build(options: { taskIds?: number[]; top?: number; fromBatch?: boolean }): Promise<any>;
  };
  ai?: {
    getProviderConfig?(options?: { redacted?: boolean }): Promise<any>;
    getProviderConfigSync?(): any;
    saveProviderConfig?(config: any): Promise<any> | void;
    clearProviderConfig?(): Promise<any>;
  };
}

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

declare global {
  interface Window {
    primus: PrimusAPI;
    electronAPI: PrimusAPI;
  }
}
