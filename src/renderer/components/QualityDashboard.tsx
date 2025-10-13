/* Code Quality Analytics Dashboard - Comprehensive code analysis and quality monitoring interface */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, ScatterChart, Scatter, Treemap
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Code, 
  Bug, Shield, Zap, Target, FileText, GitBranch, Users, Settings,
  RefreshCw, Download, Upload, Filter, Search, Eye, EyeOff,
  BarChart3, PieChart as PieChartIcon, Activity, Layers
} from 'lucide-react';
import CodeQualityAnalytics, { 
  CodeMetrics, TechnicalDebt, CodeSmell, QualityScore, CodeDuplication,
  RefactoringSuggestion, CodeComplexityReport, AnalysisProgress
} from '../services/CodeQualityAnalytics';

interface QualityDashboardProps {
  analytics: CodeQualityAnalytics;
  workspacePath?: string;
  onAnalyzeWorkspace?: () => void;
  onAnalyzeFile?: (file: string) => void;
}

const QualityDashboard: React.FC<QualityDashboardProps> = ({
  analytics,
  workspacePath,
  onAnalyzeWorkspace,
  onAnalyzeFile
}) => {
  // State management
  const [metricsData, setMetricsData] = useState<Map<string, CodeMetrics>>(new Map());
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [technicalDebt, setTechnicalDebt] = useState<TechnicalDebt | null>(null);
  const [qualityTrends, setQualityTrends] = useState<QualityScore[]>([]);
  const [complexityReport, setComplexityReport] = useState<CodeComplexityReport[]>([]);
  const [recommendations, setRecommendations] = useState<RefactoringSuggestion[]>([]);
  const [duplications, setDuplications] = useState<CodeDuplication[]>([]);
  
  // UI state
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'trends'>('overview');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'impact' | 'file'>('severity');
  const [showCodeSmells, setShowCodeSmells] = useState(true);
  const [showDuplications, setShowDuplications] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  // Initialize dashboard
  useEffect(() => {
    setupEventListeners();
    loadInitialData();
    
    return () => {
      analytics.removeAllListeners();
    };
  }, [analytics]);

  // Setup event listeners
  const setupEventListeners = () => {
    analytics.on('workspace-analyzed', (results: Map<string, CodeMetrics>) => {
      setMetricsData(results);
      setIsAnalyzing(false);
      setLastAnalysis(new Date());
      loadDerivedData(results);
    });

    analytics.on('file-analyzed', (metrics: CodeMetrics) => {
      setMetricsData(prev => new Map(prev.set(metrics.file, metrics)));
      loadDerivedData(new Map([[metrics.file, metrics]]));
    });

    analytics.on('analysis-progress', (progress: AnalysisProgress) => {
      setAnalysisProgress(progress);
    });

    analytics.on('settings-updated', () => {
      if (metricsData.size > 0) {
        loadDerivedData(metricsData);
      }
    });

    analytics.on('cache-cleared', () => {
      setMetricsData(new Map());
      setTechnicalDebt(null);
      setQualityTrends([]);
      setComplexityReport([]);
      setRecommendations([]);
      setDuplications([]);
    });
  };

  // Load initial data
  const loadInitialData = async () => {
    try {
      const cached = analytics.getAnalysisCache();
      if (cached.size > 0) {
        setMetricsData(cached);
        await loadDerivedData(cached);
        setLastAnalysis(new Date());
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  // Load derived data
  const loadDerivedData = async (metrics: Map<string, CodeMetrics>) => {
    try {
      const [debt, trends, complexity, recs, dups] = await Promise.all([
        analytics.getTechnicalDebt(),
        Promise.resolve(analytics.getQualityTrends()),
        analytics.getComplexityReport(),
        analytics.getQualityRecommendations(),
        analytics.getDuplicationReport()
      ]);

      setTechnicalDebt(debt);
      setQualityTrends(trends);
      setComplexityReport(complexity);
      setRecommendations(recs);
      setDuplications(dups);
    } catch (error) {
      console.error('Failed to load derived data:', error);
    }
  };

  // Handle workspace analysis
  const handleAnalyzeWorkspace = async () => {
    if (!workspacePath || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress({ 
      stage: 'parsing', 
      progress: 0, 
      current_file: '', 
      files_processed: 0, 
      total_files: 0, 
      elapsed_time: 0, 
      estimated_remaining: 0 
    });
    
    try {
      await analytics.analyzeWorkspace(workspacePath);
      onAnalyzeWorkspace?.();
    } catch (error) {
      console.error('Workspace analysis failed:', error);
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const metrics = Array.from(metricsData.values());
    
    if (metrics.length === 0) {
      return {
        totalFiles: 0,
        totalLOC: 0,
        averageComplexity: 0,
        overallQuality: 0,
        technicalDebtHours: 0,
        codeSmellsCount: 0,
        duplicationsCount: 0,
        testCoverage: 0
      };
    }

    const totalLOC = metrics.reduce((sum, m) => sum + m.linesOfCode, 0);
    const averageComplexity = metrics.reduce((sum, m) => sum + m.cyclomaticComplexity, 0) / metrics.length;
    const overallQuality = metrics.reduce((sum, m) => sum + m.qualityScore.overall_score, 0) / metrics.length;
    const codeSmellsCount = metrics.reduce((sum, m) => sum + m.codeSmells.length, 0);
    const duplicationsCount = metrics.reduce((sum, m) => sum + m.duplications.length, 0);
    const testCoverage = metrics.reduce((sum, m) => sum + m.testCoverage.total_coverage, 0) / metrics.length;

    return {
      totalFiles: metrics.length,
      totalLOC,
      averageComplexity: Math.round(averageComplexity * 10) / 10,
      overallQuality: Math.round(overallQuality),
      technicalDebtHours: technicalDebt ? Math.round(technicalDebt.totalMinutes / 60 * 10) / 10 : 0,
      codeSmellsCount,
      duplicationsCount,
      testCoverage: Math.round(testCoverage)
    };
  }, [metricsData, technicalDebt]);

  // Prepare chart data
  const qualityTrendData = useMemo(() => {
    return qualityTrends.slice(-30).map((score, index) => ({
      index: index + 1,
      overall: score.overall_score,
      maintainability: score.maintainability,
      reliability: score.reliability,
      security: score.security,
      performance: score.performance,
      testQuality: score.test_quality
    }));
  }, [qualityTrends]);

  const complexityDistribution = useMemo(() => {
    const metrics = Array.from(metricsData.values());
    const distribution = { simple: 0, moderate: 0, complex: 0, very_complex: 0 };
    
    metrics.forEach(m => {
      if (m.cyclomaticComplexity <= 5) distribution.simple++;
      else if (m.cyclomaticComplexity <= 10) distribution.moderate++;
      else if (m.cyclomaticComplexity <= 20) distribution.complex++;
      else distribution.very_complex++;
    });

    return [
      { name: 'Simple (≤5)', value: distribution.simple, color: '#10b981' },
      { name: 'Moderate (6-10)', value: distribution.moderate, color: '#f59e0b' },
      { name: 'Complex (11-20)', value: distribution.complex, color: '#f97316' },
      { name: 'Very Complex (>20)', value: distribution.very_complex, color: '#ef4444' }
    ];
  }, [metricsData]);

  const technicalDebtByType = useMemo(() => {
    if (!technicalDebt) return [];
    
    const types = technicalDebt.issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + issue.estimatedMinutes;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(types).map(([type, minutes]) => ({
      type: type.replace('_', ' ').toUpperCase(),
      minutes: Math.round(minutes / 60 * 10) / 10,
      percentage: Math.round((minutes / technicalDebt.totalMinutes) * 100)
    }));
  }, [technicalDebt]);

  // Filter and sort functions
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;
    
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(r => r.impact === filterSeverity);
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'impact':
          const impactOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          return (impactOrder[b.impact] || 0) - (impactOrder[a.impact] || 0);
        case 'file':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [recommendations, filterSeverity, sortBy]);

  // Utility functions
  const getQualityGrade = (score: number): { grade: string; color: string } => {
    if (score >= 90) return { grade: 'A', color: 'text-green-600' };
    if (score >= 80) return { grade: 'B', color: 'text-blue-600' };
    if (score >= 70) return { grade: 'C', color: 'text-yellow-600' };
    if (score >= 60) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      'critical': 'destructive',
      'high': 'destructive',
      'major': 'destructive', 
      'medium': 'default',
      'minor': 'secondary',
      'low': 'secondary',
      'info': 'outline'
    };
    return variants[severity as keyof typeof variants] || 'default';
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="quality-dashboard h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Code Quality Analytics</h1>
          </div>
          
          {lastAnalysis && (
            <Badge variant="outline" className="text-xs">
              Last analyzed: {lastAnalysis.toLocaleTimeString()}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Select value={viewMode} onValueChange={(value: string) => setViewMode(value as 'overview' | 'detailed' | 'trends')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
              <SelectItem value="trends">Trends</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleAnalyzeWorkspace}
            disabled={!workspacePath || isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                Analyze Workspace
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Analysis Progress */}
      {analysisProgress && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {analysisProgress.stage.charAt(0).toUpperCase() + analysisProgress.stage.slice(1)}
            </span>
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {analysisProgress.files_processed} / {analysisProgress.total_files} files
            </span>
          </div>
          <Progress value={analysisProgress.progress} className="h-2" />
          <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mt-1">
            <span>{analysisProgress.current_file}</span>
            <span>
              {Math.round(analysisProgress.elapsed_time / 1000)}s elapsed
              {analysisProgress.estimated_remaining > 0 && 
                ` • ${Math.round(analysisProgress.estimated_remaining / 1000)}s remaining`
              }
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {metricsData.size === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Code className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Analysis Data
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Run a workspace analysis to view code quality metrics and insights.
              </p>
              <Button 
                onClick={handleAnalyzeWorkspace}
                disabled={!workspacePath}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Activity className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
            </div>
          </div>
        ) : (
          <Tabs value={viewMode} onValueChange={(value: string) => setViewMode(value as 'overview' | 'detailed' | 'trends')} className="h-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
              <TabsTrigger value="trends">Quality Trends</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Quality Score</p>
                        <p className={`text-2xl font-bold ${getQualityGrade(summaryStats.overallQuality).color}`}>
                          {summaryStats.overallQuality}
                          <span className="text-lg ml-1">{getQualityGrade(summaryStats.overallQuality).grade}</span>
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Technical Debt</p>
                        <p className="text-2xl font-bold text-red-600">
                          {summaryStats.technicalDebtHours}h
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Complexity</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {summaryStats.averageComplexity}
                        </p>
                      </div>
                      <Layers className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Test Coverage</p>
                        <p className="text-2xl font-bold text-green-600">
                          {summaryStats.testCoverage}%
                        </p>
                      </div>
                      <Shield className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Complexity Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChartIcon className="h-5 w-5 mr-2" />
                      Complexity Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={complexityDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, value }: any) => `${name}: ${Math.round((value / complexityDistribution.reduce((sum, item) => sum + item.value, 0)) * 100)}%`}
                        >
                          {complexityDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Technical Debt by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Technical Debt by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={technicalDebtByType}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value}h`, 'Hours']} />
                        <Bar dataKey="minutes" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Issues and Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Critical Issues */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                      Critical Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {technicalDebt?.issues
                        .filter(issue => issue.severity === 'critical' || issue.severity === 'blocker')
                        .slice(0, 5)
                        .map((issue, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                            <Bug className="h-4 w-4 text-red-600 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {issue.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {issue.file}:{issue.line}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                {issue.description}
                              </p>
                            </div>
                            <Badge variant={getSeverityBadge(issue.severity) as any}>
                              {issue.severity}
                            </Badge>
                          </div>
                        )) || (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          No critical issues found
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="h-5 w-5 mr-2 text-blue-600" />
                      Top Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.slice(0, 5).map((rec, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {rec.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                              {rec.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant={getSeverityBadge(rec.impact) as any}>
                                {rec.impact} impact
                              </Badge>
                              <Badge variant="outline">
                                {rec.effort} effort
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Detailed Analysis Tab */}
            <TabsContent value="detailed" className="space-y-6">
              {/* Filters */}
              <div className="flex items-center space-x-4 mb-6">
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="severity">Severity</SelectItem>
                    <SelectItem value="impact">Impact</SelectItem>
                    <SelectItem value="file">File</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Button
                    variant={showCodeSmells ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowCodeSmells(!showCodeSmells)}
                  >
                    Code Smells
                  </Button>
                  <Button
                    variant={showDuplications ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowDuplications(!showDuplications)}
                  >
                    Duplications
                  </Button>
                </div>
              </div>

              {/* Detailed Tables */}
              <Tabs defaultValue="recommendations" className="w-full">
                <TabsList>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                  <TabsTrigger value="technical-debt">Technical Debt</TabsTrigger>
                  <TabsTrigger value="complexity">Complexity</TabsTrigger>
                  <TabsTrigger value="duplications">Duplications</TabsTrigger>
                </TabsList>

                <TabsContent value="recommendations">
                  <Card>
                    <CardHeader>
                      <CardTitle>Refactoring Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {filteredRecommendations.map((rec, index) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-white">{rec.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{rec.description}</p>
                                <div className="flex items-center space-x-2 mt-3">
                                  <Badge variant={getSeverityBadge(rec.impact) as any}>
                                    {rec.impact} impact
                                  </Badge>
                                  <Badge variant="outline">{rec.effort} effort</Badge>
                                  {rec.automated && <Badge variant="secondary">Automated</Badge>}
                                </div>
                                {rec.benefits && rec.benefits.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Benefits:</p>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 list-disc list-inside">
                                      {rec.benefits.map((benefit, i) => (
                                        <li key={i}>{benefit}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="technical-debt">
                  <Card>
                    <CardHeader>
                      <CardTitle>Technical Debt Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {technicalDebt?.issues.map((issue, index) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium text-gray-900 dark:text-white">{issue.title}</h4>
                                  <Badge variant={getSeverityBadge(issue.severity) as any}>
                                    {issue.severity}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{issue.description}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  {issue.file}:{issue.line} • Estimated: {formatDuration(issue.estimatedMinutes)}
                                </p>
                                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">{issue.suggestion}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="complexity">
                  <Card>
                    <CardHeader>
                      <CardTitle>Complexity Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Array.from(metricsData.entries()).map(([file, metrics]) => (
                          <div key={file} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{file}</h4>
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-300">
                                    Cyclomatic: {metrics.cyclomaticComplexity}
                                  </span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">
                                    Cognitive: {metrics.cognitiveComplexity}
                                  </span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">
                                    Maintainability: {metrics.maintainabilityIndex}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                  {metrics.linesOfCode} LOC
                                </p>
                                <div className={`text-lg font-bold ${getQualityGrade(metrics.qualityScore.overall_score).color}`}>
                                  {getQualityGrade(metrics.qualityScore.overall_score).grade}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="duplications">
                  <Card>
                    <CardHeader>
                      <CardTitle>Code Duplications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {duplications.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                            No code duplications detected
                          </div>
                        ) : (
                          duplications.map((dup, index) => (
                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {dup.type.toUpperCase()} Duplication
                                    </h4>
                                    <Badge variant="outline">
                                      {dup.similarity_percentage}% similar
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    {dup.lines_duplicated} lines duplicated across {dup.locations.length} locations
                                  </p>
                                  <div className="mt-2">
                                    {dup.locations.map((loc, i) => (
                                      <p key={i} className="text-xs text-gray-500 dark:text-gray-400">
                                        {loc.file}:{loc.startLine}-{loc.endLine}
                                      </p>
                                    ))}
                                  </div>
                                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">{dup.suggestion}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Quality Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              {qualityTrendData.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>No trend data available. Run multiple analyses to see quality trends.</p>
                </div>
              ) : (
                <>
                  {/* Quality Score Trends */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2" />
                        Quality Score Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={qualityTrendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="index" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="overall" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            name="Overall Score"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="maintainability" 
                            stroke="#10b981" 
                            name="Maintainability"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="reliability" 
                            stroke="#f59e0b" 
                            name="Reliability"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="security" 
                            stroke="#ef4444" 
                            name="Security"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Radar Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quality Radar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={[qualityTrendData[qualityTrendData.length - 1]]}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar
                            name="Quality Metrics"
                            dataKey="overall"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.3}
                          />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default QualityDashboard;
