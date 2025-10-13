import { EventEmitter } from 'events';

/**
 * Context Awareness Engine - Core manager for understanding development context
 * Tracks project structure, open files, cursor position, selections, and workspace state
 * Provides intelligent context for AI assistance
 */

export interface FileContext {
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
  lastModified: number;
  cursorPosition?: {
    line: number;
    column: number;
  };
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
    text: string;
  };
}

export interface ProjectStructure {
  root: string;
  files: string[];
  directories: string[];
  packageJson?: any;
  tsconfig?: any;
  dependencies: {
    production: string[];
    development: string[];
  };
  frameworks: string[];
  languages: string[];
}

export interface WorkspaceContext {
  openFiles: FileContext[];
  activeFile?: FileContext;
  recentFiles: string[];
  projectStructure: ProjectStructure;
  gitStatus?: {
    branch: string;
    hasChanges: boolean;
    stagedFiles: string[];
    modifiedFiles: string[];
  };
  errors: {
    file: string;
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }[];
}

export interface ContextIntent {
  type: 'fix_error' | 'implement_feature' | 'refactor' | 'explain' | 'optimize' | 'test';
  target: 'selection' | 'file' | 'project' | 'function' | 'class';
  scope: 'local' | 'file' | 'project' | 'dependencies';
  context: {
    relatedFiles: string[];
    dependencies: string[];
    references: string[];
  };
}

export class ContextManager extends EventEmitter {
  private workspaceContext: WorkspaceContext;
  private contextUpdateInterval: NodeJS.Timeout | null = null;
  private isAnalyzing: boolean = false;

  constructor() {
    super();
    this.workspaceContext = {
      openFiles: [],
      recentFiles: [],
      projectStructure: {
        root: '',
        files: [],
        directories: [],
        dependencies: { production: [], development: [] },
        frameworks: [],
        languages: []
      },
      errors: []
    };
    this.startContextMonitoring();
  }

  /**
   * Initialize context awareness for the workspace
   */
  async initialize(workspaceRoot: string): Promise<void> {
    try {
      this.workspaceContext.projectStructure.root = workspaceRoot;
      await this.analyzeProjectStructure();
      await this.detectFrameworks();
      await this.loadRecentFiles();
      
      this.emit('contextInitialized', this.workspaceContext);
    } catch (error) {
      console.error('Failed to initialize context:', error);
      this.emit('contextError', error);
    }
  }

  /**
   * Analyze complete project structure
   */
  private async analyzeProjectStructure(): Promise<void> {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    try {
      const structure = await this.scanDirectory(this.workspaceContext.projectStructure.root);
      this.workspaceContext.projectStructure = {
        ...this.workspaceContext.projectStructure,
        ...structure
      };

      // Load package.json if exists
      await this.loadPackageInfo();
      
      // Load tsconfig if exists
      await this.loadTypeScriptConfig();

      this.emit('projectStructureUpdated', this.workspaceContext.projectStructure);
    } catch (error) {
      console.error('Project structure analysis failed:', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Scan directory recursively
   */
  private async scanDirectory(path: string): Promise<Partial<ProjectStructure>> {
    const files: string[] = [];
    const directories: string[] = [];
    const languages = new Set<string>();

    try {
      const items = await window.electronAPI.fs.readDir(path);
      
      for (const item of items) {
        const fullPath = `${path}/${item.name}`;
        
        if (item.isDirectory) {
          // Skip common ignored directories
          if (!this.shouldIgnoreDirectory(item.name)) {
            directories.push(fullPath);
            const subStructure = await this.scanDirectory(fullPath);
            files.push(...(subStructure.files || []));
            directories.push(...(subStructure.directories || []));
            subStructure.languages?.forEach(lang => languages.add(lang));
          }
        } else {
          files.push(fullPath);
          const language = this.getLanguageFromExtension(item.name);
          if (language) languages.add(language);
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory ${path}:`, error);
    }

    return {
      files,
      directories,
      languages: Array.from(languages)
    };
  }

  /**
   * Load package.json information
   */
  private async loadPackageInfo(): Promise<void> {
    try {
      const packagePath = `${this.workspaceContext.projectStructure.root}/package.json`;
      const content = await window.electronAPI.fs.readFile(packagePath);
      const packageJson = JSON.parse(content);
      
      this.workspaceContext.projectStructure.packageJson = packageJson;
      this.workspaceContext.projectStructure.dependencies = {
        production: Object.keys(packageJson.dependencies || {}),
        development: Object.keys(packageJson.devDependencies || {})
      };
    } catch (error) {
      // Package.json doesn't exist or couldn't be parsed
      
    }
  }

  /**
   * Load TypeScript configuration
   */
  private async loadTypeScriptConfig(): Promise<void> {
    try {
      const tsconfigPath = `${this.workspaceContext.projectStructure.root}/tsconfig.json`;
      const content = await window.electronAPI.fs.readFile(tsconfigPath);
      this.workspaceContext.projectStructure.tsconfig = JSON.parse(content);
    } catch (error) {
      
    }
  }

  /**
   * Detect frameworks and libraries
   */
  private async detectFrameworks(): Promise<void> {
    const frameworks = new Set<string>();
    const dependencies = [
      ...this.workspaceContext.projectStructure.dependencies.production,
      ...this.workspaceContext.projectStructure.dependencies.development
    ];

    // Framework detection patterns
    const frameworkPatterns = {
      'React': ['react', '@types/react'],
      'Vue': ['vue', '@vue/core'],
      'Angular': ['@angular/core', '@angular/common'],
      'Next.js': ['next'],
      'Nuxt': ['nuxt'],
      'Svelte': ['svelte'],
      'Express': ['express'],
      'Fastify': ['fastify'],
      'Electron': ['electron'],
      'React Native': ['react-native'],
      'Vite': ['vite'],
      'Webpack': ['webpack'],
      'TypeScript': ['typescript'],
      'Tailwind CSS': ['tailwindcss'],
      'Material-UI': ['@mui/material', '@material-ui/core'],
      'Ant Design': ['antd'],
      'Chakra UI': ['@chakra-ui/react'],
      'Styled Components': ['styled-components'],
      'Emotion': ['@emotion/react'],
      'Redux': ['redux', '@reduxjs/toolkit'],
      'MobX': ['mobx'],
      'Zustand': ['zustand'],
      'Jest': ['jest'],
      'Cypress': ['cypress'],
      'Playwright': ['playwright'],
      'Vitest': ['vitest'],
      'ESLint': ['eslint'],
      'Prettier': ['prettier'],
      'Husky': ['husky'],
      'Lint Staged': ['lint-staged']
    };

    for (const [framework, patterns] of Object.entries(frameworkPatterns)) {
      if (patterns.some(pattern => dependencies.includes(pattern))) {
        frameworks.add(framework);
      }
    }

    this.workspaceContext.projectStructure.frameworks = Array.from(frameworks);
  }

  /**
   * Update file context when file is opened or modified
   */
  async updateFileContext(filePath: string, content: string, cursorPosition?: { line: number; column: number }, selection?: any): Promise<void> {
    const language = this.getLanguageFromExtension(filePath);
    const existingIndex = this.workspaceContext.openFiles.findIndex(f => f.path === filePath);
    
    const fileContext: FileContext = {
      path: filePath,
      content,
      language: language || 'text',
      isDirty: true,
      lastModified: Date.now(),
      cursorPosition,
      selection: selection ? {
        start: selection.start,
        end: selection.end,
        text: selection.text
      } : undefined
    };

    if (existingIndex >= 0) {
      this.workspaceContext.openFiles[existingIndex] = fileContext;
    } else {
      this.workspaceContext.openFiles.push(fileContext);
    }

    // Update recent files
    this.updateRecentFiles(filePath);
    
    this.emit('fileContextUpdated', fileContext);
  }

  /**
   * Set active file
   */
  setActiveFile(filePath: string): void {
    const fileContext = this.workspaceContext.openFiles.find(f => f.path === filePath);
    if (fileContext) {
      this.workspaceContext.activeFile = fileContext;
      this.updateRecentFiles(filePath);
      this.emit('activeFileChanged', fileContext);
    }
  }

  /**
   * Close file and remove from context
   */
  closeFile(filePath: string): void {
    const index = this.workspaceContext.openFiles.findIndex(f => f.path === filePath);
    if (index >= 0) {
      this.workspaceContext.openFiles.splice(index, 1);
      
      if (this.workspaceContext.activeFile?.path === filePath) {
        this.workspaceContext.activeFile = this.workspaceContext.openFiles[0];
      }
      
      this.emit('fileClosed', filePath);
    }
  }

  /**
   * Generate intelligent context for AI assistance
   */
  generateContextForIntent(intent: ContextIntent): {
    context: string;
    relevantFiles: FileContext[];
    suggestions: string[];
  } {
    const activeFile = this.workspaceContext.activeFile;
    const relevantFiles: FileContext[] = [];
    let context = '';
    const suggestions: string[] = [];

    // Build context based on intent
    switch (intent.type) {
      case 'fix_error':
        context = this.generateErrorContext(intent);
        break;
      case 'implement_feature':
        context = this.generateFeatureContext(intent);
        break;
      case 'refactor':
        context = this.generateRefactorContext(intent);
        break;
      case 'explain':
        context = this.generateExplanationContext(intent);
        break;
      case 'optimize':
        context = this.generateOptimizationContext(intent);
        break;
      case 'test':
        context = this.generateTestContext(intent);
        break;
    }

    // Add project context
    context += this.generateProjectContext();

    // Find relevant files
    relevantFiles.push(...this.findRelevantFiles(intent));

    // Generate suggestions
    suggestions.push(...this.generateSuggestions(intent));

    return {
      context,
      relevantFiles,
      suggestions
    };
  }

  /**
   * Get current workspace context
   */
  getWorkspaceContext(): WorkspaceContext {
    return { ...this.workspaceContext };
  }

  /**
   * Start monitoring context changes
   */
  private startContextMonitoring(): void {
    this.contextUpdateInterval = setInterval(() => {
      this.checkForChanges();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop monitoring context changes
   */
  stopContextMonitoring(): void {
    if (this.contextUpdateInterval) {
      clearInterval(this.contextUpdateInterval);
      this.contextUpdateInterval = null;
    }
  }

  /**
   * Check for file system changes
   */
  private async checkForChanges(): Promise<void> {
    // This would typically check for file system changes
    // and update the context accordingly
    try {
      // Check if project structure changed
      if (Date.now() - (this.workspaceContext.projectStructure as any).lastChecked > 30000) {
        await this.analyzeProjectStructure();
        (this.workspaceContext.projectStructure as any).lastChecked = Date.now();
      }
    } catch (error) {
      console.error('Context monitoring error:', error);
    }
  }

  // Helper methods
  private shouldIgnoreDirectory(name: string): boolean {
    const ignoredDirs = [
      'node_modules', '.git', 'dist', 'build', '.next', 
      '.nuxt', 'coverage', '.vscode', '.idea', 'tmp', 'temp'
    ];
    return ignoredDirs.includes(name) || name.startsWith('.');
  }

  private getLanguageFromExtension(fileName: string): string | null {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sh': 'shellscript',
      'sql': 'sql'
    };
    return ext ? languageMap[ext] || null : null;
  }

  private updateRecentFiles(filePath: string): void {
    const recentFiles = this.workspaceContext.recentFiles.filter(f => f !== filePath);
    recentFiles.unshift(filePath);
    this.workspaceContext.recentFiles = recentFiles.slice(0, 20); // Keep last 20 files
    this.saveRecentFiles();
  }

  private async loadRecentFiles(): Promise<void> {
    try {
      const stored = localStorage.getItem('primus-recent-files');
      if (stored) {
        this.workspaceContext.recentFiles = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load recent files:', error);
    }
  }

  private saveRecentFiles(): void {
    try {
      localStorage.setItem('primus-recent-files', JSON.stringify(this.workspaceContext.recentFiles));
    } catch (error) {
      console.error('Failed to save recent files:', error);
    }
  }

  // Context generation methods
  private generateErrorContext(intent: ContextIntent): string {
    const errors = this.workspaceContext.errors;
    const activeFile = this.workspaceContext.activeFile;
    
    let context = '## Error Context\n';
    
    if (activeFile && errors.length > 0) {
      const fileErrors = errors.filter(e => e.file === activeFile.path);
      if (fileErrors.length > 0) {
        context += `Current file has ${fileErrors.length} error(s):\n`;
        fileErrors.forEach(error => {
          context += `- Line ${error.line}: ${error.message}\n`;
        });
      }
    }

    if (activeFile?.selection) {
      context += `\nSelected code:\n\`\`\`${activeFile.language}\n${activeFile.selection.text}\n\`\`\`\n`;
    }

    return context;
  }

  private generateFeatureContext(intent: ContextIntent): string {
    const activeFile = this.workspaceContext.activeFile;
    let context = '## Feature Implementation Context\n';
    
    context += `Project frameworks: ${this.workspaceContext.projectStructure.frameworks.join(', ')}\n`;
    context += `Available dependencies: ${this.workspaceContext.projectStructure.dependencies.production.join(', ')}\n`;
    
    if (activeFile) {
      context += `\nCurrent file: ${activeFile.path}\n`;
      context += `Language: ${activeFile.language}\n`;
      
      if (activeFile.selection) {
        context += `\nSelected code area:\n\`\`\`${activeFile.language}\n${activeFile.selection.text}\n\`\`\`\n`;
      } else if (activeFile.cursorPosition) {
        const lines = activeFile.content.split('\n');
        const contextLines = lines.slice(
          Math.max(0, activeFile.cursorPosition.line - 5),
          Math.min(lines.length, activeFile.cursorPosition.line + 5)
        );
        context += `\nCursor context (line ${activeFile.cursorPosition.line}):\n\`\`\`${activeFile.language}\n${contextLines.join('\n')}\n\`\`\`\n`;
      }
    }

    return context;
  }

  private generateRefactorContext(intent: ContextIntent): string {
    // Implementation for refactor context
    return '## Refactoring Context\n';
  }

  private generateExplanationContext(intent: ContextIntent): string {
    // Implementation for explanation context
    return '## Code Explanation Context\n';
  }

  private generateOptimizationContext(intent: ContextIntent): string {
    // Implementation for optimization context
    return '## Optimization Context\n';
  }

  private generateTestContext(intent: ContextIntent): string {
    // Implementation for test context
    return '## Testing Context\n';
  }

  private generateProjectContext(): string {
    const structure = this.workspaceContext.projectStructure;
    let context = '\n## Project Context\n';
    
    context += `Root: ${structure.root}\n`;
    context += `Languages: ${structure.languages.join(', ')}\n`;
    context += `Frameworks: ${structure.frameworks.join(', ')}\n`;
    context += `Total files: ${structure.files.length}\n`;
    
    if (structure.packageJson) {
      context += `Package: ${structure.packageJson.name} v${structure.packageJson.version}\n`;
    }

    return context;
  }

  private findRelevantFiles(intent: ContextIntent): FileContext[] {
    // Find files relevant to the current intent
    return this.workspaceContext.openFiles.filter(file => {
      // Add logic to determine file relevance
      return true; // Simplified for now
    });
  }

  private generateSuggestions(intent: ContextIntent): string[] {
    const suggestions: string[] = [];
    
    // Generate context-aware suggestions
    switch (intent.type) {
      case 'fix_error':
        suggestions.push('Check syntax errors', 'Verify imports', 'Check type definitions');
        break;
      case 'implement_feature':
        suggestions.push('Create new component', 'Add API endpoint', 'Update tests');
        break;
      // Add more suggestions for other intent types
    }

    return suggestions;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopContextMonitoring();
    this.removeAllListeners();
  }
}

export const contextManager = new ContextManager();
