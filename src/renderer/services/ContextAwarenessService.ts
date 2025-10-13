// Context Awareness Service - Advanced context tracking and analysis
// Provides intelligent context understanding for AI assistant integration

export interface ContextSnapshot {
  timestamp: number;
  activeFile?: string;
  cursorPosition?: { line: number; column: number };
  selectedText?: string;
  workspaceFiles: string[];
  recentlyModifiedFiles: string[];
  projectType?: string;
  activeLanguage?: string;
  errorCount: number;
  warnings: string[];
  codeComplexity?: number;
}

export interface ContextPattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  weight: number;
  category: 'error' | 'performance' | 'security' | 'maintainability' | 'style';
}

export interface ContextInsight {
  id: string;
  type: 'suggestion' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  relatedFiles?: string[];
  codeSnippet?: string;
}

export class ContextAwarenessService {
  private contextHistory: ContextSnapshot[] = [];
  private patterns: ContextPattern[] = [];
  private insights: ContextInsight[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * Capture current context snapshot
   */
  async captureContext(): Promise<ContextSnapshot> {
    const snapshot: ContextSnapshot = {
      timestamp: Date.now(),
      workspaceFiles: await this.getWorkspaceFiles(),
      recentlyModifiedFiles: await this.getRecentlyModifiedFiles(),
      errorCount: 0,
      warnings: []
    };

    this.contextHistory.push(snapshot);
    
    // Keep only last 100 snapshots
    if (this.contextHistory.length > 100) {
      this.contextHistory.shift();
    }

    return snapshot;
  }

  /**
   * Analyze context and generate insights
   */
  analyzeContext(snapshot: ContextSnapshot): ContextInsight[] {
    const insights: ContextInsight[] = [];

    // Analyze patterns
    for (const pattern of this.patterns) {
      const insight = this.evaluatePattern(pattern, snapshot);
      if (insight) {
        insights.push(insight);
      }
    }

    this.insights = insights;
    return insights;
  }

  /**
   * Get current context insights
   */
  getCurrentInsights(): ContextInsight[] {
    return this.insights;
  }

  /**
   * Get context history
   */
  getContextHistory(limit: number = 10): ContextSnapshot[] {
    return this.contextHistory.slice(-limit);
  }

  /**
   * Clear context history
   */
  clearHistory(): void {
    this.contextHistory = [];
    this.insights = [];
  }

  private initializePatterns(): void {
    this.patterns = [
      {
        id: 'high-error-count',
        name: 'High Error Count',
        description: 'Project has many compilation errors',
        pattern: '',
        weight: 0.9,
        category: 'error'
      },
      {
        id: 'large-file',
        name: 'Large File',
        description: 'File is getting too large',
        pattern: '',
        weight: 0.6,
        category: 'maintainability'
      },
      {
        id: 'no-tests',
        name: 'Missing Tests',
        description: 'No test files found in project',
        pattern: '',
        weight: 0.7,
        category: 'maintainability'
      }
    ];
  }

  private evaluatePattern(pattern: ContextPattern, snapshot: ContextSnapshot): ContextInsight | null {
    switch (pattern.id) {
      case 'high-error-count':
        if (snapshot.errorCount > 10) {
          return {
            id: `insight-${Date.now()}`,
            type: 'warning',
            title: 'High Error Count Detected',
            description: `Your project has ${snapshot.errorCount} errors. Consider fixing critical errors first.`,
            confidence: 0.9,
            actionable: true
          };
        }
        break;
      
      case 'large-file':
        if (snapshot.activeFile && this.isFileTooBig(snapshot.activeFile)) {
          return {
            id: `insight-${Date.now()}`,
            type: 'suggestion',
            title: 'Consider Refactoring Large File',
            description: 'This file is getting quite large. Consider breaking it into smaller modules.',
            confidence: 0.7,
            actionable: true,
            relatedFiles: [snapshot.activeFile]
          };
        }
        break;
      
      case 'no-tests':
        if (!this.hasTestFiles(snapshot.workspaceFiles)) {
          return {
            id: `insight-${Date.now()}`,
            type: 'info',
            title: 'No Test Files Found',
            description: 'Consider adding tests to improve code reliability.',
            confidence: 0.8,
            actionable: true
          };
        }
        break;
    }

    return null;
  }

  private async getWorkspaceFiles(): Promise<string[]> {
    // Mock implementation - in real scenario, would scan filesystem
    return [
      'src/index.ts',
      'src/components/App.tsx',
      'src/services/DataService.ts',
      'package.json',
      'README.md'
    ];
  }

  private async getRecentlyModifiedFiles(): Promise<string[]> {
    // Mock implementation - would check file modification times
    return [
      'src/components/App.tsx',
      'src/services/DataService.ts'
    ];
  }

  private isFileTooBig(filePath: string): boolean {
    // Mock implementation - would check actual file size
    return Math.random() > 0.8; // Randomly flag files as too big for demo
  }

  private hasTestFiles(files: string[]): boolean {
    return files.some(file => 
      file.includes('.test.') || 
      file.includes('.spec.') || 
      file.includes('test/') ||
      file.includes('tests/')
    );
  }
}
