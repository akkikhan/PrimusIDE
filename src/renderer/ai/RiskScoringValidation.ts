import { AIService } from './AIService';
import { ContextAwarenessSystem } from './ContextAwarenessSystem';
import { AgentContextManager } from './AgentContextManager';
import { Task, TaskResult } from './types';

/**
 * Risk categories for AI suggestions
 */
export enum RiskCategory {
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  RELIABILITY = 'reliability',
  MAINTAINABILITY = 'maintainability',
  COMPATIBILITY = 'compatibility',
  COMPLIANCE = 'compliance',
  OPERATIONAL = 'operational',
  FINANCIAL = 'financial'
}

/**
 * Risk severity levels
 */
export enum RiskSeverity {
  CRITICAL = 'critical', // Immediate threat, stop everything
  HIGH = 'high',         // Significant risk, requires attention
  MEDIUM = 'medium',     // Moderate risk, should be addressed
  LOW = 'low',          // Minor risk, can be ignored
  INFO = 'info'         // Informational, no action needed
}

/**
 * Individual risk assessment
 */
export interface RiskAssessment {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  score: number; // 0-1, where 1 is highest risk
  description: string;
  impact: string;
  likelihood: number; // 0-1
  mitigation: string[];
  references: string[];
  metadata: {
    detectedAt: number;
    confidence: number;
    automated: boolean;
    ruleId?: string;
  };
}

/**
 * Comprehensive risk score for an AI suggestion
 */
export interface RiskScore {
  overall: number; // 0-1
  categories: Record<RiskCategory, number>;
  assessments: RiskAssessment[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  recommendation: 'block' | 'review' | 'proceed' | 'monitor';
  metadata: {
    assessedAt: number;
    assessmentVersion: string;
    assessor: string;
  };
}

/**
 * Validation rule for AI suggestions
 */
export interface ValidationRule {
  id: string;
  name: string;
  category: RiskCategory;
  severity: RiskSeverity;
  condition: (suggestion: AISuggestion) => boolean;
  message: string;
  mitigation: string[];
  enabled: boolean;
  priority: number;
}

/**
 * AI suggestion to be validated
 */
export interface AISuggestion {
  id: string;
  type: 'completion' | 'refactoring' | 'generation' | 'modification';
  content: string;
  context: {
    filePath?: string;
    language?: string;
    position?: { line: number; column: number };
    surroundingCode?: string;
    projectInfo?: any;
  };
  metadata: {
    generatedBy: string;
    confidence: number;
    timestamp: number;
    tokensUsed?: number;
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  riskScore: RiskScore;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  performance: {
    validationTime: number;
    rulesEvaluated: number;
    aiCalls: number;
  };
}

/**
 * Validation error
 */
export interface ValidationError {
  ruleId: string;
  message: string;
  severity: RiskSeverity;
  location?: {
    filePath: string;
    line: number;
    column: number;
  };
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  ruleId: string;
  message: string;
  severity: RiskSeverity;
  suggestion?: string;
}

/**
 * Validation suggestion
 */
export interface ValidationSuggestion {
  type: 'improvement' | 'alternative' | 'security' | 'performance';
  message: string;
  confidence: number;
  implementation?: string;
}

/**
 * Advanced Risk Scoring & Validation System
 * Comprehensive risk assessment and validation for AI suggestions
 */
export class RiskScoringValidation {
  private aiService: AIService;
  private contextSystem: ContextAwarenessSystem;
  private contextManager: AgentContextManager;
  private validationRules: Map<string, ValidationRule> = new Map();
  private riskAssessments: Map<string, RiskScore> = new Map();
  private validationCache: Map<string, ValidationResult> = new Map();

  // Configuration
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 500;
  private readonly DEFAULT_RISK_THRESHOLDS = {
    critical: 0.9,
    high: 0.7,
    medium: 0.4,
    low: 0.1
  };

  constructor(
    aiService: AIService,
    contextSystem: ContextAwarenessSystem,
    contextManager: AgentContextManager
  ) {
    this.aiService = aiService;
    this.contextSystem = contextSystem;
    this.contextManager = contextManager;
    this.initializeValidationRules();
  }

  /**
   * Assess risk for an AI suggestion
   */
  async assessRisk(suggestion: AISuggestion): Promise<RiskScore> {
    const cacheKey = `risk_${suggestion.id}_${suggestion.metadata.timestamp}`;

    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached.riskScore;
    }

    const startTime = Date.now();

    try {
      // Perform comprehensive risk assessment
      const assessments = await this.performRiskAssessment(suggestion);

      // Calculate category scores
      const categoryScores = this.calculateCategoryScores(assessments);

      // Calculate overall risk score
      const overallScore = this.calculateOverallScore(categoryScores, assessments);

      // Determine risk level and recommendation
      const riskLevel = this.determineRiskLevel(overallScore);
      const recommendation = this.determineRecommendation(riskLevel, assessments);

      const riskScore: RiskScore = {
        overall: overallScore,
        categories: categoryScores,
        assessments,
        riskLevel,
        recommendation,
        metadata: {
          assessedAt: Date.now(),
          assessmentVersion: '2.0',
          assessor: 'advanced-risk-system'
        }
      };

      // Cache the result
      this.cacheResult(cacheKey, {
        valid: recommendation !== 'block',
        riskScore,
        errors: [],
        warnings: [],
        suggestions: [],
        performance: {
          validationTime: Date.now() - startTime,
          rulesEvaluated: this.validationRules.size,
          aiCalls: 1
        }
      });

      return riskScore;
    } catch (error) {
      console.error('Risk assessment failed:', error);
      return this.createDefaultRiskScore(suggestion);
    }
  }

  /**
   * Validate an AI suggestion against all rules
   */
  async validateSuggestion(suggestion: AISuggestion): Promise<ValidationResult> {
    const cacheKey = `validation_${suggestion.id}_${suggestion.metadata.timestamp}`;

    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      // Assess risk first
      const riskScore = await this.assessRisk(suggestion);

      // Run validation rules
      const ruleResults = await this.runValidationRules(suggestion);

      // Generate suggestions based on validation results
      const suggestions = await this.generateValidationSuggestions(suggestion, ruleResults);

      const result: ValidationResult = {
        valid: riskScore.recommendation !== 'block' && ruleResults.errors.length === 0,
        riskScore,
        errors: ruleResults.errors,
        warnings: ruleResults.warnings,
        suggestions,
        performance: {
          validationTime: Date.now() - startTime,
          rulesEvaluated: ruleResults.evaluatedRules,
          aiCalls: 1
        }
      };

      // Cache the result
      this.cacheResult(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Validation failed:', error);
      return this.createDefaultValidationResult(suggestion);
    }
  }

  /**
   * Get risk assessment statistics
   */
  getRiskStatistics(): {
    totalAssessments: number;
    riskDistribution: Record<string, number>;
    categoryAverages: Record<RiskCategory, number>;
    topRisks: RiskAssessment[];
  } {
    const assessments = Array.from(this.riskAssessments.values());

    const riskDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    const categoryAverages: Record<RiskCategory, number> = {
      [RiskCategory.SECURITY]: 0,
      [RiskCategory.PERFORMANCE]: 0,
      [RiskCategory.RELIABILITY]: 0,
      [RiskCategory.MAINTAINABILITY]: 0,
      [RiskCategory.COMPATIBILITY]: 0,
      [RiskCategory.COMPLIANCE]: 0,
      [RiskCategory.OPERATIONAL]: 0,
      [RiskCategory.FINANCIAL]: 0
    };

    let categoryCounts: Record<RiskCategory, number> = {
      [RiskCategory.SECURITY]: 0,
      [RiskCategory.PERFORMANCE]: 0,
      [RiskCategory.RELIABILITY]: 0,
      [RiskCategory.MAINTAINABILITY]: 0,
      [RiskCategory.COMPATIBILITY]: 0,
      [RiskCategory.COMPLIANCE]: 0,
      [RiskCategory.OPERATIONAL]: 0,
      [RiskCategory.FINANCIAL]: 0
    };

    for (const riskScore of assessments) {
      riskDistribution[riskScore.riskLevel]++;

      for (const [category, score] of Object.entries(riskScore.categories)) {
        categoryAverages[category as RiskCategory] += score;
        categoryCounts[category as RiskCategory]++;
      }
    }

    // Calculate averages
    for (const category of Object.keys(categoryAverages)) {
      const count = categoryCounts[category as RiskCategory];
      if (count > 0) {
        categoryAverages[category as RiskCategory] /= count;
      }
    }

    // Get top risks
    const allAssessments = assessments.flatMap(rs => rs.assessments);
    const topRisks = allAssessments
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      totalAssessments: assessments.length,
      riskDistribution,
      categoryAverages,
      topRisks
    };
  }

  /**
   * Update validation rules
   */
  async updateValidationRules(updates: Partial<ValidationRule>[]): Promise<void> {
    for (const update of updates) {
      if (update.id) {
        const existingRule = this.validationRules.get(update.id);
        if (existingRule) {
          Object.assign(existingRule, update);
        }
      }
    }

    // Clear validation cache to force re-evaluation
    this.validationCache.clear();
  }

  // Private methods

  private initializeValidationRules(): void {
    const rules: ValidationRule[] = [
      // Security Rules
      {
        id: 'sec_injection',
        name: 'SQL Injection Prevention',
        category: RiskCategory.SECURITY,
        severity: RiskSeverity.HIGH,
        condition: (suggestion) => this.containsSqlInjection(suggestion),
        message: 'Potential SQL injection vulnerability detected',
        mitigation: ['Use parameterized queries', 'Validate input data', 'Use ORM properly'],
        enabled: true,
        priority: 1
      },
      {
        id: 'sec_xss',
        name: 'XSS Prevention',
        category: RiskCategory.SECURITY,
        severity: RiskSeverity.HIGH,
        condition: (suggestion) => this.containsXssVulnerability(suggestion),
        message: 'Potential XSS vulnerability detected',
        mitigation: ['Sanitize HTML output', 'Use template engines', 'Escape user input'],
        enabled: true,
        priority: 2
      },
      {
        id: 'sec_secrets',
        name: 'Secret Exposure Prevention',
        category: RiskCategory.SECURITY,
        severity: RiskSeverity.CRITICAL,
        condition: (suggestion) => this.containsSecretExposure(suggestion),
        message: 'Potential secret or credential exposure detected',
        mitigation: ['Use environment variables', 'Store secrets securely', 'Never commit credentials'],
        enabled: true,
        priority: 3
      },

      // Performance Rules
      {
        id: 'perf_inefficient',
        name: 'Performance Anti-patterns',
        category: RiskCategory.PERFORMANCE,
        severity: RiskSeverity.MEDIUM,
        condition: (suggestion) => this.containsPerformanceIssues(suggestion),
        message: 'Potential performance issues detected',
        mitigation: ['Use efficient algorithms', 'Cache results', 'Avoid N+1 queries'],
        enabled: true,
        priority: 4
      },

      // Reliability Rules
      {
        id: 'rel_error_handling',
        name: 'Error Handling',
        category: RiskCategory.RELIABILITY,
        severity: RiskSeverity.MEDIUM,
        condition: (suggestion) => this.missingErrorHandling(suggestion),
        message: 'Missing error handling detected',
        mitigation: ['Add try-catch blocks', 'Handle edge cases', 'Validate inputs'],
        enabled: true,
        priority: 5
      },

      // Maintainability Rules
      {
        id: 'maint_complexity',
        name: 'Code Complexity',
        category: RiskCategory.MAINTAINABILITY,
        severity: RiskSeverity.LOW,
        condition: (suggestion) => this.tooComplex(suggestion),
        message: 'Code is too complex',
        mitigation: ['Break into smaller functions', 'Reduce nesting', 'Use clear naming'],
        enabled: true,
        priority: 6
      }
    ];

    for (const rule of rules) {
      this.validationRules.set(rule.id, rule);
    }
  }

  private async performRiskAssessment(suggestion: AISuggestion): Promise<RiskAssessment[]> {
    const assessments: RiskAssessment[] = [];

    // Run all validation rules
    for (const rule of this.validationRules.values()) {
      if (!rule.enabled) continue;

      try {
        const triggered = rule.condition(suggestion);
        if (triggered) {
          assessments.push({
            id: `assessment_${rule.id}_${Date.now()}`,
            category: rule.category,
            severity: rule.severity,
            score: this.severityToScore(rule.severity),
            description: rule.message,
            impact: this.generateImpactDescription(rule.category, rule.severity),
            likelihood: this.calculateLikelihood(suggestion, rule),
            mitigation: rule.mitigation,
            references: [],
            metadata: {
              detectedAt: Date.now(),
              confidence: 0.8,
              automated: true,
              ruleId: rule.id
            }
          });
        }
      } catch (error) {
        console.warn(`Rule ${rule.id} evaluation failed:`, error);
      }
    }

    // AI-powered risk assessment for complex cases
    const aiAssessments = await this.performAIAnalysis(suggestion);
    assessments.push(...aiAssessments);

    return assessments;
  }

  private async performAIAnalysis(suggestion: AISuggestion): Promise<RiskAssessment[]> {
    const task: Task = {
      id: `ai_risk_${suggestion.id}`,
      description: `Perform AI-powered risk analysis for suggestion`,
      requirements: ['risk-analysis', 'security-analysis'],
      priority: 'high'
    };

    const response = await this.aiService.executeTask(task, {
      context: {
        agentId: 'risk-analyzer',
        specialty: 'risk-analysis',
        capabilities: ['security-analysis', 'performance-analysis'],
        memory: { suggestion }
      },
      useCache: true
    });

    if (!response.success) return [];

    // Parse AI response and create assessments
    return this.parseAIAnalysisResponse(response.output, suggestion);
  }

  private parseAIAnalysisResponse(aiResponse: any, suggestion: AISuggestion): RiskAssessment[] {
    // Implementation would parse AI response
    // For now, return empty array
    return [];
  }

  private calculateCategoryScores(assessments: RiskAssessment[]): Record<RiskCategory, number> {
    const categoryScores: Record<RiskCategory, number> = {
      [RiskCategory.SECURITY]: 0,
      [RiskCategory.PERFORMANCE]: 0,
      [RiskCategory.RELIABILITY]: 0,
      [RiskCategory.MAINTAINABILITY]: 0,
      [RiskCategory.COMPATIBILITY]: 0,
      [RiskCategory.COMPLIANCE]: 0,
      [RiskCategory.OPERATIONAL]: 0,
      [RiskCategory.FINANCIAL]: 0
    };

    const categoryCounts: Record<RiskCategory, number> = {
      [RiskCategory.SECURITY]: 0,
      [RiskCategory.PERFORMANCE]: 0,
      [RiskCategory.RELIABILITY]: 0,
      [RiskCategory.MAINTAINABILITY]: 0,
      [RiskCategory.COMPATIBILITY]: 0,
      [RiskCategory.COMPLIANCE]: 0,
      [RiskCategory.OPERATIONAL]: 0,
      [RiskCategory.FINANCIAL]: 0
    };

    for (const assessment of assessments) {
      categoryScores[assessment.category] += assessment.score;
      categoryCounts[assessment.category]++;
    }

    // Calculate averages
    for (const category of Object.keys(categoryScores)) {
      const count = categoryCounts[category as RiskCategory];
      if (count > 0) {
        categoryScores[category as RiskCategory] /= count;
      }
    }

    return categoryScores;
  }

  private calculateOverallScore(
    categoryScores: Record<RiskCategory, number>,
    assessments: RiskAssessment[]
  ): number {
    const weights = {
      [RiskCategory.SECURITY]: 0.25,
      [RiskCategory.PERFORMANCE]: 0.15,
      [RiskCategory.RELIABILITY]: 0.20,
      [RiskCategory.MAINTAINABILITY]: 0.10,
      [RiskCategory.COMPATIBILITY]: 0.15,
      [RiskCategory.COMPLIANCE]: 0.10,
      [RiskCategory.OPERATIONAL]: 0.03,
      [RiskCategory.FINANCIAL]: 0.02
    };

    let weightedScore = 0;
    let totalWeight = 0;

    for (const [category, score] of Object.entries(categoryScores)) {
      const weight = weights[category as RiskCategory];
      weightedScore += score * weight;
      totalWeight += weight;
    }

    // Factor in critical assessments
    const criticalCount = assessments.filter(a => a.severity === RiskSeverity.CRITICAL).length;
    const criticalPenalty = Math.min(criticalCount * 0.1, 0.3);

    return Math.min((weightedScore / totalWeight) + criticalPenalty, 1);
  }

  private determineRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= this.DEFAULT_RISK_THRESHOLDS.critical) return 'critical';
    if (score >= this.DEFAULT_RISK_THRESHOLDS.high) return 'high';
    if (score >= this.DEFAULT_RISK_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  private determineRecommendation(
    riskLevel: string,
    assessments: RiskAssessment[]
  ): 'block' | 'review' | 'proceed' | 'monitor' {
    switch (riskLevel) {
      case 'critical':
        return 'block';
      case 'high':
        return 'review';
      case 'medium':
        return assessments.some(a => a.category === RiskCategory.SECURITY) ? 'review' : 'proceed';
      default:
        return 'proceed';
    }
  }

  private async runValidationRules(suggestion: AISuggestion): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    evaluatedRules: number;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let evaluatedRules = 0;

    for (const rule of this.validationRules.values()) {
      if (!rule.enabled) continue;

      evaluatedRules++;
      try {
        const triggered = rule.condition(suggestion);
        if (triggered) {
          const issue = {
            ruleId: rule.id,
            message: rule.message,
            severity: rule.severity
          };

          if (rule.severity === RiskSeverity.CRITICAL || rule.severity === RiskSeverity.HIGH) {
            errors.push(issue);
          } else {
            warnings.push(issue);
          }
        }
      } catch (error) {
        console.warn(`Rule ${rule.id} evaluation failed:`, error);
      }
    }

    return { errors, warnings, evaluatedRules };
  }

  private async generateValidationSuggestions(
    suggestion: AISuggestion,
    ruleResults: any
  ): Promise<ValidationSuggestion[]> {
    const suggestions: ValidationSuggestion[] = [];

    // Generate suggestions based on validation results
    if (ruleResults.errors.length > 0) {
      suggestions.push({
        type: 'improvement',
        message: 'Address validation errors before proceeding',
        confidence: 0.9
      });
    }

    if (ruleResults.warnings.length > 0) {
      suggestions.push({
        type: 'improvement',
        message: 'Consider addressing warnings for better code quality',
        confidence: 0.7
      });
    }

    return suggestions;
  }

  // Rule condition implementations

  private containsSqlInjection(suggestion: AISuggestion): boolean {
    const patterns = [
      /SELECT.*\+.*FROM/i,
      /INSERT.*\+.*INTO/i,
      /UPDATE.*\+.*SET/i,
      /DELETE.*\+.*FROM/i,
      /exec\s*\(/i,
      /eval\s*\(/i
    ];

    return patterns.some(pattern => pattern.test(suggestion.content));
  }

  private containsXssVulnerability(suggestion: AISuggestion): boolean {
    const patterns = [
      /innerHTML\s*=/,
      /outerHTML\s*=/,
      /insertAdjacentHTML/,
      /document\.write/,
      /document\.writeln/
    ];

    return patterns.some(pattern => pattern.test(suggestion.content));
  }

  private containsSecretExposure(suggestion: AISuggestion): boolean {
    const patterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /api_key/i,
      /private_key/i,
      /auth_token/i
    ];

    return patterns.some(pattern => pattern.test(suggestion.content));
  }

  private containsPerformanceIssues(suggestion: AISuggestion): boolean {
    const patterns = [
      /for\s*\([^)]*in[^)]*\)/, // for...in loops
      /new\s+Array\s*\(\s*\d+\s*\)/, // Array constructor with size
      /\+=/, // String concatenation in loops
      /document\.getElementById\s*\(/ // DOM queries
    ];

    return patterns.some(pattern => pattern.test(suggestion.content));
  }

  private missingErrorHandling(suggestion: AISuggestion): boolean {
    const hasErrorHandling = /try\s*\{|catch\s*\(|throw\s+/.test(suggestion.content);
    const hasAsync = /async\s+|await\s+|\.then\s*\(|\.catch\s*\(/.test(suggestion.content);

    return hasAsync && !hasErrorHandling;
  }

  private tooComplex(suggestion: AISuggestion): boolean {
    const lines = suggestion.content.split('\n').length;
    const branches = (suggestion.content.match(/\b(if|else|for|while|switch|case)\b/g) || []).length;
    const functions = (suggestion.content.match(/\bfunction\b|\b=>\b|\bclass\b/g) || []).length;

    return lines > 50 || branches > 10 || functions > 5;
  }

  // Helper methods

  private severityToScore(severity: RiskSeverity): number {
    switch (severity) {
      case RiskSeverity.CRITICAL: return 1.0;
      case RiskSeverity.HIGH: return 0.8;
      case RiskSeverity.MEDIUM: return 0.5;
      case RiskSeverity.LOW: return 0.2;
      case RiskSeverity.INFO: return 0.1;
      default: return 0.5;
    }
  }

  private calculateLikelihood(suggestion: AISuggestion, rule: ValidationRule): number {
    // Base likelihood on suggestion confidence and rule priority
    const baseLikelihood = 1 - suggestion.metadata.confidence;
    const priorityFactor = rule.priority / 10;
    return Math.min(baseLikelihood * priorityFactor, 1);
  }

  private generateImpactDescription(category: RiskCategory, severity: RiskSeverity): string {
    const impacts: Record<RiskCategory, Record<RiskSeverity, string>> = {
      [RiskCategory.SECURITY]: {
        [RiskSeverity.CRITICAL]: 'Could lead to complete system compromise',
        [RiskSeverity.HIGH]: 'Could expose sensitive data or allow unauthorized access',
        [RiskSeverity.MEDIUM]: 'Could introduce security vulnerabilities',
        [RiskSeverity.LOW]: 'Minor security considerations',
        [RiskSeverity.INFO]: 'Informational security notice'
      },
      [RiskCategory.PERFORMANCE]: {
        [RiskSeverity.CRITICAL]: 'Could cause system-wide performance degradation',
        [RiskSeverity.HIGH]: 'Could significantly impact user experience',
        [RiskSeverity.MEDIUM]: 'Could cause noticeable performance issues',
        [RiskSeverity.LOW]: 'Minor performance considerations',
        [RiskSeverity.INFO]: 'Informational performance notice'
      },
      [RiskCategory.RELIABILITY]: {
        [RiskSeverity.CRITICAL]: 'Could cause complete system failure',
        [RiskSeverity.HIGH]: 'Could cause significant system instability',
        [RiskSeverity.MEDIUM]: 'Could cause occasional system issues',
        [RiskSeverity.LOW]: 'Minor reliability considerations',
        [RiskSeverity.INFO]: 'Informational reliability notice'
      },
      [RiskCategory.MAINTAINABILITY]: {
        [RiskSeverity.CRITICAL]: 'Could make system extremely difficult to maintain',
        [RiskSeverity.HIGH]: 'Could significantly impact maintainability',
        [RiskSeverity.MEDIUM]: 'Could make maintenance more difficult',
        [RiskSeverity.LOW]: 'Minor maintainability considerations',
        [RiskSeverity.INFO]: 'Informational maintainability notice'
      },
      [RiskCategory.COMPATIBILITY]: {
        [RiskSeverity.CRITICAL]: 'Could break system compatibility completely',
        [RiskSeverity.HIGH]: 'Could cause significant compatibility issues',
        [RiskSeverity.MEDIUM]: 'Could cause some compatibility issues',
        [RiskSeverity.LOW]: 'Minor compatibility considerations',
        [RiskSeverity.INFO]: 'Informational compatibility notice'
      },
      [RiskCategory.COMPLIANCE]: {
        [RiskSeverity.CRITICAL]: 'Could cause severe compliance violations',
        [RiskSeverity.HIGH]: 'Could cause significant compliance issues',
        [RiskSeverity.MEDIUM]: 'Could cause minor compliance issues',
        [RiskSeverity.LOW]: 'Minor compliance considerations',
        [RiskSeverity.INFO]: 'Informational compliance notice'
      },
      [RiskCategory.OPERATIONAL]: {
        [RiskSeverity.CRITICAL]: 'Could cause complete operational failure',
        [RiskSeverity.HIGH]: 'Could significantly impact operations',
        [RiskSeverity.MEDIUM]: 'Could cause operational difficulties',
        [RiskSeverity.LOW]: 'Minor operational considerations',
        [RiskSeverity.INFO]: 'Informational operational notice'
      },
      [RiskCategory.FINANCIAL]: {
        [RiskSeverity.CRITICAL]: 'Could cause severe financial impact',
        [RiskSeverity.HIGH]: 'Could cause significant financial impact',
        [RiskSeverity.MEDIUM]: 'Could cause moderate financial impact',
        [RiskSeverity.LOW]: 'Minor financial considerations',
        [RiskSeverity.INFO]: 'Informational financial notice'
      }
    };

    return impacts[category]?.[severity] || 'Potential impact on system';
  }

  private createDefaultRiskScore(suggestion: AISuggestion): RiskScore {
    return {
      overall: 0.5,
      categories: {
        [RiskCategory.SECURITY]: 0.5,
        [RiskCategory.PERFORMANCE]: 0.5,
        [RiskCategory.RELIABILITY]: 0.5,
        [RiskCategory.MAINTAINABILITY]: 0.5,
        [RiskCategory.COMPATIBILITY]: 0.5,
        [RiskCategory.COMPLIANCE]: 0.5,
        [RiskCategory.OPERATIONAL]: 0.5,
        [RiskCategory.FINANCIAL]: 0.5
      },
      assessments: [],
      riskLevel: 'medium',
      recommendation: 'review',
      metadata: {
        assessedAt: Date.now(),
        assessmentVersion: '2.0',
        assessor: 'default'
      }
    };
  }

  private createDefaultValidationResult(suggestion: AISuggestion): ValidationResult {
    return {
      valid: false,
      riskScore: this.createDefaultRiskScore(suggestion),
      errors: [{
        ruleId: 'system_error',
        message: 'Validation system error',
        severity: RiskSeverity.HIGH
      }],
      warnings: [],
      suggestions: [],
      performance: {
        validationTime: 0,
        rulesEvaluated: 0,
        aiCalls: 0
      }
    };
  }

  private getCachedResult(key: string): ValidationResult | null {
    const cached = this.validationCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.performance.validationTime;
    if (age > this.CACHE_TTL) {
      this.validationCache.delete(key);
      return null;
    }

    return cached;
  }

  private cacheResult(key: string, result: ValidationResult): void {
    if (this.validationCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.validationCache.keys())[0];
      this.validationCache.delete(oldestKey);
    }

    this.validationCache.set(key, result);
  }
}