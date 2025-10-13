import { AIService } from './AIService';
import { ContextAwarenessSystem } from './ContextAwarenessSystem';
import { AdvancedInlineCompletions } from './AdvancedInlineCompletions';
import { MultiFilePatchSystem } from './MultiFilePatchSystem';
import { RiskScoringValidation } from './RiskScoringValidation';
import { HybridRetrievalRanking } from './HybridRetrievalRanking';
import { AgentContextManager } from './AgentContextManager';
import { SwarmOrchestrator } from './SwarmOrchestrator';
import * as monaco from 'monaco-editor';
import { Task, TaskResult } from './types';

/**
 * Advanced AI System Configuration
 */
export interface AdvancedAISystemConfig {
  enableContextAwareness: boolean;
  enableMultiCandidateCompletions: boolean;
  enableMultiFilePatches: boolean;
  enableRiskScoring: boolean;
  enableHybridRetrieval: boolean;
  enableAdaptiveLearning: boolean;
  performance: {
    maxConcurrentRequests: number;
    cacheTimeout: number;
    enablePerformanceMonitoring: boolean;
  };
  risk: {
    defaultTolerance: 'low' | 'medium' | 'high';
    autoResolveConflicts: boolean;
    requireValidation: boolean;
  };
}

/**
 * AI operation result with comprehensive metadata
 */
export interface AIOperationResult<T = any> {
  success: boolean;
  data: T;
  metadata: {
    operation: string;
    duration: number;
    confidence: number;
    risk: number;
    tokensUsed: number;
    provider: string;
    agentId: string;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Advanced AI System Status
 */
export interface SystemStatus {
  initialized: boolean;
  components: {
    contextSystem: boolean;
    completionEngine: boolean;
    patchSystem: boolean;
    riskValidator: boolean;
    retrievalSystem: boolean;
    learningSystem: boolean;
  };
  performance: {
    averageResponseTime: number;
    totalOperations: number;
    cacheHitRate: number;
    errorRate: number;
  };
  capabilities: string[];
}

/**
 * Advanced AI System - Unified Interface
 * Integrates all advanced AI features into a comprehensive system
 */
export class AdvancedAISystem {
  private aiService: AIService;
  private contextManager: AgentContextManager;
  private swarmOrchestrator: SwarmOrchestrator;

  // Advanced components
  private contextSystem?: ContextAwarenessSystem;
  private completionEngine?: AdvancedInlineCompletions;
  private patchSystem?: MultiFilePatchSystem;
  private riskValidator?: RiskScoringValidation;
  private retrievalSystem?: HybridRetrievalRanking;

  // System state
  private initialized = false;
  private config: AdvancedAISystemConfig;
  private operationHistory: AIOperationResult[] = [];
  private performanceMetrics: Map<string, number[]> = new Map();

  // Default configuration
  private readonly DEFAULT_CONFIG: AdvancedAISystemConfig = {
    enableContextAwareness: true,
    enableMultiCandidateCompletions: true,
    enableMultiFilePatches: true,
    enableRiskScoring: true,
    enableHybridRetrieval: true,
    enableAdaptiveLearning: true,
    performance: {
      maxConcurrentRequests: 5,
      cacheTimeout: 300000,
      enablePerformanceMonitoring: true
    },
    risk: {
      defaultTolerance: 'medium',
      autoResolveConflicts: false,
      requireValidation: true
    }
  };

  constructor(
    aiService: AIService,
    contextManager: AgentContextManager,
    swarmOrchestrator: SwarmOrchestrator,
    config: Partial<AdvancedAISystemConfig> = {}
  ) {
    this.aiService = aiService;
    this.contextManager = contextManager;
    this.swarmOrchestrator = swarmOrchestrator;
    this.config = { ...this.DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the advanced AI system
   */
  async initialize(): Promise<void> {
    try {
      
      // Initialize core components
      if (this.config.enableContextAwareness) {
        this.contextSystem = new ContextAwarenessSystem(this.contextManager, this.aiService);
        
      }

      if (this.config.enableMultiCandidateCompletions) {
        if (!this.contextSystem) {
          throw new Error('Context system required for completions');
        }
        this.completionEngine = new AdvancedInlineCompletions(
          this.aiService,
          this.contextSystem,
          this.contextManager
        );
        
      }

      if (this.config.enableMultiFilePatches) {
        if (!this.contextSystem) {
          throw new Error('Context system required for patches');
        }
        this.patchSystem = new MultiFilePatchSystem(
          this.aiService,
          this.contextSystem,
          this.contextManager
        );
        
      }

      if (this.config.enableRiskScoring) {
        if (!this.contextSystem) {
          throw new Error('Context system required for risk scoring');
        }
        this.riskValidator = new RiskScoringValidation(
          this.aiService,
          this.contextSystem,
          this.contextManager
        );
        
      }

      if (this.config.enableHybridRetrieval) {
        if (!this.contextSystem) {
          throw new Error('Context system required for retrieval');
        }
        this.retrievalSystem = new HybridRetrievalRanking(
          this.aiService,
          this.contextSystem,
          this.contextManager
        );
        
      }

      this.initialized = true;
      
    } catch (error) {
      console.error('Failed to initialize Advanced AI System:', error);
      throw error;
    }
  }

  /**
   * Get system status
   */
  getStatus(): SystemStatus {
    return {
      initialized: this.initialized,
      components: {
        contextSystem: !!this.contextSystem,
        completionEngine: !!this.completionEngine,
        patchSystem: !!this.patchSystem,
        riskValidator: !!this.riskValidator,
        retrievalSystem: !!this.retrievalSystem,
        learningSystem: false // TODO: Implement learning system
      },
      performance: this.calculatePerformanceMetrics(),
      capabilities: this.getSystemCapabilities()
    };
  }

  /**
   * Generate advanced completions with context awareness and risk assessment
   */
  async generateCompletions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    options: {
      maxCandidates?: number;
      includeRisk?: boolean;
      contextRadius?: number;
      agentId?: string;
    } = {}
  ): Promise<AIOperationResult<any>> {
    const startTime = Date.now();

    if (!this.completionEngine) {
      throw new Error('Completion engine not initialized');
    }

    try {
      // Gather context if agent ID provided
      let context = null;
      if (options.agentId) {
        if (!this.contextSystem) {
          throw new Error('Context system required for agent context');
        }
        context = await this.contextSystem.getFileContext(
          model.getLanguageId(),
          position,
          { radius: options.contextRadius || 50 }
        );
      }

      // Generate completions
      const result = await this.completionEngine.generateCompletions(model, position, {
        maxCandidates: options.maxCandidates || 5,
        includeRisk: options.includeRisk !== false,
        contextRadius: options.contextRadius || 50
      });

      // Assess risk if enabled
      let riskScore = null;
      if (options.includeRisk && this.riskValidator) {
        const bestCandidate = this.completionEngine.getBestCandidate(result);
        if (bestCandidate) {
          riskScore = await this.riskValidator.assessRisk({
            id: `completion_${Date.now()}`,
            type: 'completion',
            content: bestCandidate.text,
            context: {
              filePath: model.uri.fsPath,
              language: model.getLanguageId(),
              position: {
                line: position.lineNumber,
                column: position.column
              }
            },
            metadata: {
              generatedBy: 'advanced-completions',
              confidence: bestCandidate.confidence,
              timestamp: Date.now()
            }
          });
        }
      }

      const operationResult: AIOperationResult = {
        success: true,
        data: {
          completions: result.candidates,
          bestCandidate: this.completionEngine.getBestCandidate(result),
          context,
          riskScore
        },
        metadata: {
          operation: 'generate_completions',
          duration: Date.now() - startTime,
          confidence: result.performance.averageConfidence,
          risk: riskScore?.overall || 0,
          tokensUsed: result.candidates.reduce((sum, c) => sum + c.metadata.tokensUsed, 0),
          provider: 'advanced-completions',
          agentId: options.agentId || 'system'
        },
        warnings: [],
        errors: []
      };

      this.recordOperation(operationResult);
      return operationResult;
    } catch (error) {
      const operationResult: AIOperationResult = {
        success: false,
        data: null,
        metadata: {
          operation: 'generate_completions',
          duration: Date.now() - startTime,
          confidence: 0,
          risk: 1,
          tokensUsed: 0,
          provider: 'unknown',
          agentId: options.agentId || 'system'
        },
        warnings: [],
        errors: [(error as Error).message]
      };

      this.recordOperation(operationResult);
      return operationResult;
    }
  }

  /**
   * Create and execute multi-file patches
   */
  async createAndExecutePatch(
    description: string,
    options: {
      targetFiles?: string[];
      agentId?: string;
      riskTolerance?: 'low' | 'medium' | 'high';
      dryRun?: boolean;
      parallel?: boolean;
    } = {}
  ): Promise<AIOperationResult<any>> {
    const startTime = Date.now();

    if (!this.patchSystem) {
      throw new Error('Patch system not initialized');
    }

    try {
      // Create patch
      const patch = await this.patchSystem.createPatchFromDescription(description, {
        targetFiles: options.targetFiles,
        includeDependencies: true,
        riskTolerance: options.riskTolerance || this.config.risk.defaultTolerance
      });

      // Validate if required
      if (this.config.risk.requireValidation && this.riskValidator) {
        const validation = await this.riskValidator.validateSuggestion({
          id: patch.id,
          type: 'modification',
          content: patch.description,
          context: {
            filePath: patch.patches[0]?.filePath,
            language: patch.patches[0]?.metadata?.description ?? 'unknown',
            surroundingCode: patch.patches[0]?.content
          },
          metadata: {
            generatedBy: options.agentId ?? 'patch-system',
            confidence: patch.risk.overall,
            timestamp: Date.now()
          }
        });

        if (!validation.valid) {
          const operationResult: AIOperationResult = {
            success: false,
            data: { patch, validation },
            metadata: {
              operation: 'create_and_execute_patch',
              duration: Date.now() - startTime,
              confidence: 0,
              risk: patch.risk.overall,
              tokensUsed: 0,
              provider: 'patch-system',
              agentId: options.agentId ?? 'system'
            },
            warnings: validation.warnings.map(w => w.message),
            errors: validation.errors.map(e => e.message)
          };

          this.recordOperation(operationResult);
          return operationResult;
        }
      }

      // Execute patch
      const executionResult = await this.patchSystem.executePatch(patch.id, {
        dryRun: options.dryRun || false,
        parallel: options.parallel || false
      });

      const operationResult: AIOperationResult = {
        success: executionResult.success,
        data: {
          patch,
          executionResult,
          preview: options.dryRun ? null : null
        },
        metadata: {
          operation: 'create_and_execute_patch',
          duration: Date.now() - startTime,
          confidence: executionResult.success ? 0.9 : 0.1,
          risk: patch.risk.overall,
          tokensUsed: 0, // Would be calculated from AI calls
          provider: 'patch-system',
          agentId: options.agentId || 'system'
        },
        warnings: executionResult.conflicts.map(c => c.description),
        errors: executionResult.failedPatches.map(f => f.error)
      };

      this.recordOperation(operationResult);
      return operationResult;
    } catch (error) {
      const operationResult: AIOperationResult = {
        success: false,
        data: null,
        metadata: {
          operation: 'create_and_execute_patch',
          duration: Date.now() - startTime,
          confidence: 0,
          risk: 1,
          tokensUsed: 0,
          provider: 'patch-system',
          agentId: options.agentId || 'system'
        },
        warnings: [],
        errors: [(error as Error).message]
      };

      this.recordOperation(operationResult);
      return operationResult;
    }
  }

  /**
   * Perform hybrid search with context awareness
   */
  async hybridSearch(
    query: string,
    options: {
      agentId?: string;
      maxResults?: number;
      includeHighlights?: boolean;
      rerank?: boolean;
    } = {}
  ): Promise<AIOperationResult<any>> {
    const startTime = Date.now();

    if (!this.retrievalSystem) {
      throw new Error('Retrieval system not initialized');
    }

    try {
      let results;
      let context;

      if (options.agentId) {
        // Search with agent context
        const searchResult = await this.retrievalSystem.searchWithContext(
          { query },
          options.agentId,
          {
            maxResults: options.maxResults || 20,
            includeHighlights: options.includeHighlights !== false,
            rerank: options.rerank !== false
          }
        );
        results = searchResult.results;
        context = searchResult.context;
      } else {
        // Simple search
        results = await this.retrievalSystem.search(query, {
          maxResults: options.maxResults || 20,
          includeHighlights: options.includeHighlights !== false,
          rerank: options.rerank !== false
        });
        context = null;
      }

      const operationResult: AIOperationResult = {
        success: true,
        data: {
          results,
          context,
          statistics: this.retrievalSystem.getStatistics()
        },
        metadata: {
          operation: 'hybrid_search',
          duration: Date.now() - startTime,
          confidence: 0.8,
          risk: 0.1,
          tokensUsed: 0, // Would be calculated from AI calls
          provider: 'retrieval-system',
          agentId: options.agentId || 'system'
        },
        warnings: [],
        errors: []
      };

      this.recordOperation(operationResult);
      return operationResult;
    } catch (error) {
      const operationResult: AIOperationResult = {
        success: false,
        data: null,
        metadata: {
          operation: 'hybrid_search',
          duration: Date.now() - startTime,
          confidence: 0,
          risk: 0.5,
          tokensUsed: 0,
          provider: 'retrieval-system',
          agentId: options.agentId || 'system'
        },
        warnings: [],
        errors: [(error as Error).message]
      };

      this.recordOperation(operationResult);
      return operationResult;
    }
  }

  /**
   * Get comprehensive system statistics
   */
  getSystemStatistics(): {
    status: SystemStatus;
    operations: {
      total: number;
      successRate: number;
      averageDuration: number;
      riskDistribution: Record<string, number>;
    };
    components: {
      contextSystem?: any;
      completionEngine?: any;
      patchSystem?: any;
      riskValidator?: any;
      retrievalSystem?: any;
    };
  } {
    const status = this.getStatus();
    const operations = this.calculateOperationStatistics();

    return {
      status,
      operations,
      components: {
        contextSystem: null,
        completionEngine: this.completionEngine?.getStatistics?.(),
        patchSystem: null,
        riskValidator: this.riskValidator?.getRiskStatistics?.(),
        retrievalSystem: this.retrievalSystem?.getStatistics?.()
      }
    };
  }

  /**
   * Clear all caches and reset statistics
   */
  clearCaches(): void {
    this.completionEngine?.clearCache?.();
    this.retrievalSystem?.clearCache?.();
    this.operationHistory = [];
    this.performanceMetrics.clear();
  }

  // Private methods

  private recordOperation(result: AIOperationResult): void {
    this.operationHistory.push(result);

    // Keep only last 1000 operations
    if (this.operationHistory.length > 1000) {
      this.operationHistory = this.operationHistory.slice(-1000);
    }

    // Record performance metrics
    if (!this.performanceMetrics.has(result.metadata.operation)) {
      this.performanceMetrics.set(result.metadata.operation, []);
    }
    const metrics = this.performanceMetrics.get(result.metadata.operation)!;
    metrics.push(result.metadata.duration);

    // Keep only last 100 measurements per operation
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  private calculatePerformanceMetrics() {
    const allDurations = Array.from(this.performanceMetrics.values()).flat();
    const allOperations = this.operationHistory;

    return {
      averageResponseTime: allDurations.length > 0
        ? allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length
        : 0,
      totalOperations: allOperations.length,
      cacheHitRate: 0.85, // Would be calculated from actual cache hits
      errorRate: allOperations.length > 0
        ? allOperations.filter(op => !op.success).length / allOperations.length
        : 0
    };
  }

  private calculateOperationStatistics() {
    const operations = this.operationHistory;

    if (operations.length === 0) {
      return {
        total: 0,
        successRate: 0,
        averageDuration: 0,
        riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
      };
    }

    const successful = operations.filter(op => op.success).length;
    const totalDuration = operations.reduce((sum, op) => sum + op.metadata.duration, 0);
    const riskDistribution = operations.reduce((dist, op) => {
      const riskLevel = op.metadata.risk > 0.7 ? 'high' :
                       op.metadata.risk > 0.4 ? 'medium' :
                       op.metadata.risk > 0.1 ? 'low' : 'critical';
      dist[riskLevel] = (dist[riskLevel] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      total: operations.length,
      successRate: successful / operations.length,
      averageDuration: totalDuration / operations.length,
      riskDistribution
    };
  }

  private getSystemCapabilities(): string[] {
    const capabilities: string[] = [];

    if (this.contextSystem) {
      capabilities.push('context-awareness', 'intelligent-context-gathering');
    }
    if (this.completionEngine) {
      capabilities.push('multi-candidate-completions', 'risk-aware-completions');
    }
    if (this.patchSystem) {
      capabilities.push('multi-file-patches', 'dependency-analysis', 'conflict-resolution');
    }
    if (this.riskValidator) {
      capabilities.push('comprehensive-risk-scoring', 'validation-rules');
    }
    if (this.retrievalSystem) {
      capabilities.push('hybrid-retrieval', 'semantic-search', 'lexical-search');
    }

    return capabilities;
  }
}

