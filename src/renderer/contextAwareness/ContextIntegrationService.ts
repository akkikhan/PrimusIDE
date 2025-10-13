import { contextManager, ContextIntent, FileContext } from './ContextManager';
import { smartCodeIntelligence, CodeSuggestion, IntelligentContext } from './SmartCodeIntelligence';
import { EventEmitter } from 'events';

/**
 * Context Integration Service - Central coordinator for all context-aware features
 * Orchestrates context managers, code intelligence, and AI assistance
 * Provides unified interface for context-driven development assistance
 */

export interface DevelopmentState {
  phase: 'planning' | 'coding' | 'debugging' | 'testing' | 'refactoring' | 'learning';
  confidence: number;
  activity: string;
  timeInPhase: number;
  suggestions: string[];
}

export interface ProjectInsights {
  architecture: {
    pattern: 'MVC' | 'Component' | 'Microservice' | 'Monolithic' | 'Layered' | 'Unknown';
    complexity: 'Low' | 'Medium' | 'High' | 'Very High';
    maintainability: number;
  };
  codeHealth: {
    overall: number;
    testCoverage?: number;
    duplicateCode: number;
    technicalDebt: number;
  };
  productivity: {
    filesPerHour: number;
    linesPerHour: number;
    issuesResolved: number;
    suggestionsApplied: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export interface ContextualAssistance {
  intent: ContextIntent;
  suggestions: CodeSuggestion[];
  explanation: string;
  nextSteps: string[];
  resources: {
    documentation: string[];
    examples: string[];
    tutorials: string[];
  };
}

export class ContextIntegrationService extends EventEmitter {
  private developmentState: DevelopmentState;
  private projectInsights: ProjectInsights | null = null;
  private sessionStartTime: number;
  private lastActivityTime: number;
  private activityHistory: Array<{ timestamp: number; activity: string; file?: string }> = [];
  private isMonitoring: boolean = false;

  constructor() {
    super();
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
    this.developmentState = {
      phase: 'planning',
      confidence: 0.5,
      activity: 'Starting session',
      timeInPhase: 0,
      suggestions: []
    };
    
    this.initializeServices();
    this.startContextMonitoring();
  }

  /**
   * Initialize all context services and set up event listeners
   */
  private initializeServices(): void {
    // Context Manager listeners
    contextManager.on('fileContextUpdated', this.handleFileContextUpdate.bind(this));
    contextManager.on('projectStructureUpdated', this.handleProjectUpdate.bind(this));
    contextManager.on('contextInitialized', this.handleContextInitialized.bind(this));

    // Smart Code Intelligence listeners
    smartCodeIntelligence.on('analysisCompleted', this.handleAnalysisCompleted.bind(this));
    smartCodeIntelligence.on('suggestionsGenerated', this.handleSuggestionsGenerated.bind(this));
    smartCodeIntelligence.on('suggestionApplied', this.handleSuggestionApplied.bind(this));
  }

  /**
   * Start monitoring development context and patterns
   */
  private startContextMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Update development state every 30 seconds
    setInterval(() => {
      this.updateDevelopmentState();
    }, 30000);

    // Track productivity metrics every 5 minutes
    setInterval(() => {
      this.updateProductivityMetrics();
    }, 300000);

  }

  /**
   * Get comprehensive contextual assistance for current state
   */
  async getContextualAssistance(intent?: ContextIntent): Promise<ContextualAssistance> {
    const workspaceContext = contextManager.getWorkspaceContext();
    const intelligentContext = smartCodeIntelligence.generateIntelligentContext(intent);
    
    // Determine user intent if not provided
    const actualIntent = intent || this.inferUserIntent(workspaceContext, intelligentContext);
    
    // Get relevant suggestions
    const suggestions = smartCodeIntelligence.getActiveSuggestions()
      .filter(s => this.isSuggestionRelevant(s, actualIntent))
      .slice(0, 5);

    // Generate contextual explanation
    const explanation = await this.generateContextualExplanation(actualIntent, workspaceContext);
    
    // Determine next steps
    const nextSteps = this.generateNextSteps(actualIntent, intelligentContext);
    
    // Find relevant resources
    const resources = await this.findRelevantResources(actualIntent, workspaceContext);

    return {
      intent: actualIntent,
      suggestions,
      explanation,
      nextSteps,
      resources
    };
  }

  /**
   * Get current development state
   */
  getDevelopmentState(): DevelopmentState {
    return { ...this.developmentState };
  }

  /**
   * Get project insights
   */
  getProjectInsights(): ProjectInsights | null {
    return this.projectInsights ? { ...this.projectInsights } : null;
  }

  /**
   * Get smart recommendations based on current context
   */
  getSmartRecommendations(): string[] {
    const recommendations: string[] = [];
    const state = this.developmentState;
    const workspaceContext = contextManager.getWorkspaceContext();

    // Phase-specific recommendations
    switch (state.phase) {
      case 'planning':
        recommendations.push('Create a basic project structure');
        recommendations.push('Set up configuration files (package.json, tsconfig.json)');
        recommendations.push('Define interfaces and types first');
        break;
      case 'coding':
        recommendations.push('Write unit tests for new functions');
        recommendations.push('Use meaningful variable and function names');
        recommendations.push('Keep functions small and focused');
        break;
      case 'debugging':
        recommendations.push('Use console.log strategically');
        recommendations.push('Check browser developer tools');
        recommendations.push('Verify type definitions and imports');
        break;
      case 'testing':
        recommendations.push('Test edge cases and error conditions');
        recommendations.push('Mock external dependencies');
        recommendations.push('Write descriptive test names');
        break;
      case 'refactoring':
        recommendations.push('Extract repeated code into functions');
        recommendations.push('Improve variable and function names');
        recommendations.push('Remove unused code and imports');
        break;
    }

    // Context-specific recommendations
    if (workspaceContext.errors.length > 0) {
      recommendations.unshift('Fix current compilation errors first');
    }

    if (workspaceContext.openFiles.length > 10) {
      recommendations.push('Consider closing unused tabs');
    }

    return recommendations.slice(0, 5);
  }

  /**
   * Track user activity for pattern recognition
   */
  trackActivity(activity: string, file?: string): void {
    this.lastActivityTime = Date.now();
    this.activityHistory.push({
      timestamp: this.lastActivityTime,
      activity,
      file
    });

    // Keep only last 100 activities
    if (this.activityHistory.length > 100) {
      this.activityHistory = this.activityHistory.slice(-100);
    }

    // Update development state based on activity
    this.analyzeActivityPattern();
  }

  /**
   * Generate code snippet based on context and intent
   */
  async generateContextualCode(intent: ContextIntent, prompt: string): Promise<string> {
    const workspaceContext = contextManager.getWorkspaceContext();
    const activeFile = workspaceContext.activeFile;
    
    if (!activeFile) {
      return '// No active file for context';
    }

    // Generate context-aware code based on file type and intent
    switch (activeFile.language) {
      case 'typescript':
      case 'typescriptreact':
        return await this.generateTypeScriptCode(intent, prompt, activeFile);
      case 'javascript':
      case 'javascriptreact':
        return await this.generateJavaScriptCode(intent, prompt, activeFile);
      default:
        return `// Generated code for ${prompt}`;
    }
  }

  // Event handlers
  private handleFileContextUpdate(fileContext: FileContext): void {
    this.trackActivity(`File modified: ${fileContext.path.split('/').pop()}`, fileContext.path);
    this.emit('fileContextUpdated', fileContext);
  }

  private handleProjectUpdate(structure: any): void {
    this.analyzeProjectStructure(structure);
    this.emit('projectUpdated', structure);
  }

  private handleContextInitialized(context: any): void {
    this.analyzeProjectStructure(context.projectStructure);
    this.emit('contextInitialized', context);
  }

  private handleAnalysisCompleted(analysis: any): void {
    this.updateProjectInsights(analysis);
    this.emit('analysisCompleted', analysis);
  }

  private handleSuggestionsGenerated(suggestions: CodeSuggestion[]): void {
    const relevantSuggestions = suggestions.filter(s => s.confidence > 0.7);
    this.developmentState.suggestions = relevantSuggestions.map(s => s.title);
    this.emit('suggestionsGenerated', suggestions);
  }

  private handleSuggestionApplied(suggestion: CodeSuggestion): void {
    this.trackActivity(`Applied suggestion: ${suggestion.title}`, suggestion.filePath);
    this.emit('suggestionApplied', suggestion);
  }

  // Helper methods
  private updateDevelopmentState(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    
    // Update time in current phase
    this.developmentState.timeInPhase = now - this.sessionStartTime;
    
    // If no activity for 5 minutes, switch to planning/learning
    if (timeSinceLastActivity > 300000) {
      this.developmentState.phase = 'learning';
      this.developmentState.activity = 'Idle - consider next steps';
      this.developmentState.confidence = 0.3;
    }

    this.emit('developmentStateUpdated', this.developmentState);
  }

  private updateProductivityMetrics(): void {
    const timeSpent = Date.now() - this.sessionStartTime;
    const hoursSpent = timeSpent / (1000 * 60 * 60);
    
    // Count file modifications in the last hour
    const recentActivities = this.activityHistory.filter(
      a => Date.now() - a.timestamp < 3600000
    );
    
    if (this.projectInsights) {
      this.projectInsights.productivity = {
        ...this.projectInsights.productivity,
        filesPerHour: recentActivities.length / hoursSpent,
        linesPerHour: 0, // Would need to track actual line changes
        issuesResolved: 0, // Would need error tracking
        suggestionsApplied: recentActivities.filter(a => 
          a.activity.includes('Applied suggestion')
        ).length
      };
    }
  }

  private analyzeActivityPattern(): void {
    if (this.activityHistory.length < 5) return;

    const recent = this.activityHistory.slice(-10);
    const activities = recent.map(a => a.activity);
    
    // Detect development phase based on activity patterns
    if (activities.some(a => a.includes('error') || a.includes('debug'))) {
      this.developmentState.phase = 'debugging';
      this.developmentState.confidence = 0.8;
    } else if (activities.some(a => a.includes('test'))) {
      this.developmentState.phase = 'testing';
      this.developmentState.confidence = 0.9;
    } else if (activities.some(a => a.includes('refactor') || a.includes('rename'))) {
      this.developmentState.phase = 'refactoring';
      this.developmentState.confidence = 0.85;
    } else if (activities.filter(a => a.includes('File modified')).length > 3) {
      this.developmentState.phase = 'coding';
      this.developmentState.confidence = 0.9;
    }

    this.developmentState.activity = activities[activities.length - 1];
  }

  private inferUserIntent(workspaceContext: any, intelligentContext: IntelligentContext): ContextIntent {
    // Infer intent based on context and recent activity
    if (workspaceContext.errors.length > 0) {
      return {
        type: 'fix_error',
        target: 'file',
        scope: 'local',
        context: { relatedFiles: [], dependencies: [], references: [] }
      };
    }

    if (intelligentContext.currentFocus === 'testing') {
      return {
        type: 'test',
        target: 'function',
        scope: 'file',
        context: { relatedFiles: [], dependencies: [], references: [] }
      };
    }

    return {
      type: 'explain',
      target: 'selection',
      scope: 'local',
      context: { relatedFiles: [], dependencies: [], references: [] }
    };
  }

  private isSuggestionRelevant(suggestion: CodeSuggestion, intent: ContextIntent): boolean {
    return suggestion.type === intent.type || suggestion.confidence > 0.8;
  }

  private async generateContextualExplanation(intent: ContextIntent, workspaceContext: any): Promise<string> {
    let explanation = `Based on your current ${intent.type} intent, `;
    
    switch (intent.type) {
      case 'fix_error':
        explanation += 'I can help you identify and fix errors in your code.';
        break;
      case 'implement_feature':
        explanation += 'I can assist in implementing new features following best practices.';
        break;
      case 'refactor':
        explanation += 'I can suggest improvements to make your code more maintainable.';
        break;
      case 'explain':
        explanation += 'I can explain how your code works and suggest improvements.';
        break;
      case 'optimize':
        explanation += 'I can help optimize your code for better performance.';
        break;
      case 'test':
        explanation += 'I can help you write comprehensive tests for your code.';
        break;
    }

    if (workspaceContext.activeFile) {
      explanation += ` Working with ${workspaceContext.activeFile.language} in ${workspaceContext.activeFile.path.split('/').pop()}.`;
    }

    return explanation;
  }

  private generateNextSteps(intent: ContextIntent, intelligentContext: IntelligentContext): string[] {
    const steps: string[] = [];
    
    switch (intent.type) {
      case 'fix_error':
        steps.push('Review error messages carefully');
        steps.push('Check variable names and imports');
        steps.push('Verify function signatures');
        break;
      case 'implement_feature':
        steps.push('Plan the feature structure');
        steps.push('Create necessary interfaces/types');
        steps.push('Implement core functionality');
        steps.push('Add error handling');
        steps.push('Write tests');
        break;
      case 'refactor':
        steps.push('Identify code smells');
        steps.push('Extract repeated patterns');
        steps.push('Improve naming');
        steps.push('Update tests');
        break;
    }

    return steps;
  }

  private async findRelevantResources(intent: ContextIntent, workspaceContext: any): Promise<ContextualAssistance['resources']> {
    const resources = {
      documentation: [] as string[],
      examples: [] as string[],
      tutorials: [] as string[]
    };

    // Add framework-specific resources
    const frameworks = workspaceContext.projectStructure?.frameworks || [];
    for (const framework of frameworks) {
      switch (framework) {
        case 'React':
          resources.documentation.push('React Official Documentation');
          resources.examples.push('React Patterns and Examples');
          break;
        case 'TypeScript':
          resources.documentation.push('TypeScript Handbook');
          resources.examples.push('TypeScript Examples');
          break;
      }
    }

    return resources;
  }

  private analyzeProjectStructure(structure: any): void {
    if (!structure) return;

    const complexity = this.calculateProjectComplexity(structure);
    const pattern = this.detectArchitecturalPattern(structure);

    this.projectInsights = {
      architecture: {
        pattern,
        complexity,
        maintainability: 75 // Would be calculated based on code analysis
      },
      codeHealth: {
        overall: 80,
        duplicateCode: 5,
        technicalDebt: 15
      },
      productivity: {
        filesPerHour: 0,
        linesPerHour: 0,
        issuesResolved: 0,
        suggestionsApplied: 0
      },
      recommendations: {
        immediate: this.getSmartRecommendations(),
        shortTerm: ['Improve test coverage', 'Reduce code duplication'],
        longTerm: ['Consider architectural improvements', 'Implement CI/CD pipeline']
      }
    };
  }

  private calculateProjectComplexity(structure: any): ProjectInsights['architecture']['complexity'] {
    const fileCount = structure.files?.length || 0;
    const dirCount = structure.directories?.length || 0;
    const depCount = (structure.dependencies?.production?.length || 0) + 
                    (structure.dependencies?.development?.length || 0);
    
    const totalComplexity = fileCount + dirCount + depCount;
    
    if (totalComplexity < 50) return 'Low';
    if (totalComplexity < 150) return 'Medium';
    if (totalComplexity < 300) return 'High';
    return 'Very High';
  }

  private detectArchitecturalPattern(structure: any): ProjectInsights['architecture']['pattern'] {
    const files = structure.files || [];
    const hasComponents = files.some((f: string) => f.includes('component'));
    const hasControllers = files.some((f: string) => f.includes('controller'));
    const hasModels = files.some((f: string) => f.includes('model'));
    const hasServices = files.some((f: string) => f.includes('service'));

    if (hasComponents) return 'Component';
    if (hasControllers && hasModels) return 'MVC';
    if (hasServices) return 'Layered';
    return 'Unknown';
  }

  private async generateTypeScriptCode(intent: ContextIntent, prompt: string, activeFile: FileContext): Promise<string> {
    // Simple TypeScript code generation based on intent
    switch (intent.type) {
      case 'implement_feature':
        return `// ${prompt}\nexport const ${prompt.replace(/\s+/g, '')} = (): void => {\n  // Implementation here\n};`;
      case 'test':
        return `// Test for ${prompt}\ndescribe('${prompt}', () => {\n  it('should work correctly', () => {\n    // Test implementation\n  });\n});`;
      default:
        return `// ${prompt}\n// TODO: Implement ${prompt}`;
    }
  }

  private async generateJavaScriptCode(intent: ContextIntent, prompt: string, activeFile: FileContext): Promise<string> {
    // Simple JavaScript code generation
    switch (intent.type) {
      case 'implement_feature':
        return `// ${prompt}\nconst ${prompt.replace(/\s+/g, '')} = () => {\n  // Implementation here\n};`;
      case 'test':
        return `// Test for ${prompt}\ndescribe('${prompt}', () => {\n  it('should work correctly', () => {\n    // Test implementation\n  });\n});`;
      default:
        return `// ${prompt}\n// TODO: Implement ${prompt}`;
    }
  }

  private updateProjectInsights(analysis: any): void {
    if (this.projectInsights) {
      this.projectInsights.codeHealth = {
        overall: Math.round((analysis.complexity?.maintainability || 75)),
        duplicateCode: analysis.metrics?.duplicatedLines || 0,
        technicalDebt: analysis.metrics?.technicalDebt || 0,
        testCoverage: analysis.metrics?.testCoverage
      };
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.isMonitoring = false;
    this.removeAllListeners();
  }
}

export const contextIntegrationService = new ContextIntegrationService();
