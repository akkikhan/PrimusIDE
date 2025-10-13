// Performance Optimization Engine - Comprehensive performance monitoring and optimization
// Integrates with SwarmOrchestrator for intelligent optimization and AdvancedPerformanceMonitor for metrics

import { EventEmitter } from 'events';
import { AdvancedPerformanceMonitor, PerformanceMetrics, OptimizationSuggestion } from './AdvancedPerformanceMonitor';
import { SwarmOrchestrator } from '../ai/SwarmOrchestrator';
import { DevelopmentToolsIntegrationService } from './DevelopmentToolsIntegrationService';

export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  category: 'memory' | 'cpu' | 'network' | 'bundle' | 'rendering' | 'ux';
  priority: 'low' | 'medium' | 'high' | 'critical';
  conditions: OptimizationCondition[];
  actions: OptimizationAction[];
  cooldown: number; // Minimum time between applications in ms
  lastApplied?: number;
  successRate: number;
  totalApplications: number;
  successfulApplications: number;
}

export interface OptimizationCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: number;
  unit?: string;
}

export interface OptimizationAction {
  type: 'code' | 'config' | 'resource' | 'cache' | 'bundle';
  target: string;
  operation: string;
  parameters: Record<string, any>;
  rollback?: OptimizationAction;
  risk: 'low' | 'medium' | 'high';
  estimatedImpact: number; // Expected performance improvement in %
}

export interface OptimizationResult {
  ruleId: string;
  success: boolean;
  impact: number;
  metrics: {
    before: PerformanceMetrics;
    after: PerformanceMetrics;
  };
  error?: string;
  timestamp: number;
  rollbackApplied?: boolean;
}

export interface PerformanceProfile {
  id: string;
  name: string;
  description: string;
  targetEnvironment: 'development' | 'staging' | 'production';
  optimizationRules: string[];
  thresholds: Record<string, number>;
  active: boolean;
}

export interface ResourcePool {
  id: string;
  name: string;
  type: 'memory' | 'cpu' | 'network' | 'storage';
  totalCapacity: number;
  usedCapacity: number;
  reservedCapacity: number;
  allocationStrategy: 'round-robin' | 'least-loaded' | 'priority-based';
  resources: Resource[];
}

export interface Resource {
  id: string;
  name: string;
  capacity: number;
  currentUsage: number;
  status: 'available' | 'allocated' | 'exhausted' | 'error';
  lastHealthCheck: number;
  healthScore: number;
}

export interface CacheStrategy {
  id: string;
  name: string;
  type: 'memory' | 'disk' | 'distributed';
  maxSize: number;
  ttl: number;
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'random';
  compression: boolean;
  encryption: boolean;
  hitRate: number;
  missRate: number;
}

export class PerformanceOptimizationEngine extends EventEmitter {
  private performanceMonitor: AdvancedPerformanceMonitor;
  private swarmOrchestrator: SwarmOrchestrator;
  private devToolsIntegration: DevelopmentToolsIntegrationService;

  private optimizationRules: Map<string, OptimizationRule> = new Map();
  private activeOptimizations: Map<string, OptimizationResult[]> = new Map();
  private performanceProfiles: Map<string, PerformanceProfile> = new Map();
  private resourcePools: Map<string, ResourcePool> = new Map();
  private cacheStrategies: Map<string, CacheStrategy> = new Map();

  private optimizationInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private isOptimizing = false;
  private lastOptimizationRun = 0;

  private readonly DEFAULT_PROFILES: PerformanceProfile[] = [
    {
      id: 'development',
      name: 'Development Profile',
      description: 'Optimized for development with fast iteration and debugging',
      targetEnvironment: 'development',
      optimizationRules: ['memory-cleanup', 'bundle-splitting', 'cache-warming'],
      thresholds: {
        memoryUsage: 256, // MB
        cpuUsage: 70,
        responseTime: 1000,
        fps: 30
      },
      active: true
    },
    {
      id: 'production',
      name: 'Production Profile',
      description: 'Optimized for production with maximum performance and reliability',
      targetEnvironment: 'production',
      optimizationRules: ['memory-optimization', 'cpu-optimization', 'network-optimization', 'security-hardening'],
      thresholds: {
        memoryUsage: 512, // MB
        cpuUsage: 80,
        responseTime: 500,
        fps: 60
      },
      active: false
    }
  ];

  constructor(
    performanceMonitor: AdvancedPerformanceMonitor,
    swarmOrchestrator: SwarmOrchestrator,
    devToolsIntegration: DevelopmentToolsIntegrationService
  ) {
    super();
    this.performanceMonitor = performanceMonitor;
    this.swarmOrchestrator = swarmOrchestrator;
    this.devToolsIntegration = devToolsIntegration;

    this.initializeOptimizationEngine();
  }

  /**
   * Initialize the performance optimization engine
   */
  private async initializeOptimizationEngine(): Promise<void> {
    
    // Load default optimization rules
    await this.loadDefaultOptimizationRules();

    // Load performance profiles
    this.loadPerformanceProfiles();

    // Initialize resource pools
    this.initializeResourcePools();

    // Initialize cache strategies
    this.initializeCacheStrategies();

    // Set up event listeners
    this.setupEventListeners();

    // Start optimization cycle
    this.startOptimizationCycle();

    // Start health checks
    this.startHealthChecks();

  }

  /**
   * Load default optimization rules
   */
  private async loadDefaultOptimizationRules(): Promise<void> {
    const defaultRules: OptimizationRule[] = [
      // Memory optimization rules
      {
        id: 'memory-cleanup',
        name: 'Memory Cleanup',
        description: 'Clean up memory leaks and optimize garbage collection',
        category: 'memory',
        priority: 'high',
        conditions: [
          { metric: 'memory.heapUsed', operator: 'gt', value: 100 * 1024 * 1024 }, // > 100MB
          { metric: 'memory.leaks', operator: 'gt', value: 0 }
        ],
        actions: [
          {
            type: 'resource',
            target: 'memory',
            operation: 'garbage-collection',
            parameters: { force: true, aggressive: true },
            risk: 'low',
            estimatedImpact: 20
          },
          {
            type: 'code',
            target: 'memory-leaks',
            operation: 'fix-leaks',
            parameters: { autoFix: true },
            risk: 'medium',
            estimatedImpact: 30
          }
        ],
        cooldown: 300000, // 5 minutes
        successRate: 0,
        totalApplications: 0,
        successfulApplications: 0
      },

      // CPU optimization rules
      {
        id: 'cpu-optimization',
        name: 'CPU Usage Optimization',
        description: 'Optimize CPU usage by reducing blocking operations',
        category: 'cpu',
        priority: 'medium',
        conditions: [
          { metric: 'cpu.usage', operator: 'gt', value: 80 }
        ],
        actions: [
          {
            type: 'code',
            target: 'cpu-intensive-operations',
            operation: 'optimize-algorithms',
            parameters: { useWebWorkers: true, batchOperations: true },
            risk: 'medium',
            estimatedImpact: 25
          }
        ],
        cooldown: 600000, // 10 minutes
        successRate: 0,
        totalApplications: 0,
        successfulApplications: 0
      },

      // Bundle optimization rules
      {
        id: 'bundle-splitting',
        name: 'Bundle Size Optimization',
        description: 'Split large bundles and remove unused code',
        category: 'bundle',
        priority: 'medium',
        conditions: [
          { metric: 'bundle.totalSize', operator: 'gt', value: 1024 * 1024 } // > 1MB
        ],
        actions: [
          {
            type: 'bundle',
            target: 'webpack-config',
            operation: 'enable-code-splitting',
            parameters: { chunks: 'all', cacheGroups: true },
            risk: 'low',
            estimatedImpact: 40
          },
          {
            type: 'bundle',
            target: 'unused-dependencies',
            operation: 'remove-unused',
            parameters: { autoRemove: true },
            risk: 'medium',
            estimatedImpact: 15
          }
        ],
        cooldown: 1800000, // 30 minutes
        successRate: 0,
        totalApplications: 0,
        successfulApplications: 0
      },

      // Network optimization rules
      {
        id: 'network-optimization',
        name: 'Network Performance Optimization',
        description: 'Optimize network requests and caching',
        category: 'network',
        priority: 'medium',
        conditions: [
          { metric: 'network.averageResponseTime', operator: 'gt', value: 1000 } // > 1s
        ],
        actions: [
          {
            type: 'cache',
            target: 'http-cache',
            operation: 'enable-caching',
            parameters: { maxAge: 3600, strategy: 'cache-first' },
            risk: 'low',
            estimatedImpact: 50
          },
          {
            type: 'cache',
            target: 'requests',
            operation: 'batch-requests',
            parameters: { batchSize: 10, timeout: 5000 },
            risk: 'low',
            estimatedImpact: 30
          }
        ],
        cooldown: 900000, // 15 minutes
        successRate: 0,
        totalApplications: 0,
        successfulApplications: 0
      },

      // Rendering optimization rules
      {
        id: 'rendering-optimization',
        name: 'Rendering Performance Optimization',
        description: 'Optimize rendering performance and reduce layout thrashing',
        category: 'rendering',
        priority: 'high',
        conditions: [
          { metric: 'rendering.fps', operator: 'lt', value: 30 }
        ],
        actions: [
          {
            type: 'code',
            target: 'react-components',
            operation: 'memoize-components',
            parameters: { useMemo: true, useCallback: true },
            risk: 'low',
            estimatedImpact: 60
          },
          {
            type: 'code',
            target: 'dom-operations',
            operation: 'batch-updates',
            parameters: { useRequestAnimationFrame: true },
            risk: 'low',
            estimatedImpact: 40
          }
        ],
        cooldown: 600000, // 10 minutes
        successRate: 0,
        totalApplications: 0,
        successfulApplications: 0
      }
    ];

    for (const rule of defaultRules) {
      this.optimizationRules.set(rule.id, rule);
    }
  }

  /**
   * Load performance profiles
   */
  private loadPerformanceProfiles(): void {
    for (const profile of this.DEFAULT_PROFILES) {
      this.performanceProfiles.set(profile.id, profile);
    }
  }

  /**
   * Initialize resource pools
   */
  private initializeResourcePools(): void {
    const defaultPools: ResourcePool[] = [
      {
        id: 'memory-pool',
        name: 'Memory Pool',
        type: 'memory',
        totalCapacity: 1024 * 1024 * 1024, // 1GB
        usedCapacity: 0,
        reservedCapacity: 256 * 1024 * 1024, // 256MB reserved
        allocationStrategy: 'least-loaded',
        resources: []
      },
      {
        id: 'cpu-pool',
        name: 'CPU Pool',
        type: 'cpu',
        totalCapacity: 100, // 100% CPU
        usedCapacity: 0,
        reservedCapacity: 20, // 20% reserved
        allocationStrategy: 'round-robin',
        resources: []
      },
      {
        id: 'network-pool',
        name: 'Network Pool',
        type: 'network',
        totalCapacity: 1000, // 1000 concurrent connections
        usedCapacity: 0,
        reservedCapacity: 100, // 100 reserved
        allocationStrategy: 'priority-based',
        resources: []
      }
    ];

    for (const pool of defaultPools) {
      this.resourcePools.set(pool.id, pool);
    }
  }

  /**
   * Initialize cache strategies
   */
  private initializeCacheStrategies(): void {
    const defaultStrategies: CacheStrategy[] = [
      {
        id: 'memory-cache',
        name: 'In-Memory Cache',
        type: 'memory',
        maxSize: 100 * 1024 * 1024, // 100MB
        ttl: 300000, // 5 minutes
        evictionPolicy: 'lru',
        compression: true,
        encryption: false,
        hitRate: 0,
        missRate: 0
      },
      {
        id: 'disk-cache',
        name: 'Disk Cache',
        type: 'disk',
        maxSize: 1024 * 1024 * 1024, // 1GB
        ttl: 3600000, // 1 hour
        evictionPolicy: 'lru',
        compression: true,
        encryption: true,
        hitRate: 0,
        missRate: 0
      }
    ];

    for (const strategy of defaultStrategies) {
      this.cacheStrategies.set(strategy.id, strategy);
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Performance monitor events
    this.performanceMonitor.on('performance-alert', (alert) => {
      this.handlePerformanceAlert(alert);
    });

    this.performanceMonitor.on('optimization-suggestion', (suggestion) => {
      this.handleOptimizationSuggestion(suggestion);
    });

    // Development tools integration events
    this.devToolsIntegration.on('performance-metrics-updated', (metrics) => {
      this.analyzePerformanceTrends(metrics);
    });
  }

  /**
   * Start optimization cycle
   */
  private startOptimizationCycle(): void {
    this.optimizationInterval = setInterval(() => {
      this.runOptimizationCycle();
    }, 60000); // Run every minute
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 300000); // Check every 5 minutes
  }

  /**
   * Run optimization cycle
   */
  private async runOptimizationCycle(): Promise<void> {
    if (this.isOptimizing) return;

    this.isOptimizing = true;
    this.lastOptimizationRun = Date.now();

    try {
      
      // Get current performance metrics
      const currentMetrics = this.performanceMonitor.getMetrics();
      if (currentMetrics.length === 0) return;

      const latestMetrics = currentMetrics[currentMetrics.length - 1];

      // Get active performance profile
      const activeProfile = this.getActivePerformanceProfile();
      if (!activeProfile) return;

      // Evaluate optimization rules
      const applicableRules = this.evaluateOptimizationRules(latestMetrics, activeProfile);

      // Apply optimizations
      for (const rule of applicableRules) {
        await this.applyOptimizationRule(rule, latestMetrics);
      }

      // Optimize resource allocation
      await this.optimizeResourceAllocation();

      // Update cache strategies
      this.updateCacheStrategies();

    } catch (error) {
      console.error('❌ Error in optimization cycle:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Get active performance profile
   */
  private getActivePerformanceProfile(): PerformanceProfile | undefined {
    for (const profile of this.performanceProfiles.values()) {
      if (profile.active) return profile;
    }
    return this.performanceProfiles.get('development');
  }

  /**
   * Evaluate optimization rules against current metrics
   */
  private evaluateOptimizationRules(metrics: PerformanceMetrics, profile: PerformanceProfile): OptimizationRule[] {
    const applicableRules: OptimizationRule[] = [];

    for (const rule of this.optimizationRules.values()) {
      // Check if rule is in active profile
      if (!profile.optimizationRules.includes(rule.id)) continue;

      // Check cooldown period
      if (rule.lastApplied && Date.now() - rule.lastApplied < rule.cooldown) continue;

      // Evaluate conditions
      const conditionsMet = this.evaluateConditions(rule.conditions, metrics);

      if (conditionsMet) {
        applicableRules.push(rule);
      }
    }

    // Sort by priority
    return applicableRules.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Evaluate optimization conditions
   */
  private evaluateConditions(conditions: OptimizationCondition[], metrics: PerformanceMetrics): boolean {
    return conditions.every(condition => {
      const actualValue = this.getMetricValue(metrics, condition.metric);
      return this.evaluateCondition(actualValue, condition.operator, condition.value);
    });
  }

  /**
   * Get metric value from metrics object
   */
  private getMetricValue(metrics: PerformanceMetrics, metricPath: string): number {
    const parts = metricPath.split('.');
    let value: any = metrics;

    for (const part of parts) {
      value = value[part];
      if (value === undefined) return 0;
    }

    return typeof value === 'number' ? value : 0;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      case 'eq': return actual === expected;
      case 'ne': return actual !== expected;
      default: return false;
    }
  }

  /**
   * Apply optimization rule
   */
  private async applyOptimizationRule(rule: OptimizationRule, metrics: PerformanceMetrics): Promise<void> {
    
    const beforeMetrics = { ...metrics };
    let success = false;
    let error: string | undefined;

    try {
      // Create swarm task for optimization
      const task = {
        id: `optimization-${rule.id}-${Date.now()}`,
        type: 'optimization' as const,
        description: `Apply optimization: ${rule.name}`,
        requirements: rule.actions.map(action => action.operation),
        priority: rule.priority === 'critical' ? 'high' : 'medium',
        deadline: new Date(Date.now() + 300000), // 5 minutes
        assignedAgent: 'optimizer'
      };

      const result = await this.swarmOrchestrator.submitTask(task);

      if (result.success) {
        success = true;
        rule.totalApplications++;
        rule.successfulApplications++;
        rule.successRate = rule.successfulApplications / rule.totalApplications;
        rule.lastApplied = Date.now();

        // Record optimization result
        const optimizationResult: OptimizationResult = {
          ruleId: rule.id,
          success: true,
          impact: rule.actions.reduce((sum, action) => sum + action.estimatedImpact, 0),
          metrics: { before: beforeMetrics, after: metrics },
          timestamp: Date.now()
        };

        this.recordOptimizationResult(optimizationResult);
      }

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error(`❌ Failed to apply optimization ${rule.name}:`, error);
    }

    if (!success) {
      rule.totalApplications++;
      rule.successRate = rule.successfulApplications / rule.totalApplications;

      const optimizationResult: OptimizationResult = {
        ruleId: rule.id,
        success: false,
        impact: 0,
        metrics: { before: beforeMetrics, after: beforeMetrics },
        error,
        timestamp: Date.now()
      };

      this.recordOptimizationResult(optimizationResult);
    }
  }

  /**
   * Record optimization result
   */
  private recordOptimizationResult(result: OptimizationResult): void {
    if (!this.activeOptimizations.has(result.ruleId)) {
      this.activeOptimizations.set(result.ruleId, []);
    }

    this.activeOptimizations.get(result.ruleId)!.push(result);
    this.emit('optimization-result', result);
  }

  /**
   * Handle performance alerts
   */
  private handlePerformanceAlert(alert: any): void {
    
    // Create emergency optimization rule if needed
    if (alert.severity === 'critical') {
      this.createEmergencyOptimization(alert);
    }
  }

  /**
   * Handle optimization suggestions
   */
  private handleOptimizationSuggestion(suggestion: OptimizationSuggestion): void {
    
    // Create new optimization rule from suggestion
    this.createOptimizationRuleFromSuggestion(suggestion);
  }

  /**
   * Create emergency optimization for critical alerts
   */
  private createEmergencyOptimization(alert: any): void {
    const emergencyRule: OptimizationRule = {
      id: `emergency-${Date.now()}`,
      name: `Emergency: ${alert.title}`,
      description: `Emergency optimization for ${alert.description}`,
      category: alert.type,
      priority: 'critical',
      conditions: [
        { metric: `${alert.type}.${alert.type === 'memory' ? 'heapUsed' : 'usage'}`, operator: 'gt', value: 90 }
      ],
      actions: [
        {
          type: 'resource',
          target: alert.type,
          operation: 'emergency-cleanup',
          parameters: { aggressive: true, force: true },
          risk: 'high',
          estimatedImpact: 50
        }
      ],
      cooldown: 60000, // 1 minute
      successRate: 0,
      totalApplications: 0,
      successfulApplications: 0
    };

    this.optimizationRules.set(emergencyRule.id, emergencyRule);
  }

  /**
   * Create optimization rule from suggestion
   */
  private createOptimizationRuleFromSuggestion(suggestion: OptimizationSuggestion): void {
    const rule: OptimizationRule = {
      id: `suggestion-${Date.now()}`,
      name: suggestion.title,
      description: suggestion.description,
      category: this.mapSuggestionCategory(suggestion.category),
      priority: suggestion.impact === 'critical' ? 'critical' : 'high',
      conditions: [
        { metric: `${suggestion.category}.usage`, operator: 'gt', value: 70 }
      ],
      actions: [
        {
          type: 'code',
          target: suggestion.category,
          operation: 'apply-suggestion',
          parameters: { suggestionId: suggestion.id },
          risk: suggestion.effort === 'complex' ? 'high' : 'medium',
          estimatedImpact: suggestion.impact === 'critical' ? 50 : 30
        }
      ],
      cooldown: 300000, // 5 minutes
      successRate: 0,
      totalApplications: 0,
      successfulApplications: 0
    };

    this.optimizationRules.set(rule.id, rule);
  }

  /**
   * Optimize resource allocation
   */
  private async optimizeResourceAllocation(): Promise<void> {
    for (const pool of this.resourcePools.values()) {
      await this.balanceResourcePool(pool);
    }
  }

  /**
   * Balance resource pool
   */
  private async balanceResourcePool(pool: ResourcePool): Promise<void> {
    const utilization = pool.usedCapacity / pool.totalCapacity;

    if (utilization > 0.8) { // Over 80% utilization
      console.log(`⚖️ Balancing resource pool: ${pool.name} (${Math.round(utilization * 100)}% utilized)`);

      // Create swarm task for resource optimization
      const task = {
        id: `resource-balance-${pool.id}-${Date.now()}`,
        type: 'resource-optimization' as const,
        description: `Balance resource pool: ${pool.name}`,
        requirements: ['resource-analysis', 'load-balancing'],
        priority: 'medium',
        deadline: new Date(Date.now() + 600000), // 10 minutes
        assignedAgent: 'optimizer'
      };

      await this.swarmOrchestrator.submitTask(task);
    }
  }

  /**
   * Update cache strategies
   */
  private updateCacheStrategies(): void {
    for (const strategy of this.cacheStrategies.values()) {
      // Update hit/miss rates based on performance metrics
      const networkMetrics = this.performanceMonitor.getMetrics();
      if (networkMetrics.length > 0) {
        const latest = networkMetrics[networkMetrics.length - 1];
        strategy.hitRate = latest.network?.cacheHitRatio || 0;
        strategy.missRate = 1 - strategy.hitRate;
      }
    }
  }

  /**
   * Perform health checks
   */
  private performHealthChecks(): void {
    
    // Check optimization rules health
    for (const rule of this.optimizationRules.values()) {
      if (rule.totalApplications > 0 && rule.successRate < 0.5) {
        console.warn(`⚠️ Low success rate for optimization rule: ${rule.name} (${Math.round(rule.successRate * 100)}%)`);
      }
    }

    // Check resource pools health
    for (const pool of this.resourcePools.values()) {
      const utilization = pool.usedCapacity / pool.totalCapacity;
      if (utilization > 0.9) {
        console.warn(`⚠️ High resource utilization: ${pool.name} (${Math.round(utilization * 100)}%)`);
      }
    }

    this.emit('health-check-completed', { timestamp: Date.now() });
  }

  /**
   * Analyze performance trends
   */
  private analyzePerformanceTrends(metrics: any): void {
    // Use AI to analyze performance trends and predict issues
    const trends = this.identifyPerformanceTrends(metrics);

    if (trends.length > 0) {
      
      // Create predictive optimization rules
      this.createPredictiveOptimizations(trends);
    }
  }

  /**
   * Identify performance trends
   */
  private identifyPerformanceTrends(metrics: any): string[] {
    const trends: string[] = [];

    // Analyze memory trend
    if (metrics.memory?.heapUsed > 100 * 1024 * 1024) { // > 100MB
      trends.push('memory-increasing');
    }

    // Analyze CPU trend
    if (metrics.cpu?.usage > 80) {
      trends.push('cpu-high');
    }

    // Analyze network trend
    if (metrics.network?.averageResponseTime > 1000) {
      trends.push('network-slow');
    }

    return trends;
  }

  /**
   * Create predictive optimizations
   */
  private createPredictiveOptimizations(trends: string[]): void {
    for (const trend of trends) {
      const predictiveRule: OptimizationRule = {
        id: `predictive-${trend}-${Date.now()}`,
        name: `Predictive: ${trend.replace('-', ' ')}`,
        description: `Predictive optimization for ${trend} trend`,
        category: trend.includes('memory') ? 'memory' : trend.includes('cpu') ? 'cpu' : 'network',
        priority: 'medium',
        conditions: [
          { metric: trend.includes('memory') ? 'memory.heapUsed' : 'cpu.usage', operator: 'gt', value: 70 }
        ],
        actions: [
          {
            type: 'resource',
            target: trend,
            operation: 'predictive-optimization',
            parameters: { trend, proactive: true },
            risk: 'low',
            estimatedImpact: 25
          }
        ],
        cooldown: 600000, // 10 minutes
        successRate: 0,
        totalApplications: 0,
        successfulApplications: 0
      };

      this.optimizationRules.set(predictiveRule.id, predictiveRule);
    }
  }

  /**
   * Handle optimization result from swarm
   */
  private handleOptimizationResult(result: any): void {
    
    // Update optimization statistics
    const rule = this.optimizationRules.get(result.ruleId);
    if (rule) {
      rule.totalApplications++;
      if (result.success) {
        rule.successfulApplications++;
      }
      rule.successRate = rule.successfulApplications / rule.totalApplications;
    }
  }

  // Public API methods
  getOptimizationRules(): OptimizationRule[] {
    return Array.from(this.optimizationRules.values());
  }

  getPerformanceProfiles(): PerformanceProfile[] {
    return Array.from(this.performanceProfiles.values());
  }

  getResourcePools(): ResourcePool[] {
    return Array.from(this.resourcePools.values());
  }

  getCacheStrategies(): CacheStrategy[] {
    return Array.from(this.cacheStrategies.values());
  }

  getOptimizationHistory(ruleId?: string): OptimizationResult[] {
    if (ruleId) {
      return this.activeOptimizations.get(ruleId) || [];
    }
    return Array.from(this.activeOptimizations.values()).flat();
  }

  setActiveProfile(profileId: string): void {
    // Deactivate all profiles
    for (const profile of this.performanceProfiles.values()) {
      profile.active = false;
    }

    // Activate selected profile
    const profile = this.performanceProfiles.get(profileId);
    if (profile) {
      profile.active = true;
      
      this.emit('profile-changed', profile);
    }
  }

  createCustomRule(rule: Omit<OptimizationRule, 'successRate' | 'totalApplications' | 'successfulApplications'>): string {
    const customRule: OptimizationRule = {
      ...rule,
      successRate: 0,
      totalApplications: 0,
      successfulApplications: 0
    };

    this.optimizationRules.set(customRule.id, customRule);
    
    this.emit('rule-created', customRule);

    return customRule.id;
  }

  removeRule(ruleId: string): void {
    if (this.optimizationRules.delete(ruleId)) {
      
      this.emit('rule-removed', ruleId);
    }
  }

  getSystemStatus(): {
    isOptimizing: boolean;
    lastOptimizationRun: number;
    activeRules: number;
    totalOptimizations: number;
    averageSuccessRate: number;
  } {
    const totalOptimizations = Array.from(this.optimizationRules.values())
      .reduce((sum, rule) => sum + rule.totalApplications, 0);

    const totalSuccessRate = Array.from(this.optimizationRules.values())
      .reduce((sum, rule) => sum + (rule.successRate * rule.totalApplications), 0);

    const averageSuccessRate = totalOptimizations > 0 ? totalSuccessRate / totalOptimizations : 0;

    return {
      isOptimizing: this.isOptimizing,
      lastOptimizationRun: this.lastOptimizationRun,
      activeRules: this.optimizationRules.size,
      totalOptimizations,
      averageSuccessRate
    };
  }

  stop(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.isOptimizing = false;
    
  }
}

export default PerformanceOptimizationEngine;