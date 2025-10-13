import { contextManager, ContextIntent, FileContext } from './ContextManager';
import { EventEmitter } from 'events';

/**
 * Smart Code Intelligence Service
 * Provides intelligent code analysis, suggestions, and context-aware assistance
 * Integrates with AI providers and context awareness engine
 */

export interface CodeSuggestion {
  id: string;
  type: 'fix' | 'refactor' | 'optimize' | 'feature' | 'test' | 'documentation';
  title: string;
  description: string;
  confidence: number;
  code: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  dependencies?: string[];
  estimatedTime?: string;
  impact: 'low' | 'medium' | 'high';
}

export interface CodeAnalysis {
  complexity: {
    cyclomatic: number;
    cognitive: number;
    maintainability: number;
  };
  issues: {
    errors: number;
    warnings: number;
    info: number;
  };
  metrics: {
    linesOfCode: number;
    duplicatedLines: number;
    testCoverage?: number;
    technicalDebt?: number;
  };
  dependencies: {
    used: string[];
    unused: string[];
    outdated: string[];
    vulnerable: string[];
  };
}

export interface IntelligentContext {
  currentFocus: 'coding' | 'debugging' | 'testing' | 'refactoring' | 'learning';
  userIntent: ContextIntent;
  relevantFiles: FileContext[];
  codePattern: string;
  suggestedActions: CodeSuggestion[];
  contextualHelp: string[];
}

export class SmartCodeIntelligence extends EventEmitter {
  private currentAnalysis: CodeAnalysis | null = null;
  private activeSuggestions: CodeSuggestion[] = [];
  private isAnalyzing: boolean = false;
  private analysisCache: Map<string, CodeAnalysis> = new Map();

  constructor() {
    super();
    this.setupContextListeners();
  }

  /**
   * Setup listeners for context changes
   */
  private setupContextListeners(): void {
    contextManager.on('fileContextUpdated', (fileContext: FileContext) => {
      this.analyzeFileContext(fileContext);
    });

    contextManager.on('activeFileChanged', (fileContext: FileContext) => {
      this.generateSuggestionsForFile(fileContext);
    });

    contextManager.on('projectStructureUpdated', () => {
      this.analyzeProjectStructure();
    });
  }

  /**
   * Analyze file context and generate intelligent suggestions
   */
  async analyzeFileContext(fileContext: FileContext): Promise<void> {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    try {
      // Check cache first
      const cacheKey = `${fileContext.path}:${fileContext.lastModified}`;
      if (this.analysisCache.has(cacheKey)) {
        this.currentAnalysis = this.analysisCache.get(cacheKey)!;
        this.emit('analysisCompleted', this.currentAnalysis);
        return;
      }

      // Perform analysis
      const analysis = await this.performCodeAnalysis(fileContext);
      this.currentAnalysis = analysis;
      
      // Cache the result
      this.analysisCache.set(cacheKey, analysis);
      
      // Generate suggestions based on analysis
      await this.generateSuggestionsForFile(fileContext);
      
      this.emit('analysisCompleted', analysis);
    } catch (error) {
      console.error('Code analysis failed:', error);
      this.emit('analysisError', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Perform comprehensive code analysis
   */
  private async performCodeAnalysis(fileContext: FileContext): Promise<CodeAnalysis> {
    const analysis: CodeAnalysis = {
      complexity: await this.calculateComplexity(fileContext),
      issues: await this.detectIssues(fileContext),
      metrics: await this.calculateMetrics(fileContext),
      dependencies: await this.analyzeDependencies(fileContext)
    };

    return analysis;
  }

  /**
   * Calculate code complexity metrics
   */
  private async calculateComplexity(fileContext: FileContext): Promise<CodeAnalysis['complexity']> {
    const content = fileContext.content;
    const lines = content.split('\n');
    
    // Simple complexity calculation (can be enhanced with AST parsing)
    let cyclomatic = 1; // Start with 1
    let cognitive = 0;
    
    // Count decision points for cyclomatic complexity
    const decisionPatterns = [
      /\bif\b/g, /\belse\b/g, /\bfor\b/g, /\bwhile\b/g,
      /\bswitch\b/g, /\bcase\b/g, /\bcatch\b/g, /\?\s*:/g,
      /&&/g, /\|\|/g
    ];
    
    for (const pattern of decisionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        cyclomatic += matches.length;
        cognitive += matches.length;
      }
    }
    
    // Additional cognitive complexity for nested structures
    let nestingLevel = 0;
    for (const line of lines) {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      nestingLevel += openBraces - closeBraces;
      
      if (nestingLevel > 2) {
        cognitive += nestingLevel - 2;
      }
    }
    
    // Calculate maintainability index (simplified)
    const linesOfCode = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
    const maintainability = Math.max(0, Math.min(100, 
      171 - 5.2 * Math.log(linesOfCode) - 0.23 * cyclomatic - 16.2 * Math.log(linesOfCode / 10)
    ));
    
    return {
      cyclomatic,
      cognitive,
      maintainability: Math.round(maintainability)
    };
  }

  /**
   * Detect code issues
   */
  private async detectIssues(fileContext: FileContext): Promise<CodeAnalysis['issues']> {
    const content = fileContext.content;
    let errors = 0;
    let warnings = 0;
    let info = 0;
    
    // Simple pattern-based issue detection
    const patterns = {
      errors: [
        /console\.log\(/g, // Console.log in production
        /debugger;?/g,    // Debugger statements
        /TODO:/g,         // TODO comments
        /FIXME:/g         // FIXME comments
      ],
      warnings: [
        /var\s+\w+/g,     // var usage instead of let/const
        /==\s*null/g,     // == null instead of === null
        /!=\s*null/g,     // != null instead of !== null
        /function\s*\(/g  // Function declarations in strict mode
      ],
      info: [
        /@ts-ignore/g,    // TypeScript ignores
        /eslint-disable/g // ESLint disables
      ]
    };
    
    for (const pattern of patterns.errors) {
      const matches = content.match(pattern);
      if (matches) errors += matches.length;
    }
    
    for (const pattern of patterns.warnings) {
      const matches = content.match(pattern);
      if (matches) warnings += matches.length;
    }
    
    for (const pattern of patterns.info) {
      const matches = content.match(pattern);
      if (matches) info += matches.length;
    }
    
    return { errors, warnings, info };
  }

  /**
   * Calculate code metrics
   */
  private async calculateMetrics(fileContext: FileContext): Promise<CodeAnalysis['metrics']> {
    const content = fileContext.content;
    const lines = content.split('\n');
    
    const linesOfCode = lines.filter(line => 
      line.trim() && 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('/*') &&
      !line.trim().startsWith('*')
    ).length;
    
    // Simple duplicate line detection
    const lineMap = new Map<string, number>();
    let duplicatedLines = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        const count = lineMap.get(trimmed) || 0;
        lineMap.set(trimmed, count + 1);
        if (count === 1) duplicatedLines += 2; // First duplicate
        else if (count > 1) duplicatedLines += 1; // Additional duplicates
      }
    }
    
    return {
      linesOfCode,
      duplicatedLines,
      testCoverage: undefined, // Would require test runner integration
      technicalDebt: Math.round(duplicatedLines * 0.5 + (100 - (this.currentAnalysis?.complexity.maintainability || 100)) * 0.3)
    };
  }

  /**
   * Analyze dependencies
   */
  private async analyzeDependencies(fileContext: FileContext): Promise<CodeAnalysis['dependencies']> {
    const content = fileContext.content;
    const used: string[] = [];
    const unused: string[] = [];
    const outdated: string[] = [];
    const vulnerable: string[] = [];
    
    // Extract import statements
    const importMatches = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];
    const requireMatches = content.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g) || [];
    
    for (const match of importMatches) {
      const moduleMatch = match.match(/from\s+['"]([^'"]+)['"]/);
      if (moduleMatch && moduleMatch[1]) {
        used.push(moduleMatch[1]);
      }
    }
    
    for (const match of requireMatches) {
      const moduleMatch = match.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (moduleMatch && moduleMatch[1]) {
        used.push(moduleMatch[1]);
      }
    }
    
    // Check project dependencies against used imports
    const workspaceContext = contextManager.getWorkspaceContext();
    const allDependencies = [
      ...workspaceContext.projectStructure.dependencies.production,
      ...workspaceContext.projectStructure.dependencies.development
    ];
    
    for (const dep of allDependencies) {
      if (!used.some(u => u.startsWith(dep))) {
        unused.push(dep);
      }
    }
    
    return { used: Array.from(new Set(used)), unused, outdated, vulnerable };
  }

  /**
   * Generate intelligent suggestions for a file
   */
  async generateSuggestionsForFile(fileContext: FileContext): Promise<void> {
    const suggestions: CodeSuggestion[] = [];
    
    // Performance optimization suggestions
    if (fileContext.content.includes('console.log')) {
      suggestions.push({
        id: 'remove-console-log',
        type: 'optimize',
        title: 'Remove console.log statements',
        description: 'Remove console.log statements to improve performance in production',
        confidence: 0.9,
        code: fileContext.content.replace(/console\.log\([^)]*\);?\n?/g, ''),
        filePath: fileContext.path,
        impact: 'medium',
        estimatedTime: '2 minutes'
      });
    }
    
    // Code style improvements
    if (fileContext.content.includes('var ')) {
      suggestions.push({
        id: 'modernize-declarations',
        type: 'refactor',
        title: 'Use let/const instead of var',
        description: 'Replace var declarations with let or const for better scoping',
        confidence: 0.95,
        code: fileContext.content.replace(/\bvar\b/g, 'let'),
        filePath: fileContext.path,
        impact: 'low',
        estimatedTime: '1 minute'
      });
    }
    
    // Add error handling
    if (fileContext.content.includes('async ') && !fileContext.content.includes('try {')) {
      suggestions.push({
        id: 'add-error-handling',
        type: 'fix',
        title: 'Add error handling to async functions',
        description: 'Wrap async operations in try-catch blocks',
        confidence: 0.8,
        code: this.wrapAsyncInTryCatch(fileContext.content),
        filePath: fileContext.path,
        impact: 'high',
        estimatedTime: '5 minutes'
      });
    }
    
    // Generate tests
    if (fileContext.language === 'typescript' || fileContext.language === 'javascript') {
      const hasTests = fileContext.path.includes('.test.') || fileContext.path.includes('.spec.');
      if (!hasTests && this.containsFunctions(fileContext.content)) {
        suggestions.push({
          id: 'generate-tests',
          type: 'test',
          title: 'Generate unit tests',
          description: 'Create unit tests for the functions in this file',
          confidence: 0.7,
          code: await this.generateTestCode(fileContext),
          filePath: fileContext.path.replace(/\.(ts|js)$/, '.test.$1'),
          impact: 'high',
          estimatedTime: '15 minutes'
        });
      }
    }
    
    // Documentation suggestions
    if (this.needsDocumentation(fileContext.content)) {
      suggestions.push({
        id: 'add-documentation',
        type: 'documentation',
        title: 'Add JSDoc comments',
        description: 'Add documentation comments to functions and classes',
        confidence: 0.85,
        code: await this.addDocumentation(fileContext.content),
        filePath: fileContext.path,
        impact: 'medium',
        estimatedTime: '10 minutes'
      });
    }
    
    this.activeSuggestions = suggestions;
    this.emit('suggestionsGenerated', suggestions);
  }

  /**
   * Generate intelligent context for current development state
   */
  generateIntelligentContext(intent?: ContextIntent): IntelligentContext {
    const workspaceContext = contextManager.getWorkspaceContext();
    const activeFile = workspaceContext.activeFile;
    
    // Determine current focus based on context
    let currentFocus: IntelligentContext['currentFocus'] = 'coding';
    
    if (workspaceContext.errors.length > 0) {
      currentFocus = 'debugging';
    } else if (activeFile?.path.includes('.test.') || activeFile?.path.includes('.spec.')) {
      currentFocus = 'testing';
    } else if (this.currentAnalysis?.complexity.maintainability && this.currentAnalysis.complexity.maintainability < 50) {
      currentFocus = 'refactoring';
    }
    
    // Generate contextual help based on current state
    const contextualHelp = this.generateContextualHelp(currentFocus, activeFile);
    
    return {
      currentFocus,
      userIntent: intent || {
        type: 'explain',
        target: 'file',
        scope: 'local',
        context: { relatedFiles: [], dependencies: [], references: [] }
      },
      relevantFiles: workspaceContext.openFiles.slice(0, 5),
      codePattern: this.detectCodePattern(activeFile),
      suggestedActions: this.activeSuggestions.slice(0, 3),
      contextualHelp
    };
  }

  /**
   * Get current code analysis
   */
  getCurrentAnalysis(): CodeAnalysis | null {
    return this.currentAnalysis;
  }

  /**
   * Get active suggestions
   */
  getActiveSuggestions(): CodeSuggestion[] {
    return this.activeSuggestions;
  }

  /**
   * Apply a code suggestion
   */
  async applySuggestion(suggestionId: string): Promise<boolean> {
    const suggestion = this.activeSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return false;
    
    try {
      await window.electronAPI.fs.writeFile(suggestion.filePath, suggestion.code);
      
      // Update context
      await contextManager.updateFileContext(
        suggestion.filePath,
        suggestion.code
      );
      
      this.emit('suggestionApplied', suggestion);
      return true;
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      this.emit('suggestionError', { suggestion, error });
      return false;
    }
  }

  // Helper methods
  private async analyzeProjectStructure(): Promise<void> {
    // Analyze overall project structure for architectural suggestions
    const workspaceContext = contextManager.getWorkspaceContext();
    const structure = workspaceContext.projectStructure;
    
    // Generate architectural suggestions based on project structure
    this.emit('projectAnalysisCompleted', structure);
  }

  private wrapAsyncInTryCatch(content: string): string {
    // Simple implementation - would need more sophisticated AST parsing
    return content.replace(
      /(async\s+function[^{]*{)/g,
      '$1\n  try {'
    ).replace(
      /}(\s*$)/g,
      '  } catch (error) {\n    console.error("Error occurred:", error);\n    throw error;\n  }\n}$1'
    );
  }

  private containsFunctions(content: string): boolean {
    return /function\s+\w+|const\s+\w+\s*=\s*\(/g.test(content) ||
           /export\s+function\s+\w+/g.test(content) ||
           /^\s*\w+\s*\([^)]*\)\s*{/gm.test(content);
  }

  private async generateTestCode(fileContext: FileContext): Promise<string> {
    // Simple test generation - could be enhanced with AI
    const functions = this.extractFunctions(fileContext.content);
    let testCode = `// Generated tests for ${fileContext.path}\n\n`;
    
    for (const func of functions) {
      testCode += `describe('${func}', () => {\n`;
      testCode += `  it('should work correctly', () => {\n`;
      testCode += `    // TODO: Implement test for ${func}\n`;
      testCode += `  });\n`;
      testCode += `});\n\n`;
    }
    
    return testCode;
  }

  private extractFunctions(content: string): string[] {
    const functions: string[] = [];
    const patterns = [
      /function\s+(\w+)/g,
      /const\s+(\w+)\s*=\s*\(/g,
      /export\s+function\s+(\w+)/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        functions.push(match[1]);
      }
    }
    
    return Array.from(new Set(functions));
  }

  private needsDocumentation(content: string): boolean {
    const functions = this.extractFunctions(content);
    if (functions.length === 0) return false;
    
    const docComments = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
    return docComments < functions.length * 0.5; // Less than 50% documented
  }

  private async addDocumentation(content: string): Promise<string> {
    // Simple documentation addition - could be enhanced with AI
    return content.replace(
      /(function\s+\w+\([^)]*\))/g,
      '/**\n * TODO: Add function description\n * @param {*} param - Parameter description\n * @returns {*} Return value description\n */\n$1'
    );
  }

  private generateContextualHelp(focus: IntelligentContext['currentFocus'], activeFile?: FileContext): string[] {
    const help: string[] = [];
    
    switch (focus) {
      case 'debugging':
        help.push('Use browser dev tools for debugging');
        help.push('Add console.log statements strategically');
        help.push('Check for type errors and null references');
        break;
      case 'testing':
        help.push('Write descriptive test names');
        help.push('Test edge cases and error conditions');
        help.push('Use mocks for external dependencies');
        break;
      case 'refactoring':
        help.push('Extract complex functions into smaller ones');
        help.push('Remove code duplication');
        help.push('Improve variable and function names');
        break;
      case 'learning':
        help.push('Read official documentation');
        help.push('Look for similar patterns in the codebase');
        help.push('Ask for code explanations');
        break;
      default:
        help.push('Use meaningful variable names');
        help.push('Keep functions small and focused');
        help.push('Add appropriate comments');
    }
    
    if (activeFile) {
      help.push(`Current file: ${activeFile.language} - ${activeFile.path.split('/').pop()}`);
    }
    
    return help;
  }

  private detectCodePattern(activeFile?: FileContext): string {
    if (!activeFile) return 'unknown';
    
    const content = activeFile.content;
    
    // Detect common patterns
    if (content.includes('React.Component') || content.includes('useState')) {
      return 'React Component';
    } else if (content.includes('express') || content.includes('app.get')) {
      return 'Express API';
    } else if (content.includes('describe(') || content.includes('it(')) {
      return 'Unit Tests';
    } else if (content.includes('class ') && content.includes('constructor')) {
      return 'Class Definition';
    } else if (content.includes('export default') || content.includes('module.exports')) {
      return 'Module Export';
    }
    
    return 'General Code';
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.analysisCache.clear();
  }
}

export const smartCodeIntelligence = new SmartCodeIntelligence();
