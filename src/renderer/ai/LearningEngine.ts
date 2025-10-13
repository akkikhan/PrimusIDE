import {
  LearningPattern,
  AdaptationRule,
  PerformanceBaseline,
  LearningEvent,
  OptimizationInsight,
  SwarmMetrics,
  AgentLearning,
  Task
} from './types';

/**
 * LearningEngine - Advanced learning and optimization system for AI swarm
 * Analyzes performance patterns and generates optimization insights
 */
export class LearningEngine {
  private learningPatterns: Map<string, LearningPattern> = new Map();
  private adaptationRules: AdaptationRule[] = [];
  private performanceBaselines: Map<string, PerformanceBaseline> = new Map();
  private learningHistory: LearningEvent[] = [];
  private optimizationInsights: OptimizationInsight[] = [];
  private agentLearningIntegration: AgentLearning | null = null;

  constructor() {
    this.initializeLearningPatterns();
    this.initializeAdaptationRules();
    this.initializePerformanceBaselines();
  }

  /**
   * Initialize core learning patterns
   */
  private initializeLearningPatterns(): void {
    this.learningPatterns.set('success_pattern', {
      patternType: 'success',
      frequency: 0,
      impact: 0.8,
      context: ['clear_requirements', 'adequate_resources', 'proper_timing'],
      adaptation: 'replicate_successful_approaches'
    });

    this.learningPatterns.set('failure_pattern', {
      patternType: 'failure',
      frequency: 0,
      impact: 0.6,
      context: ['complex_requirements', 'resource_constraints', 'time_pressure'],
      adaptation: 'implement_failure_prevention'
    });

    this.learningPatterns.set('optimization_pattern', {
      patternType: 'optimization',
      frequency: 0,
      impact: 0.9,
      context: ['performance_metrics', 'resource_utilization', 'task_distribution'],
      adaptation: 'apply_performance_optimizations'
    });
  }

  /**
   * Initialize adaptation rules for automatic optimization
   */
  private initializeAdaptationRules(): void {
    this.adaptationRules = [
      {
        condition: (metrics: SwarmMetrics) => metrics.errorRate > 0.2,
        action: 'reduce_error_rate',
        priority: 10,
        cooldown: 300000 // 5 minutes
      },
      {
        condition: (metrics: SwarmMetrics) => metrics.agentUtilization < 0.5,
        action: 'optimize_agent_utilization',
        priority: 8,
        cooldown: 600000 // 10 minutes
      },
      {
        condition: (metrics: SwarmMetrics) => metrics.averageTaskCompletionTime > 60000,
        action: 'improve_completion_times',
        priority: 7,
        cooldown: 900000 // 15 minutes
      },
      {
        condition: (metrics: SwarmMetrics) => metrics.totalAgents < 3,
        action: 'scale_agent_count',
        priority: 6,
        cooldown: 1800000 // 30 minutes
      }
    ];
  }

  /**
   * Initialize performance baselines for comparison
   */
  private initializePerformanceBaselines(): void {
    this.performanceBaselines.set('error_rate', {
      metricName: 'error_rate',
      baselineValue: 0.1,
      threshold: 0.2,
      trend: 'stable'
    });

    this.performanceBaselines.set('completion_time', {
      metricName: 'completion_time',
      baselineValue: 30000,
      threshold: 60000,
      trend: 'stable'
    });

    this.performanceBaselines.set('agent_utilization', {
      metricName: 'agent_utilization',
      baselineValue: 0.7,
      threshold: 0.5,
      trend: 'stable'
    });
  }

  /**
   * Analyze swarm metrics and generate optimization insights
   */
  async analyzeMetrics(metrics: SwarmMetrics): Promise<OptimizationInsight[]> {
    const insights: OptimizationInsight[] = [];

    // Analyze current performance against baselines
    const baselineAnalysis = this.analyzeAgainstBaselines(metrics);
    insights.push(...baselineAnalysis);

    // Identify patterns in recent performance
    const patternAnalysis = await this.analyzePerformancePatterns(metrics);
    insights.push(...patternAnalysis);

    // Generate adaptation recommendations
    const adaptationInsights = this.generateAdaptationInsights(metrics);
    insights.push(...adaptationInsights);

    // Apply learning from historical data
    const learningInsights = await this.applyHistoricalLearning(metrics);
    insights.push(...learningInsights);

    // Store insights for future reference
    this.optimizationInsights.push(...insights);

    // Learn from this analysis
    await this.learnFromAnalysis(metrics, insights);

    return insights;
  }

  /**
   * Analyze current metrics against established baselines
   */
  private analyzeAgainstBaselines(metrics: SwarmMetrics): OptimizationInsight[] {
    const insights: OptimizationInsight[] = [];

    for (const [key, baseline] of Array.from(this.performanceBaselines.entries())) {
      let currentValue: number = 0;
      let description = '';
      let optimizationType: OptimizationInsight['type'] = 'optimize_performance';

      switch (key) {
        case 'error_rate':
          currentValue = metrics.errorRate;
          description = `Error rate (${(metrics.errorRate * 100).toFixed(1)}%) is ${metrics.errorRate > baseline.threshold ? 'above' : 'below'} baseline (${(baseline.baselineValue * 100).toFixed(1)}%)`;
          break;
        case 'completion_time':
          currentValue = metrics.averageTaskCompletionTime;
          description = `Average completion time (${metrics.averageTaskCompletionTime}ms) is ${metrics.averageTaskCompletionTime > baseline.threshold ? 'above' : 'below'} baseline (${baseline.baselineValue}ms)`;
          break;
        case 'agent_utilization':
          currentValue = metrics.agentUtilization;
          description = `Agent utilization (${(metrics.agentUtilization * 100).toFixed(1)}%) is ${metrics.agentUtilization < baseline.threshold ? 'below' : 'above'} baseline (${(baseline.baselineValue * 100).toFixed(1)}%)`;
          break;
      }

      if (this.requiresOptimization(currentValue, baseline)) {
        insights.push({
          type: optimizationType,
          description,
          impact: this.calculateImpact(currentValue, baseline),
          implementation: async () => {
            await this.implementBaselineOptimization(key, metrics);
          }
        });
      }
    }

    return insights;
  }

  /**
   * Determine if optimization is needed based on current vs baseline values
   */
  private requiresOptimization(currentValue: number, baseline: PerformanceBaseline): boolean {
    switch (baseline.metricName) {
      case 'error_rate':
        return currentValue > baseline.threshold;
      case 'completion_time':
        return currentValue > baseline.threshold;
      case 'agent_utilization':
        return currentValue < baseline.threshold;
      default:
        return false;
    }
  }

  /**
   * Calculate the impact of a performance deviation
   */
  private calculateImpact(currentValue: number, baseline: PerformanceBaseline): number {
    const deviation = Math.abs(currentValue - baseline.baselineValue) / baseline.baselineValue;
    return Math.min(deviation * 100, 1.0);
  }

  /**
   * Implement optimization for baseline deviations
   */
  private async implementBaselineOptimization(metricName: string, metrics: SwarmMetrics): Promise<void> {
    switch (metricName) {
      case 'error_rate':
        await this.optimizeErrorRate(metrics);
        break;
      case 'completion_time':
        await this.optimizeCompletionTime(metrics);
        break;
      case 'agent_utilization':
        await this.optimizeAgentUtilization(metrics);
        break;
    }
  }

  /**
   * Analyze performance patterns from recent data
   */
  private async analyzePerformancePatterns(metrics: SwarmMetrics): Promise<OptimizationInsight[]> {
    const insights: OptimizationInsight[] = [];

    // Analyze task completion trends
    const completionTrend = this.analyzeCompletionTrend(metrics);
    if (completionTrend.requiresOptimization) {
      insights.push({
        type: 'optimize_performance',
        description: `Task completion trend: ${completionTrend.description}`,
        impact: completionTrend.impact,
        implementation: async () => {
          await this.optimizeTaskCompletion(completionTrend);
        }
      });
    }

    // Analyze agent efficiency patterns
    const efficiencyAnalysis = this.analyzeAgentEfficiency(metrics);
    if (efficiencyAnalysis.requiresOptimization) {
      insights.push({
        type: 'redistribute_tasks',
        description: `Agent efficiency analysis: ${efficiencyAnalysis.description}`,
        impact: efficiencyAnalysis.impact,
        implementation: async () => {
          await this.optimizeAgentDistribution(efficiencyAnalysis);
        }
      });
    }

    return insights;
  }

  /**
   * Analyze task completion trends
   */
  private analyzeCompletionTrend(metrics: SwarmMetrics): { requiresOptimization: boolean; description: string; impact: number } {
    // Simple trend analysis based on current vs expected metrics
    const expectedCompletionTime = 30000; // 30 seconds baseline
    const expectedErrorRate = 0.1; // 10% baseline

    const timeDeviation = Math.abs(metrics.averageTaskCompletionTime - expectedCompletionTime) / expectedCompletionTime;
    const errorDeviation = Math.abs(metrics.errorRate - expectedErrorRate) / expectedErrorRate;

    const totalDeviation = (timeDeviation + errorDeviation) / 2;

    return {
      requiresOptimization: totalDeviation > 0.2,
      description: `Completion time: ${(metrics.averageTaskCompletionTime / 1000).toFixed(1)}s, Error rate: ${(metrics.errorRate * 100).toFixed(1)}%`,
      impact: Math.min(totalDeviation, 1.0)
    };
  }

  /**
   * Analyze agent efficiency patterns
   */
  private analyzeAgentEfficiency(metrics: SwarmMetrics): { requiresOptimization: boolean; description: string; impact: number } {
    const optimalUtilization = 0.7; // 70% utilization is optimal
    const utilizationDeviation = Math.abs(metrics.agentUtilization - optimalUtilization);

    return {
      requiresOptimization: utilizationDeviation > 0.3,
      description: `Current utilization: ${(metrics.agentUtilization * 100).toFixed(1)}%, Optimal: ${(optimalUtilization * 100).toFixed(1)}%`,
      impact: Math.min(utilizationDeviation, 1.0)
    };
  }

  /**
   * Generate adaptation insights based on current state
   */
  private generateAdaptationInsights(metrics: SwarmMetrics): OptimizationInsight[] {
    const insights: OptimizationInsight[] = [];

    for (const rule of this.adaptationRules) {
      if (rule.condition(metrics)) {
        const insight = this.createAdaptationInsight(rule, metrics);
        insights.push(insight);
      }
    }

    return insights.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Create adaptation insight from rule
   */
  private createAdaptationInsight(rule: AdaptationRule, metrics: SwarmMetrics): OptimizationInsight {
    let description = '';
    let type: OptimizationInsight['type'] = 'optimize_performance';

    switch (rule.action) {
      case 'reduce_error_rate':
        description = 'High error rate detected - implementing error reduction strategies';
        type = 'optimize_performance';
        break;
      case 'optimize_agent_utilization':
        description = 'Low agent utilization - optimizing task distribution';
        type = 'redistribute_tasks';
        break;
      case 'improve_completion_times':
        description = 'Slow completion times - implementing performance optimizations';
        type = 'optimize_performance';
        break;
      case 'scale_agent_count':
        description = 'Insufficient agents - scaling swarm capacity';
        type = 'scale_agents';
        break;
    }

    return {
      type,
      description,
      impact: rule.priority / 10,
      implementation: async () => {
        await this.executeAdaptationAction(rule.action, metrics);
      }
    };
  }

  /**
   * Apply learning from historical performance data
   */
  private async applyHistoricalLearning(metrics: SwarmMetrics): Promise<OptimizationInsight[]> {
    const insights: OptimizationInsight[] = [];

    // Analyze learning patterns
    for (const [patternKey, pattern] of Array.from(this.learningPatterns.entries())) {
      if (pattern.frequency > 0) {
        const insight = await this.generateLearningInsight(pattern, metrics);
        if (insight) {
          insights.push(insight);
        }
      }
    }

    return insights;
  }

  /**
   * Generate insight from learning pattern
   */
  private async generateLearningInsight(pattern: LearningPattern, metrics: SwarmMetrics): Promise<OptimizationInsight | null> {
    // Check if pattern is relevant to current metrics
    const relevance = this.calculatePatternRelevance(pattern, metrics);

    if (relevance > 0.5) {
      return {
        type: 'optimize_performance',
        description: `Applying ${pattern.patternType} pattern: ${pattern.adaptation}`,
        impact: pattern.impact * relevance,
        implementation: async () => {
          await this.applyLearningPattern(pattern, metrics);
        }
      };
    }

    return null;
  }

  /**
   * Calculate relevance of a learning pattern to current metrics
   */
  private calculatePatternRelevance(pattern: LearningPattern, metrics: SwarmMetrics): number {
    let relevance = 0;

    // Check if current context matches pattern context
    const contextMatch = pattern.context.filter(context =>
      this.contextMatchesMetrics(context, metrics)
    ).length / pattern.context.length;

    relevance += contextMatch * 0.7;

    // Factor in pattern frequency and impact
    relevance += (pattern.frequency * 0.1) * 0.3;

    return Math.min(relevance, 1.0);
  }

  /**
   * Check if context matches current metrics
   */
  private contextMatchesMetrics(context: string, metrics: SwarmMetrics): boolean {
    switch (context) {
      case 'clear_requirements':
        return metrics.completedTasks > 0;
      case 'adequate_resources':
        return metrics.totalAgents >= 3;
      case 'proper_timing':
        return metrics.averageTaskCompletionTime < 60000;
      case 'complex_requirements':
        return metrics.activeTasks > 5;
      case 'resource_constraints':
        return metrics.agentUtilization > 0.8;
      case 'time_pressure':
        return metrics.averageTaskCompletionTime > 120000;
      case 'performance_metrics':
        return metrics.completedTasks > 10;
      case 'resource_utilization':
        return metrics.agentUtilization > 0.5;
      case 'task_distribution':
        return metrics.activeTasks > 0;
      default:
        return false;
    }
  }

  /**
   * Learn from the current analysis for future improvements
   */
  private async learnFromAnalysis(metrics: SwarmMetrics, insights: OptimizationInsight[]): Promise<void> {
    const learningEvent: LearningEvent = {
      timestamp: Date.now(),
      eventType: insights.length > 0 ? 'success' : 'failure',
      taskId: `analysis_${Date.now()}`,
      context: {
        taskRequirements: ['performance_analysis', 'optimization'],
        taskDescription: 'Swarm performance analysis and optimization',
        agentCapabilities: ['learning', 'adaptation', 'optimization']
      }
    };

    this.learningHistory.push(learningEvent);

    // Update learning patterns based on insights
    for (const insight of insights) {
      await this.updateLearningPatterns(insight);
    }

    // Store learning in agent learning system if available
    if (this.agentLearningIntegration) {
      if (insights.length === 0) {
        await this.agentLearningIntegration.learnFromFailure(
          { id: 'analysis', description: 'Performance analysis', requirements: [], priority: 'medium' } as Task,
          new Error('No optimization insights generated')
        );
      }
    }
  }

  /**
   * Update learning patterns based on insights
   */
  private async updateLearningPatterns(insight: OptimizationInsight): Promise<void> {
    // Update relevant learning patterns
    for (const pattern of Array.from(this.learningPatterns.values())) {
      if (this.insightMatchesPattern(insight, pattern)) {
        pattern.frequency += 1;
        pattern.impact = (pattern.impact + insight.impact) / 2;
      }
    }
  }

  /**
   * Check if insight matches a learning pattern
   */
  private insightMatchesPattern(insight: OptimizationInsight, pattern: LearningPattern): boolean {
    const insightText = insight.description.toLowerCase();
    const patternContext = pattern.context.join(' ').toLowerCase();

    return insightText.includes(pattern.adaptation.replace(/_/g, ' ')) ||
           patternContext.split(' ').some(word => insightText.includes(word));
  }

  /**
   * Execute adaptation action
   */
  private async executeAdaptationAction(action: string, metrics: SwarmMetrics): Promise<void> {
    switch (action) {
      case 'reduce_error_rate':
        await this.optimizeErrorRate(metrics);
        break;
      case 'optimize_agent_utilization':
        await this.optimizeAgentUtilization(metrics);
        break;
      case 'improve_completion_times':
        await this.optimizeCompletionTime(metrics);
        break;
      case 'scale_agent_count':
        await this.scaleAgentCount(metrics);
        break;
    }
  }

  /**
   * Apply learning pattern to current situation
   */
  private async applyLearningPattern(pattern: LearningPattern, metrics: SwarmMetrics): Promise<void> {
    switch (pattern.adaptation) {
      case 'replicate_successful_approaches':
        await this.replicateSuccessfulApproaches(pattern);
        break;
      case 'implement_failure_prevention':
        await this.implementFailurePrevention(pattern);
        break;
      case 'apply_performance_optimizations':
        await this.applyPerformanceOptimizations(pattern);
        break;
    }
  }

  // Implementation methods for specific optimizations
  private async optimizeErrorRate(metrics: SwarmMetrics): Promise<void> {
    
    // Implementation would adjust error handling strategies
  }

  private async optimizeCompletionTime(metrics: SwarmMetrics): Promise<void> {
    
    // Implementation would optimize task distribution and execution
  }

  private async optimizeAgentUtilization(metrics: SwarmMetrics): Promise<void> {
    
    // Implementation would redistribute tasks and optimize agent allocation
  }

  private async scaleAgentCount(metrics: SwarmMetrics): Promise<void> {
    
    // Implementation would spawn or terminate agents as needed
  }

  private async replicateSuccessfulApproaches(pattern: LearningPattern): Promise<void> {
    
    // Implementation would replicate successful task execution patterns
  }

  private async implementFailurePrevention(pattern: LearningPattern): Promise<void> {
    
    // Implementation would add failure prevention mechanisms
  }

  private async applyPerformanceOptimizations(pattern: LearningPattern): Promise<void> {
    
    // Implementation would apply learned performance optimizations
  }

  private async optimizeTaskCompletion(trend: any): Promise<void> {
    
    // Implementation would optimize task completion based on trend analysis
  }

  private async optimizeAgentDistribution(analysis: any): Promise<void> {
    
    // Implementation would redistribute tasks among agents
  }

  /**
   * Integrate with agent learning system
   */
  integrateWithAgentLearning(learning: AgentLearning): void {
    this.agentLearningIntegration = learning;
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): any {
    return {
      totalPatterns: this.learningPatterns.size,
      activePatterns: Array.from(this.learningPatterns.values()).filter(p => p.frequency > 0).length,
      totalInsights: this.optimizationInsights.length,
      averageImpact: this.optimizationInsights.reduce((sum, i) => sum + i.impact, 0) / Math.max(this.optimizationInsights.length, 1),
      learningHistoryLength: this.learningHistory.length
    };
  }

  /**
   * Get adaptation rules
   */
  getAdaptationRules(): AdaptationRule[] {
    return [...this.adaptationRules];
  }

  /**
   * Get performance baselines
   */
  getPerformanceBaselines(): Map<string, PerformanceBaseline> {
    return new Map(this.performanceBaselines);
  }
}