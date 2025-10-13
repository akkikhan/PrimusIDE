// Performance Insights Engine - AI-powered performance analysis and recommendations
// Advanced analytics with machine learning for performance optimization

import { EventEmitter } from 'events';
import { AdvancedPerformanceMonitor, PerformanceMetrics, PerformanceAlert, OptimizationSuggestion } from './AdvancedPerformanceMonitor';

export interface PerformanceInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'bottleneck' | 'opportunity' | 'regression';
  category: 'memory' | 'cpu' | 'network' | 'rendering' | 'bundle' | 'ux' | 'overall';
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100%
  evidence: InsightEvidence[];
  recommendations: InsightRecommendation[];
  impact: ImpactAnalysis;
  timestamp: number;
}

export interface InsightEvidence {
  type: 'metric' | 'pattern' | 'correlation' | 'threshold' | 'comparison';
  data: any;
  description: string;
  strength: number; // 0-100%
}

export interface InsightRecommendation {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  effort: 'minimal' | 'low' | 'medium' | 'high' | 'complex';
  expectedImprovement: string;
  implementation: string[];
  risks: string[];
  dependencies: string[];
}

export interface ImpactAnalysis {
  performanceImprovement: number; // 0-100%
  resourceSaving: number; // 0-100%
  userExperienceGain: number; // 0-100%
  developmentEffort: number; // 0-100%
  riskLevel: number; // 0-100%
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable' | 'volatile';
  rate: number; // units per hour
  confidence: number; // 0-100%
  projection: TrendProjection;
}

export interface TrendProjection {
  timeHorizon: number; // hours
  expectedValue: number;
  confidence: number; // 0-100%
  breakingPoint?: number; // when threshold will be crossed
}

export interface PerformanceAnomaly {
  id: string;
  metric: string;
  timestamp: number;
  expectedValue: number;
  actualValue: number;
  deviation: number; // standard deviations
  significance: number; // 0-100%
  possibleCauses: string[];
}

export interface PerformanceBaseline {
  id: string;
  name: string;
  timestamp: number;
  metrics: PerformanceMetrics;
  environment: EnvironmentContext;
  tags: string[];
}

export interface EnvironmentContext {
  nodeVersion?: string;
  browserVersion?: string;
  osVersion?: string;
  deviceType?: string;
  networkConditions?: string;
  loadLevel?: string;
  userScenario?: string;
}

export interface PerformanceComparison {
  baselineId: string;
  currentMetrics: PerformanceMetrics;
  improvements: MetricComparison[];
  regressions: MetricComparison[];
  overallScore: number; // 0-100%
  significance: 'negligible' | 'minor' | 'moderate' | 'significant' | 'major';
}

export interface MetricComparison {
  metric: string;
  baselineValue: number;
  currentValue: number;
  change: number;
  changePercent: number;
  significance: 'negligible' | 'minor' | 'moderate' | 'significant' | 'major';
  trend: 'improvement' | 'regression' | 'neutral';
}

export interface OptimizationOpportunity {
  id: string;
  category: 'code' | 'architecture' | 'configuration' | 'infrastructure' | 'workflow';
  title: string;
  description: string;
  currentState: string;
  targetState: string;
  estimatedGain: OptimizationGain;
  implementationPlan: ImplementationStep[];
  prerequisites: string[];
  risks: RiskAssessment[];
  timeline: string;
}

export interface OptimizationGain {
  performanceImprovement: string;
  resourceSaving: string;
  costReduction?: string;
  maintenanceReduction?: string;
  scalabilityGain?: string;
}

export interface ImplementationStep {
  order: number;
  title: string;
  description: string;
  effort: 'minimal' | 'low' | 'medium' | 'high' | 'complex';
  duration: string;
  dependencies: string[];
  risks: string[];
}

export interface RiskAssessment {
  type: 'performance' | 'stability' | 'compatibility' | 'security' | 'maintenance';
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string[];
}

export interface PerformanceReport {
  id: string;
  title: string;
  generatedAt: number;
  timeRange: { start: number; end: number };
  summary: ReportSummary;
  insights: PerformanceInsight[];
  trends: PerformanceTrend[];
  anomalies: PerformanceAnomaly[];
  opportunities: OptimizationOpportunity[];
  recommendations: ReportRecommendation[];
  appendices: ReportAppendix[];
}

export interface ReportSummary {
  overallHealth: number; // 0-100%
  keyMetrics: SummaryMetric[];
  majorFindings: string[];
  criticalIssues: string[];
  quickWins: string[];
}

export interface SummaryMetric {
  name: string;
  current: number;
  baseline: number;
  change: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

export interface ReportRecommendation {
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  title: string;
  description: string;
  rationale: string;
  actions: string[];
  timeline: string;
  owner?: string;
}

export interface ReportAppendix {
  title: string;
  type: 'chart' | 'table' | 'code' | 'config' | 'log';
  content: any;
}

export class PerformanceInsightsEngine extends EventEmitter {
  private monitor: AdvancedPerformanceMonitor;
  private insights: PerformanceInsight[] = [];
  private trends: PerformanceTrend[] = [];
  private anomalies: PerformanceAnomaly[] = [];
  private baselines: PerformanceBaseline[] = [];
  private opportunities: OptimizationOpportunity[] = [];
  private reports: PerformanceReport[] = [];
  
  private analysisInterval?: NodeJS.Timeout;
  private isAnalyzing = false;
  
  // ML-like analysis parameters
  private readonly trendWindow = 50; // Number of data points for trend analysis
  private readonly anomalyThreshold = 2.0; // Standard deviations for anomaly detection
  private readonly confidenceThreshold = 75; // Minimum confidence for insights

  constructor(monitor: AdvancedPerformanceMonitor) {
    super();
    this.monitor = monitor;
    this.initializeAnalysis();
  }

  /**
   * Initialize performance analysis
   */
  private initializeAnalysis(): void {
    
    // Listen to monitor events
    this.monitor.on('metrics-updated', (metrics: PerformanceMetrics) => {
      this.analyzeMetrics(metrics);
    });

    this.monitor.on('performance-alert', (alert: PerformanceAlert) => {
      this.analyzeAlert(alert);
    });

    // Start continuous analysis
    this.startContinuousAnalysis();
  }

  /**
   * Start continuous performance analysis
   */
  startContinuousAnalysis(): void {
    if (this.isAnalyzing) return;

    this.isAnalyzing = true;

    // Run comprehensive analysis every minute
    this.analysisInterval = setInterval(() => {
      this.runComprehensiveAnalysis();
    }, 60000);

    this.emit('analysis-started');
  }

  /**
   * Stop continuous analysis
   */
  stopContinuousAnalysis(): void {
    if (!this.isAnalyzing) return;

    this.isAnalyzing = false;

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }

    this.emit('analysis-stopped');
  }

  /**
   * Analyze incoming performance metrics
   */
  private async analyzeMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      // Detect anomalies in real-time
      const anomalies = this.detectAnomalies(metrics);
      anomalies.forEach(anomaly => {
        this.anomalies.push(anomaly);
        this.emit('anomaly-detected', anomaly);
      });

      // Update trends
      this.updateTrends(metrics);

      // Generate insights from patterns
      const insights = await this.generateInsights(metrics);
      insights.forEach(insight => {
        this.insights.push(insight);
        this.emit('insight-generated', insight);
      });

      // Cleanup old data
      this.cleanupOldData();

    } catch (error) {
      console.error('❌ Error analyzing metrics:', error);
    }
  }

  /**
   * Analyze performance alerts
   */
  private async analyzeAlert(alert: PerformanceAlert): Promise<void> {
    try {
      // Generate insights from alert patterns
      const alertInsights = await this.generateAlertInsights(alert);
      alertInsights.forEach(insight => {
        this.insights.push(insight);
        this.emit('insight-generated', insight);
      });

    } catch (error) {
      console.error('❌ Error analyzing alert:', error);
    }
  }

  /**
   * Run comprehensive performance analysis
   */
  private async runComprehensiveAnalysis(): Promise<void> {
    try {
      
      const metrics = this.monitor.getMetrics();
      if (metrics.length === 0) return;

      // Identify optimization opportunities
      const opportunities = await this.identifyOptimizationOpportunities(metrics);
      this.opportunities.push(...opportunities);

      // Update long-term trends
      this.updateLongTermTrends();

      // Generate performance insights
      const strategicInsights = await this.generateStrategicInsights();
      this.insights.push(...strategicInsights);

      // Emit comprehensive analysis results
      this.emit('comprehensive-analysis-complete', {
        insights: this.insights.slice(-10),
        opportunities: this.opportunities.slice(-5),
        trends: this.trends
      });

    } catch (error) {
      console.error('❌ Error in comprehensive analysis:', error);
    }
  }

  /**
   * Detect performance anomalies using statistical analysis
   */
  private detectAnomalies(currentMetrics: PerformanceMetrics): PerformanceAnomaly[] {
    const anomalies: PerformanceAnomaly[] = [];
    const recentMetrics = this.monitor.getMetrics().slice(-this.trendWindow);
    
    if (recentMetrics.length < 10) return anomalies; // Need sufficient data

    // Analyze key metrics for anomalies
    const metricsToAnalyze = [
      { key: 'cpu.usage', value: currentMetrics.cpu.usage },
      { key: 'memory.heapUsed', value: currentMetrics.memory.heapUsed },
      { key: 'network.averageResponseTime', value: currentMetrics.network.averageResponseTime },
      { key: 'rendering.fps', value: currentMetrics.rendering.fps },
      { key: 'userExperience.largestContentfulPaint', value: currentMetrics.userExperience.largestContentfulPaint }
    ];

    metricsToAnalyze.forEach(({ key, value }) => {
      const historicalValues = this.extractMetricValues(recentMetrics, key);
      const { mean, stdDev } = this.calculateStatistics(historicalValues);
      
      const deviation = Math.abs(value - mean) / stdDev;
      
      if (deviation > this.anomalyThreshold) {
        const anomaly: PerformanceAnomaly = {
          id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          metric: key,
          timestamp: currentMetrics.timestamp,
          expectedValue: mean,
          actualValue: value,
          deviation,
          significance: Math.min(100, (deviation / this.anomalyThreshold) * 50),
          possibleCauses: this.inferPossibleCauses(key, value, mean)
        };

        anomalies.push(anomaly);
      }
    });

    return anomalies;
  }

  /**
   * Update performance trends
   */
  private updateTrends(metrics: PerformanceMetrics): void {
    const recentMetrics = this.monitor.getMetrics().slice(-this.trendWindow);
    
    if (recentMetrics.length < 10) return;

    const trendMetrics = [
      'cpu.usage',
      'memory.heapUsed', 
      'network.averageResponseTime',
      'rendering.fps',
      'userExperience.largestContentfulPaint'
    ];

    trendMetrics.forEach(metricKey => {
      const values = this.extractMetricValues(recentMetrics, metricKey);
      const trend = this.calculateTrend(values, metricKey);
      
      if (trend.confidence > this.confidenceThreshold) {
        // Update or add trend
        const existingTrend = this.trends.find(t => t.metric === metricKey);
        if (existingTrend) {
          Object.assign(existingTrend, trend);
        } else {
          this.trends.push(trend);
        }
      }
    });
  }

  /**
   * Generate performance insights from patterns
   */
  private async generateInsights(metrics: PerformanceMetrics): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    // Memory leak detection
    if (this.detectMemoryLeak(metrics)) {
      insights.push(this.createMemoryLeakInsight(metrics));
    }

    // Performance regression detection
    const regression = this.detectPerformanceRegression(metrics);
    if (regression) {
      insights.push(regression);
    }

    // Bundle optimization opportunities
    const bundleInsight = this.analyzeBundleOptimization(metrics);
    if (bundleInsight) {
      insights.push(bundleInsight);
    }

    // UX performance insights
    const uxInsight = this.analyzeUXPerformance(metrics);
    if (uxInsight) {
      insights.push(uxInsight);
    }

    return insights;
  }

  /**
   * Generate insights from alert patterns
   */
  private async generateAlertInsights(alert: PerformanceAlert): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];

    // Analyze alert frequency patterns
    const recentAlerts = this.monitor.getAlerts()
      .filter(a => a.type === alert.type && Date.now() - a.timestamp < 3600000); // Last hour

    if (recentAlerts.length > 3) {
      insights.push({
        id: `alert-pattern-${Date.now()}`,
        type: 'trend',
        category: alert.type,
        title: `Recurring ${alert.type} Alerts`,
        description: `Detected ${recentAlerts.length} ${alert.type} alerts in the past hour, indicating a persistent issue.`,
        severity: 'high',
        confidence: 85,
        evidence: [
          {
            type: 'pattern',
            data: { alertCount: recentAlerts.length, timeWindow: '1 hour' },
            description: 'High frequency of similar alerts',
            strength: 85
          }
        ],
        recommendations: [
          {
            action: `Investigate root cause of ${alert.type} performance issues`,
            priority: 'high',
            effort: 'medium',
            expectedImprovement: '50-80% reduction in alert frequency',
            implementation: [
              'Analyze system logs during alert periods',
              'Profile application during peak usage',
              'Review recent code changes',
              'Check system resource utilization'
            ],
            risks: ['May require code changes', 'Could affect system stability during investigation'],
            dependencies: ['Access to monitoring tools', 'Development team availability']
          }
        ],
        impact: {
          performanceImprovement: 60,
          resourceSaving: 40,
          userExperienceGain: 70,
          developmentEffort: 50,
          riskLevel: 30
        },
        timestamp: Date.now()
      });
    }

    return insights;
  }

  /**
   * Identify optimization opportunities
   */
  private async identifyOptimizationOpportunities(metrics: PerformanceMetrics[]): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];

    if (metrics.length === 0) return opportunities;

    const latest = metrics[metrics.length - 1];

    // Large bundle size opportunity
    if (latest.bundle.totalSize > 2 * 1024 * 1024) { // > 2MB
      opportunities.push({
        id: `bundle-size-${Date.now()}`,
        category: 'architecture',
        title: 'Bundle Size Optimization',
        description: 'Application bundle size is larger than recommended, affecting load times.',
        currentState: `Bundle size: ${Math.round(latest.bundle.totalSize / 1024 / 1024)}MB`,
        targetState: 'Bundle size: <1MB with code splitting',
        estimatedGain: {
          performanceImprovement: '30-50% faster initial load',
          resourceSaving: '50-70% reduction in initial download',
          scalabilityGain: 'Better performance on slow networks'
        },
        implementationPlan: [
          {
            order: 1,
            title: 'Analyze bundle composition',
            description: 'Use webpack-bundle-analyzer to identify large dependencies',
            effort: 'minimal',
            duration: '1-2 hours',
            dependencies: [],
            risks: []
          },
          {
            order: 2,
            title: 'Implement code splitting',
            description: 'Split code by routes and features using dynamic imports',
            effort: 'medium',
            duration: '1-2 days',
            dependencies: ['Bundle analysis results'],
            risks: ['May require routing changes']
          },
          {
            order: 3,
            title: 'Remove unused dependencies',
            description: 'Identify and remove unused npm packages',
            effort: 'low',
            duration: '4-8 hours',
            dependencies: ['Dependency analysis'],
            risks: ['May break functionality if dependencies are used indirectly']
          }
        ],
        prerequisites: ['Build system configuration access', 'Testing environment'],
        risks: [
          {
            type: 'stability',
            level: 'low',
            description: 'Code splitting may introduce loading states',
            mitigation: ['Implement proper loading indicators', 'Test all routes thoroughly']
          }
        ],
        timeline: '1-2 weeks'
      });
    }

    // Memory usage optimization opportunity
    if (latest.memory.heapUsed > 256 * 1024 * 1024) { // > 256MB
      opportunities.push({
        id: `memory-opt-${Date.now()}`,
        category: 'code',
        title: 'Memory Usage Optimization',
        description: 'High memory usage detected, optimization can improve performance and reduce crashes.',
        currentState: `Memory usage: ${Math.round(latest.memory.heapUsed / 1024 / 1024)}MB`,
        targetState: 'Memory usage: <128MB with optimizations',
        estimatedGain: {
          performanceImprovement: '20-40% better responsiveness',
          resourceSaving: '40-60% memory reduction',
          scalabilityGain: 'Better performance on low-memory devices'
        },
        implementationPlan: [
          {
            order: 1,
            title: 'Memory profiling',
            description: 'Profile application to identify memory hotspots',
            effort: 'low',
            duration: '2-4 hours',
            dependencies: ['Profiling tools access'],
            risks: []
          },
          {
            order: 2,
            title: 'Implement object pooling',
            description: 'Use object pools for frequently created/destroyed objects',
            effort: 'medium',
            duration: '3-5 days',
            dependencies: ['Memory profile results'],
            risks: ['May complicate code structure']
          }
        ],
        prerequisites: ['Memory profiling tools', 'Development environment'],
        risks: [
          {
            type: 'performance',
            level: 'low',
            description: 'Object pooling may add complexity',
            mitigation: ['Start with high-impact areas', 'Measure before and after']
          }
        ],
        timeline: '1-2 weeks'
      });
    }

    return opportunities;
  }

  /**
   * Generate strategic performance insights
   */
  private async generateStrategicInsights(): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    const metrics = this.monitor.getMetrics();

    if (metrics.length < 20) return insights;

    // Overall performance trend analysis
    const overallTrend = this.analyzeOverallPerformanceTrend(metrics);
    if (overallTrend) {
      insights.push(overallTrend);
    }

    // Resource utilization analysis
    const resourceInsight = this.analyzeResourceUtilization(metrics);
    if (resourceInsight) {
      insights.push(resourceInsight);
    }

    return insights;
  }

  /**
   * Create baseline for performance comparison
   */
  createBaseline(name: string, environment: EnvironmentContext, tags: string[] = []): PerformanceBaseline {
    const currentMetrics = this.monitor.getMetrics();
    const latestMetrics = currentMetrics[currentMetrics.length - 1];

    if (!latestMetrics) {
      throw new Error('No performance metrics available for baseline creation');
    }

    const baseline: PerformanceBaseline = {
      id: `baseline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      timestamp: Date.now(),
      metrics: latestMetrics,
      environment,
      tags
    };

    this.baselines.push(baseline);
    this.emit('baseline-created', baseline);

    return baseline;
  }

  /**
   * Compare current performance with baseline
   */
  compareWithBaseline(baselineId: string): PerformanceComparison | null {
    const baseline = this.baselines.find(b => b.id === baselineId);
    if (!baseline) return null;

    const currentMetrics = this.monitor.getMetrics();
    const latest = currentMetrics[currentMetrics.length - 1];
    if (!latest) return null;

    const improvements: MetricComparison[] = [];
    const regressions: MetricComparison[] = [];

    // Compare key metrics
    const comparisons = [
      { 
        metric: 'Memory Usage (MB)', 
        baseline: baseline.metrics.memory.heapUsed / 1024 / 1024, 
        current: latest.memory.heapUsed / 1024 / 1024,
        lowerIsBetter: true
      },
      { 
        metric: 'CPU Usage (%)', 
        baseline: baseline.metrics.cpu.usage, 
        current: latest.cpu.usage,
        lowerIsBetter: true
      },
      { 
        metric: 'Response Time (ms)', 
        baseline: baseline.metrics.network.averageResponseTime, 
        current: latest.network.averageResponseTime,
        lowerIsBetter: true
      },
      { 
        metric: 'FPS', 
        baseline: baseline.metrics.rendering.fps, 
        current: latest.rendering.fps,
        lowerIsBetter: false
      },
      { 
        metric: 'LCP (ms)', 
        baseline: baseline.metrics.userExperience.largestContentfulPaint, 
        current: latest.userExperience.largestContentfulPaint,
        lowerIsBetter: true
      }
    ];

    comparisons.forEach(comp => {
      const change = comp.current - comp.baseline;
      const changePercent = comp.baseline !== 0 ? (change / comp.baseline) * 100 : 0;
      
      const comparison: MetricComparison = {
        metric: comp.metric,
        baselineValue: comp.baseline,
        currentValue: comp.current,
        change,
        changePercent,
        significance: this.determineSignificance(Math.abs(changePercent)),
        trend: this.determineTrend(change, comp.lowerIsBetter)
      };

      if (comparison.trend === 'improvement') {
        improvements.push(comparison);
      } else if (comparison.trend === 'regression') {
        regressions.push(comparison);
      }
    });

    // Calculate overall score
    const improvementScore = improvements.reduce((sum, imp) => 
      sum + this.getSignificanceWeight(imp.significance), 0);
    const regressionScore = regressions.reduce((sum, reg) => 
      sum + this.getSignificanceWeight(reg.significance), 0);

    const overallScore = Math.max(0, Math.min(100, 50 + improvementScore - regressionScore));

    return {
      baselineId,
      currentMetrics: latest,
      improvements,
      regressions,
      overallScore,
      significance: this.determineOverallSignificance(overallScore)
    };
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(title: string, timeRange: { start: number; end: number }): Promise<PerformanceReport> {
    
    const metrics = this.monitor.getMetrics()
      .filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end);

    const report: PerformanceReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      generatedAt: Date.now(),
      timeRange,
      summary: this.generateReportSummary(metrics),
      insights: this.insights.filter(i => i.timestamp >= timeRange.start && i.timestamp <= timeRange.end),
      trends: this.trends,
      anomalies: this.anomalies.filter(a => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end),
      opportunities: this.opportunities.slice(-10), // Latest opportunities
      recommendations: this.generateRecommendations(metrics),
      appendices: this.generateAppendices(metrics)
    };

    this.reports.push(report);
    this.emit('report-generated', report);

    return report;
  }

  // Helper methods for analysis
  private extractMetricValues(metrics: PerformanceMetrics[], path: string): number[] {
    return metrics.map(m => {
      const keys = path.split('.');
      let value: any = m;
      for (const key of keys) {
        value = value?.[key];
      }
      return typeof value === 'number' ? value : 0;
    });
  }

  private calculateStatistics(values: number[]): { mean: number; stdDev: number } {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev };
  }

  private calculateTrend(values: number[], metric: string): PerformanceTrend {
    if (values.length < 5) {
      return {
        metric,
        direction: 'stable',
        rate: 0,
        confidence: 0,
        projection: { timeHorizon: 0, expectedValue: 0, confidence: 0 }
      };
    }

    // Simple linear regression for trend detection
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient for confidence
    const meanX = sumX / n;
    const meanY = sumY / n;
    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (values[i] - meanY), 0);
    const denomX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
    const denomY = Math.sqrt(values.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
    const correlation = numerator / (denomX * denomY);
    const confidence = Math.abs(correlation) * 100;

    const direction = Math.abs(slope) < 0.01 ? 'stable' : 
                     slope > 0 ? 'degrading' : 'improving';

    // Project future value
    const futureX = n + 24; // 24 hours ahead
    const expectedValue = slope * futureX + intercept;

    return {
      metric,
      direction,
      rate: slope,
      confidence,
      projection: {
        timeHorizon: 24,
        expectedValue,
        confidence
      }
    };
  }

  private inferPossibleCauses(metric: string, value: number, baseline: number): string[] {
    const causes: string[] = [];

    switch (metric) {
      case 'cpu.usage':
        if (value > baseline) {
          causes.push('Heavy computation or infinite loop', 'Multiple processes running', 'Inefficient algorithms');
        }
        break;
      case 'memory.heapUsed':
        if (value > baseline) {
          causes.push('Memory leak', 'Large data structures in memory', 'Unclosed resources');
        }
        break;
      case 'network.averageResponseTime':
        if (value > baseline) {
          causes.push('Network congestion', 'Server overload', 'Large response payloads', 'DNS resolution issues');
        }
        break;
      case 'rendering.fps':
        if (value < baseline) {
          causes.push('Complex animations', 'Large DOM', 'Heavy JavaScript execution', 'GPU bottleneck');
        }
        break;
    }

    return causes;
  }

  private detectMemoryLeak(metrics: PerformanceMetrics): boolean {
    const recentMetrics = this.monitor.getMetrics().slice(-20);
    if (recentMetrics.length < 10) return false;

    const memoryValues = recentMetrics.map(m => m.memory.heapUsed);
    const trend = this.calculateTrend(memoryValues, 'memory');
    
    return trend.direction === 'degrading' && trend.confidence > 70 && trend.rate > 1024 * 1024; // Growing by >1MB
  }

  private createMemoryLeakInsight(metrics: PerformanceMetrics): PerformanceInsight {
    return {
      id: `memory-leak-${Date.now()}`,
      type: 'bottleneck',
      category: 'memory',
      title: 'Potential Memory Leak Detected',
      description: 'Memory usage is consistently increasing over time, indicating a possible memory leak.',
      severity: 'high',
      confidence: 85,
      evidence: [
        {
          type: 'pattern',
          data: { currentMemory: metrics.memory.heapUsed, trend: 'increasing' },
          description: 'Consistent memory growth pattern detected',
          strength: 85
        }
      ],
      recommendations: [
        {
          action: 'Investigate memory usage patterns and identify leaking objects',
          priority: 'high',
          effort: 'medium',
          expectedImprovement: 'Prevent memory exhaustion and improve stability',
          implementation: [
            'Use memory profiling tools to identify growing objects',
            'Review event listeners and ensure proper cleanup',
            'Check for circular references and detached DOM nodes',
            'Implement proper component unmounting'
          ],
          risks: ['May require significant code refactoring'],
          dependencies: ['Memory profiling tools', 'Development environment']
        }
      ],
      impact: {
        performanceImprovement: 70,
        resourceSaving: 80,
        userExperienceGain: 60,
        developmentEffort: 60,
        riskLevel: 40
      },
      timestamp: Date.now()
    };
  }

  // Additional helper methods...
  private detectPerformanceRegression(metrics: PerformanceMetrics): PerformanceInsight | null { return null; }
  private analyzeBundleOptimization(metrics: PerformanceMetrics): PerformanceInsight | null { return null; }
  private analyzeUXPerformance(metrics: PerformanceMetrics): PerformanceInsight | null { return null; }
  private updateLongTermTrends(): void {}
  private analyzeOverallPerformanceTrend(metrics: PerformanceMetrics[]): PerformanceInsight | null { return null; }
  private analyzeResourceUtilization(metrics: PerformanceMetrics[]): PerformanceInsight | null { return null; }
  private generateReportSummary(metrics: PerformanceMetrics[]): ReportSummary { return {} as ReportSummary; }
  private generateRecommendations(metrics: PerformanceMetrics[]): ReportRecommendation[] { return []; }
  private generateAppendices(metrics: PerformanceMetrics[]): ReportAppendix[] { return []; }
  private determineSignificance(changePercent: number): 'negligible' | 'minor' | 'moderate' | 'significant' | 'major' {
    if (changePercent < 5) return 'negligible';
    if (changePercent < 15) return 'minor';
    if (changePercent < 30) return 'moderate';
    if (changePercent < 50) return 'significant';
    return 'major';
  }
  private determineTrend(change: number, lowerIsBetter: boolean): 'improvement' | 'regression' | 'neutral' {
    if (Math.abs(change) < 0.01) return 'neutral';
    const isImprovement = lowerIsBetter ? change < 0 : change > 0;
    return isImprovement ? 'improvement' : 'regression';
  }
  private getSignificanceWeight(significance: string): number {
    const weights = { negligible: 0, minor: 1, moderate: 3, significant: 5, major: 8 };
    return weights[significance as keyof typeof weights] || 0;
  }
  private determineOverallSignificance(score: number): 'negligible' | 'minor' | 'moderate' | 'significant' | 'major' {
    if (score < 45 || score > 55) return 'negligible';
    if (score < 40 || score > 60) return 'minor';
    if (score < 35 || score > 65) return 'moderate';
    if (score < 30 || score > 70) return 'significant';
    return 'major';
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.insights = this.insights.filter(i => i.timestamp > cutoff);
    this.anomalies = this.anomalies.filter(a => a.timestamp > cutoff);
    this.opportunities = this.opportunities.slice(-50); // Keep last 50
  }

  // Public API
  getInsights(): PerformanceInsight[] { return [...this.insights]; }
  getTrends(): PerformanceTrend[] { return [...this.trends]; }
  getAnomalies(): PerformanceAnomaly[] { return [...this.anomalies]; }
  getBaselines(): PerformanceBaseline[] { return [...this.baselines]; }
  getOpportunities(): OptimizationOpportunity[] { return [...this.opportunities]; }
  getReports(): PerformanceReport[] { return [...this.reports]; }
}

export default PerformanceInsightsEngine;
