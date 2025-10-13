import * as monaco from 'monaco-editor';
import { AIService } from './AIService';
import { ContextAwarenessSystem, ContextQuery, ContextSource } from './ContextAwarenessSystem';
import { AgentContextManager } from './AgentContextManager';
import { Task, TaskResult } from './types';

/**
 * Completion candidate with ranking and risk information
 */
export interface CompletionCandidate {
  id: string;
  text: string;
  confidence: number;
  risk: CompletionRisk;
  contextRelevance: number;
  performance: CompletionPerformance;
  metadata: {
    source: string;
    generatedAt: number;
    tokensUsed: number;
    provider: string;
  };
}

/**
 * Risk assessment for completion candidates
 */
export interface CompletionRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-1
  factors: RiskFactor[];
  mitigation: string[];
}

/**
 * Individual risk factors
 */
export interface RiskFactor {
  type: 'syntax' | 'logic' | 'security' | 'performance' | 'maintainability';
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence: number;
}

/**
 * Performance metrics for completion
 */
export interface CompletionPerformance {
  generationTime: number;
  estimatedExecutionTime: number;
  memoryUsage: number;
  complexity: number;
}

/**
 * Multi-candidate completion result
 */
export interface MultiCandidateResult {
  candidates: CompletionCandidate[];
  query: string;
  context: any;
  performance: {
    totalTime: number;
    candidatesGenerated: number;
    averageConfidence: number;
    bestRiskScore: number;
  };
}

/**
 * Advanced Inline Completions Engine
 * Generates multiple completion candidates with intelligent ranking and risk assessment
 */
export class AdvancedInlineCompletions {
  private aiService: AIService;
  private contextSystem: ContextAwarenessSystem;
  private contextManager: AgentContextManager;
  private cache: Map<string, MultiCandidateResult> = new Map();
  private riskAssessor: CompletionRiskAssessor;
  private performanceTracker: CompletionPerformanceTracker;

  // Configuration
  private readonly MAX_CANDIDATES = 5;
  private readonly MIN_CONFIDENCE = 0.3;
  private readonly MAX_RISK_SCORE = 0.7;
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor(
    aiService: AIService,
    contextSystem: ContextAwarenessSystem,
    contextManager: AgentContextManager
  ) {
    this.aiService = aiService;
    this.contextSystem = contextSystem;
    this.contextManager = contextManager;
    this.riskAssessor = new CompletionRiskAssessor();
    this.performanceTracker = new CompletionPerformanceTracker();
  }

  /**
   * Generate multiple completion candidates for a given position
   */
  async generateCompletions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    options: {
      maxCandidates?: number;
      includeRisk?: boolean;
      includePerformance?: boolean;
      contextRadius?: number;
      temperature?: number;
    } = {}
  ): Promise<MultiCandidateResult> {
    const startTime = Date.now();
    const maxCandidates = options.maxCandidates || this.MAX_CANDIDATES;
    const contextRadius = options.contextRadius || 50;

    try {
      // Get intelligent context
      const context = await this.gatherContext(model, position, contextRadius);

      // Generate multiple candidates in parallel
      const candidates = await this.generateMultipleCandidates(
        model,
        position,
        context,
        maxCandidates,
        options.temperature || 0.7
      );

      // Assess risk for each candidate
      const riskAssessedCandidates = options.includeRisk
        ? await this.assessRisks(candidates, context)
        : candidates;

      // Track performance
      const performance = this.performanceTracker.trackGeneration(
        candidates.length,
        Date.now() - startTime
      );

      // Calculate overall metrics
      const averageConfidence = candidates.reduce((sum, c) => sum + c.confidence, 0) / candidates.length;
      const bestRiskScore = Math.min(...candidates.map(c => c.risk.score));

      const result: MultiCandidateResult = {
        candidates: riskAssessedCandidates,
        query: this.generateQueryFromPosition(model, position),
        context,
        performance: {
          totalTime: Date.now() - startTime,
          candidatesGenerated: candidates.length,
          averageConfidence,
          bestRiskScore
        }
      };

      // Cache the result
      this.cacheResult(result);

      return result;
    } catch (error) {
      console.error('Failed to generate completions:', error);
      return this.createEmptyResult();
    }
  }

  /**
   * Get the best completion candidate based on ranking
   */
  getBestCandidate(result: MultiCandidateResult): CompletionCandidate | null {
    if (result.candidates.length === 0) return null;

    return result.candidates.reduce((best, current) => {
      const bestScore = this.calculateCandidateScore(best);
      const currentScore = this.calculateCandidateScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Filter candidates by risk tolerance
   */
  filterByRiskTolerance(
    candidates: CompletionCandidate[],
    maxRiskLevel: 'low' | 'medium' | 'high' = 'medium'
  ): CompletionCandidate[] {
    const riskLevels = { low: 0, medium: 1, high: 2, critical: 3 };
    const maxLevel = riskLevels[maxRiskLevel];

    return candidates.filter(candidate => {
      const candidateLevel = riskLevels[candidate.risk.level];
      return candidateLevel <= maxLevel && candidate.risk.score <= this.MAX_RISK_SCORE;
    });
  }

  /**
   * Get completion statistics
   */
  getStatistics(): {
    cacheSize: number;
    averageGenerationTime: number;
    totalCompletions: number;
    riskDistribution: Record<string, number>;
  } {
    return {
      cacheSize: this.cache.size,
      averageGenerationTime: this.performanceTracker.getAverageGenerationTime(),
      totalCompletions: this.performanceTracker.getTotalCompletions(),
      riskDistribution: this.riskAssessor.getRiskDistribution()
    };
  }

  /**
   * Clear cache and reset statistics
   */
  clearCache(): void {
    this.cache.clear();
    this.performanceTracker.reset();
    this.riskAssessor.reset();
  }

  // Private methods

  private async gatherContext(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    radius: number
  ): Promise<any> {
    const contextQuery: ContextQuery = {
      query: `completion_context:${model.getLanguageId()}:${position.lineNumber}:${position.column}`,
      sources: [
        ContextSource.CODE_PATTERNS,
        ContextSource.SEMANTIC_CONTEXT,
        ContextSource.HISTORICAL_CONTEXT
      ],
      maxResults: 10,
      minQuality: 0.6,
      includeRelationships: true
    };

    const result = await this.contextSystem.queryContext(contextQuery);
    return {
      local: result.entries,
      relationships: result.relationships,
      quality: result.quality
    };
  }

  private async generateMultipleCandidates(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: any,
    maxCandidates: number,
    temperature: number
  ): Promise<CompletionCandidate[]> {
    const candidates: CompletionCandidate[] = [];
    const basePrompt = this.buildCompletionPrompt(model, position, context);

    // Generate candidates with different temperatures and approaches
    const generationTasks = Array.from({ length: maxCandidates }, async (_, index) => {
      const variation = this.createPromptVariation(basePrompt, index, temperature);
      return this.generateSingleCandidate(variation, index, context);
    });

    const results = await Promise.allSettled(generationTasks);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        candidates.push(result.value);
      }
    }

    return candidates;
  }

  private async generateSingleCandidate(
    prompt: string,
    index: number,
    context: any
  ): Promise<CompletionCandidate | null> {
    try {
      const task: Task = {
        id: `completion_${Date.now()}_${index}`,
        description: `Generate completion candidate ${index + 1}`,
        requirements: ['code-completion', 'context-aware'],
        priority: 'medium'
      };

      const startTime = Date.now();
      const response = await this.aiService.executeTask(task, {
        context: {
          agentId: 'completion-engine',
          specialty: 'code-completion',
          capabilities: ['multi-candidate', 'context-aware'],
          memory: { prompt, context }
        },
        useCache: true
      });

      if (!response.success || !response.output) {
        return null;
      }

      const generationTime = Date.now() - startTime;
      const tokensUsed = this.estimateTokens(prompt + response.output);

      return {
        id: `candidate_${Date.now()}_${index}`,
        text: response.output,
        confidence: response.confidence,
        risk: { level: 'low', score: 0, factors: [], mitigation: [] }, // Will be assessed later
        contextRelevance: this.calculateContextRelevance(response.output, context),
        performance: {
          generationTime,
          estimatedExecutionTime: this.estimateExecutionTime(response.output),
          memoryUsage: this.estimateMemoryUsage(response.output),
          complexity: this.calculateComplexity(response.output)
        },
        metadata: {
          source: 'ai-generation',
          generatedAt: Date.now(),
          tokensUsed,
          provider: 'multi-candidate-engine'
        }
      };
    } catch (error) {
      console.warn(`Failed to generate candidate ${index}:`, error);
      return null;
    }
  }

  private async assessRisks(
    candidates: CompletionCandidate[],
    context: any
  ): Promise<CompletionCandidate[]> {
    const assessedCandidates = await Promise.all(
      candidates.map(candidate => this.riskAssessor.assessRisk(candidate, context))
    );

    return assessedCandidates.filter(candidate => candidate.risk.score <= this.MAX_RISK_SCORE);
  }

  private calculateCandidateScore(candidate: CompletionCandidate): number {
    // Weighted scoring algorithm
    const weights = {
      confidence: 0.3,
      contextRelevance: 0.25,
      risk: -0.2, // Lower risk is better
      performance: 0.15,
      quality: 0.1
    };

    const riskScore = candidate.risk.score;
    const performanceScore = candidate.performance.generationTime / 1000; // Normalize to seconds

    return (
      candidate.confidence * weights.confidence +
      candidate.contextRelevance * weights.contextRelevance +
      (1 - riskScore) * Math.abs(weights.risk) + // Invert risk (lower is better)
      (1 - performanceScore) * weights.performance +
      candidate.performance.complexity * weights.quality
    );
  }

  private buildCompletionPrompt(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: any
  ): string {
    const language = model.getLanguageId();
    const contextText = this.getContextText(model, position);
    const currentLine = model.getLineContent(position.lineNumber);
    const cursorPrefix = currentLine.substring(0, position.column);

    return `You are an advanced code completion engine. Generate a high-quality code completion for the following context.

Language: ${language}
Context (last 20 lines):
\`\`\`${language}
${contextText}
\`\`\`

Current line (cursor at position ${position.column}):
\`\`\`${language}
${currentLine}
${' '.repeat(position.column)}^
\`\`\`

Additional context information:
- Project type: ${context.quality?.overall || 'unknown'}
- Related patterns: ${context.local?.length || 0} found
- Context quality: ${JSON.stringify(context.quality || {})}

Requirements:
1. Generate syntactically correct ${language} code
2. Follow ${language} best practices and conventions
3. Be contextually relevant to the surrounding code
4. Provide a useful and meaningful completion
5. Keep it concise but complete

Generate completion:`;
  }

  private createPromptVariation(
    basePrompt: string,
    index: number,
    temperature: number
  ): string {
    const variations = [
      'Focus on idiomatic code patterns',
      'Emphasize performance and efficiency',
      'Prioritize readability and maintainability',
      'Consider edge cases and error handling',
      'Follow security best practices'
    ];

    const variation = variations[index % variations.length];
    return `${basePrompt}\n\nApproach: ${variation}. Temperature: ${temperature + (index * 0.1)}`;
  }

  private getContextText(model: monaco.editor.ITextModel, position: monaco.Position): string {
    const lineCount = model.getLineCount();
    const startLine = Math.max(1, position.lineNumber - 20);
    const endLine = position.lineNumber;

    const lines = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(model.getLineContent(i));
    }

    return lines.join('\n');
  }

  private generateQueryFromPosition(model: monaco.editor.ITextModel, position: monaco.Position): string {
    const language = model.getLanguageId();
    const currentLine = model.getLineContent(position.lineNumber);
    const cursorPrefix = currentLine.substring(0, position.column);

    return `completion:${language}:${cursorPrefix}`;
  }

  private calculateContextRelevance(completion: string, context: any): number {
    // Simple relevance calculation based on context overlap
    const completionWords = completion.toLowerCase().split(/\W+/);
    const contextWords = JSON.stringify(context).toLowerCase().split(/\W+/);

    const commonWords = completionWords.filter(word =>
      contextWords.some(ctxWord => ctxWord.includes(word) || word.includes(ctxWord))
    );

    return completionWords.length > 0 ? commonWords.length / completionWords.length : 0;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private estimateExecutionTime(completion: string): number {
    // Rough estimation based on completion length and complexity
    const baseTime = 10; // milliseconds
    const lengthFactor = completion.length / 100;
    const complexityFactor = this.calculateComplexity(completion);

    return baseTime * lengthFactor * complexityFactor;
  }

  private estimateMemoryUsage(completion: string): number {
    // Rough estimation in bytes
    return completion.length * 2 + 1024; // Base overhead + content
  }

  private calculateComplexity(completion: string): number {
    // Simple complexity calculation
    const lines = completion.split('\n').length;
    const branches = (completion.match(/\b(if|else|for|while|switch|case)\b/g) || []).length;
    const functions = (completion.match(/\bfunction\b|\b=>\b|\bclass\b/g) || []).length;

    return Math.min(1, (lines * 0.1 + branches * 0.2 + functions * 0.3));
  }

  private cacheResult(result: MultiCandidateResult): void {
    const cacheKey = `completions_${result.query}_${Date.now()}`;

    if (this.cache.size >= 100) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, result);

    // Clean up old entries
    setTimeout(() => {
      this.cache.delete(cacheKey);
    }, this.CACHE_TTL);
  }

  private createEmptyResult(): MultiCandidateResult {
    return {
      candidates: [],
      query: '',
      context: null,
      performance: {
        totalTime: 0,
        candidatesGenerated: 0,
        averageConfidence: 0,
        bestRiskScore: 1
      }
    };
  }
}

/**
 * Completion Risk Assessor
 * Analyzes completion candidates for potential risks
 */
class CompletionRiskAssessor {
  private riskStats: Map<string, number> = new Map();

  async assessRisk(
    candidate: CompletionCandidate,
    context: any
  ): Promise<CompletionCandidate> {
    const riskFactors: RiskFactor[] = [];

    // Syntax risk
    const syntaxRisk = this.assessSyntaxRisk(candidate.text);
    if (syntaxRisk) riskFactors.push(syntaxRisk);

    // Logic risk
    const logicRisk = this.assessLogicRisk(candidate.text, context);
    if (logicRisk) riskFactors.push(logicRisk);

    // Security risk
    const securityRisk = this.assessSecurityRisk(candidate.text);
    if (securityRisk) riskFactors.push(securityRisk);

    // Performance risk
    const performanceRisk = this.assessPerformanceRisk(candidate.text);
    if (performanceRisk) riskFactors.push(performanceRisk);

    // Maintainability risk
    const maintainabilityRisk = this.assessMaintainabilityRisk(candidate.text);
    if (maintainabilityRisk) riskFactors.push(maintainabilityRisk);

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(riskFactors);
    const riskLevel = this.determineRiskLevel(riskScore);

    candidate.risk = {
      level: riskLevel,
      score: riskScore,
      factors: riskFactors,
      mitigation: this.generateMitigationStrategies(riskFactors)
    };

    // Update statistics
    this.updateRiskStats(riskLevel);

    return candidate;
  }

  private assessSyntaxRisk(text: string): RiskFactor | null {
    // Simple syntax risk assessment
    const suspiciousPatterns = [
      /eval\s*\(/,
      /innerHTML\s*=/,
      /document\.write\s*\(/,
      /setTimeout\s*\(\s*[^,]+,\s*['"]\s*[^'"]*['"]\s*\)/,
      /setInterval\s*\(\s*[^,]+,\s*['"]\s*[^'"]*['"]\s*\)/
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'syntax',
          severity: 'high',
          description: `Potentially unsafe pattern detected: ${pattern}`,
          confidence: 0.8
        };
      }
    }

    return null;
  }

  private assessLogicRisk(text: string, context: any): RiskFactor | null {
    // Check for potential logic issues
    const issues = [];

    if (text.includes('TODO') || text.includes('FIXME')) {
      issues.push('Contains TODO/FIXME comments');
    }

    if (text.match(/console\.log|debugger/)) {
      issues.push('Contains debug code');
    }

    if (issues.length > 0) {
      return {
        type: 'logic',
        severity: 'medium',
        description: `Logic concerns: ${issues.join(', ')}`,
        confidence: 0.6
      };
    }

    return null;
  }

  private assessSecurityRisk(text: string): RiskFactor | null {
    const securityPatterns = [
      /password|secret|key|token/i,
      /sql|query|execute/i,
      /script|javascript|html/i,
      /http:|https:|ftp:/i
    ];

    for (const pattern of securityPatterns) {
      if (pattern.test(text)) {
        return {
          type: 'security',
          severity: 'high',
          description: `Potential security concern: ${pattern}`,
          confidence: 0.7
        };
      }
    }

    return null;
  }

  private assessPerformanceRisk(text: string): RiskFactor | null {
    const performancePatterns = [
      /for\s*\([^)]*in[^)]*\)/, // for...in loops
      /new\s+Array\s*\(\s*\d+\s*\)/, // Array constructor with size
      /\+=/, // String concatenation in loops
      /document\.getElementById\s*\(/ // DOM queries
    ];

    let riskCount = 0;
    for (const pattern of performancePatterns) {
      if (pattern.test(text)) riskCount++;
    }

    if (riskCount > 0) {
      return {
        type: 'performance',
        severity: riskCount > 2 ? 'high' : 'medium',
        description: `Performance concerns detected (${riskCount} patterns)`,
        confidence: 0.5
      };
    }

    return null;
  }

  private assessMaintainabilityRisk(text: string): RiskFactor | null {
    const lines = text.split('\n').length;
    const complexity = text.split(/[;{}]/).length;

    if (lines > 50 || complexity > 20) {
      return {
        type: 'maintainability',
        severity: lines > 100 ? 'high' : 'medium',
        description: `Complex code: ${lines} lines, ${complexity} statements`,
        confidence: 0.6
      };
    }

    return null;
  }

  private calculateRiskScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0;

    const severityWeights = { low: 0.2, medium: 0.5, high: 0.8 };
    const typeWeights = {
      syntax: 0.3,
      logic: 0.25,
      security: 0.4,
      performance: 0.2,
      maintainability: 0.15
    };

    let totalScore = 0;
    for (const factor of factors) {
      const severityWeight = severityWeights[factor.severity];
      const typeWeight = typeWeights[factor.type];
      totalScore += severityWeight * typeWeight * factor.confidence;
    }

    return Math.min(totalScore, 1);
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 0.2) return 'low';
    if (score < 0.5) return 'medium';
    if (score < 0.8) return 'high';
    return 'critical';
  }

  private generateMitigationStrategies(factors: RiskFactor[]): string[] {
    const strategies: string[] = [];

    for (const factor of factors) {
      switch (factor.type) {
        case 'syntax':
          strategies.push('Review and validate syntax before applying');
          break;
        case 'logic':
          strategies.push('Test logic thoroughly in isolated environment');
          break;
        case 'security':
          strategies.push('Conduct security review and testing');
          break;
        case 'performance':
          strategies.push('Profile and optimize performance-critical sections');
          break;
        case 'maintainability':
          strategies.push('Consider breaking down into smaller functions');
          break;
      }
    }

    return [...new Set(strategies)]; // Remove duplicates
  }

  private updateRiskStats(level: string): void {
    const current = this.riskStats.get(level) || 0;
    this.riskStats.set(level, current + 1);
  }

  getRiskDistribution(): Record<string, number> {
    return Object.fromEntries(this.riskStats);
  }

  reset(): void {
    this.riskStats.clear();
  }
}

/**
 * Completion Performance Tracker
 * Tracks and analyzes completion generation performance
 */
class CompletionPerformanceTracker {
  private metrics: {
    generationTimes: number[];
    totalCompletions: number;
    averageConfidence: number;
    complexityScores: number[];
  } = {
    generationTimes: [],
    totalCompletions: 0,
    averageConfidence: 0,
    complexityScores: []
  };

  trackGeneration(candidateCount: number, generationTime: number): void {
    this.metrics.generationTimes.push(generationTime);
    this.metrics.totalCompletions += candidateCount;

    // Keep only last 100 measurements
    if (this.metrics.generationTimes.length > 100) {
      this.metrics.generationTimes = this.metrics.generationTimes.slice(-100);
    }
  }

  getAverageGenerationTime(): number {
    if (this.metrics.generationTimes.length === 0) return 0;
    return this.metrics.generationTimes.reduce((sum, time) => sum + time, 0) /
           this.metrics.generationTimes.length;
  }

  getTotalCompletions(): number {
    return this.metrics.totalCompletions;
  }

  reset(): void {
    this.metrics = {
      generationTimes: [],
      totalCompletions: 0,
      averageConfidence: 0,
      complexityScores: []
    };
  }
}