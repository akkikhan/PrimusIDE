/* Code Quality Analytics Integration - Seamless IDE integration and workflow automation */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { 
  Settings, Play, Pause, RotateCcw, Download, Upload, Bell, BellOff,
  AlertTriangle, CheckCircle, Info, Clock, Zap, Target, FileText,
  BarChart3, TrendingUp, Shield, Code, Layers, Activity, GitBranch
} from 'lucide-react';
import CodeQualityAnalytics, { 
  CodeAnalysisSettings, QualityScore, TechnicalDebt, AnalysisProgress,
  CodeMetrics, RefactoringSuggestion
} from '../services/CodeQualityAnalytics';
import QualityDashboard from './QualityDashboard';

interface QualityIntegrationProps {
  workspacePath: string;
  onOpenFile?: (filePath: string) => void;
  onNavigateToLine?: (filePath: string, line: number) => void;
  onShowRecommendation?: (suggestion: RefactoringSuggestion) => void;
}

interface NotificationState {
  id: string;
  type: 'quality_change' | 'debt_increase' | 'analysis_complete' | 'recommendation';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  actionable: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline';
}

interface QualityMetricsState {
  currentScore: number;
  previousScore: number;
  trend: 'improving' | 'stable' | 'declining';
  lastAnalysis: Date | null;
  analysisCount: number;
  autoAnalysisEnabled: boolean;
}

interface IntegrationSettings {
  autoAnalysis: boolean;
  analysisInterval: number; // minutes
  qualityGateEnabled: boolean;
  notificationsEnabled: boolean;
  notificationTypes: {
    qualityChanges: boolean;
    debtIncrease: boolean;
    analysisComplete: boolean;
    recommendations: boolean;
  };
  thresholds: {
    qualityScoreThreshold: number;
    debtThreshold: number;
    complexityThreshold: number;
    coverageThreshold: number;
  };
  automation: {
    autoFixEnabled: boolean;
    autoRefactorEnabled: boolean;
    autoOptimizeEnabled: boolean;
  };
}

const QualityIntegration: React.FC<QualityIntegrationProps> = ({
  workspacePath,
  onOpenFile,
  onNavigateToLine,
  onShowRecommendation
}) => {
  // Core state
  const [analytics] = useState(() => new CodeQualityAnalytics());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Metrics state
  const [metricsState, setMetricsState] = useState<QualityMetricsState>({
    currentScore: 0,
    previousScore: 0,
    trend: 'stable',
    lastAnalysis: null,
    analysisCount: 0,
    autoAnalysisEnabled: false
  });

  // Integration settings
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
    autoAnalysis: false,
    analysisInterval: 30,
    qualityGateEnabled: true,
    notificationsEnabled: true,
    notificationTypes: {
      qualityChanges: true,
      debtIncrease: true,
      analysisComplete: true,
      recommendations: true
    },
    thresholds: {
      qualityScoreThreshold: 70,
      debtThreshold: 480, // 8 hours
      complexityThreshold: 15,
      coverageThreshold: 80
    },
    automation: {
      autoFixEnabled: false,
      autoRefactorEnabled: false,
      autoOptimizeEnabled: false
    }
  });

  // UI state
  const [activeView, setActiveView] = useState<'dashboard' | 'settings' | 'notifications'>('dashboard');
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState({
    analysisTime: 0,
    filesAnalyzed: 0,
    issuesFound: 0,
    issuesResolved: 0
  });

  // Auto-analysis timer
  const [autoAnalysisTimer, setAutoAnalysisTimer] = useState<NodeJS.Timeout | null>(null);

  // Initialize integration
  useEffect(() => {
    initializeIntegration();
    setupEventListeners();
    loadSettings();
    
    return () => {
      cleanup();
    };
  }, [workspacePath]);

  // Initialize integration
  const initializeIntegration = async () => {
    try {
      
      // Load cached analysis if available
      const cached = analytics.getAnalysisCache();
      if (cached.size > 0) {
        updateMetricsFromCache(cached);
      }

      setIsInitialized(true);
      
      // Show initialization notification
      addNotification({
        type: 'analysis_complete',
        title: 'Quality Analytics Ready',
        message: 'Code quality monitoring is now active for your workspace.',
        severity: 'success',
        actionable: false
      });

    } catch (error) {
      console.error('❌ Failed to initialize Quality Integration:', error);
      
      addNotification({
        type: 'analysis_complete',
        title: 'Initialization Failed',
        message: 'Failed to initialize code quality analytics. Please check configuration.',
        severity: 'error',
        actionable: false
      });
    }
  };

  // Setup event listeners
  const setupEventListeners = () => {
    analytics.on('workspace-analyzed', handleWorkspaceAnalyzed);
    analytics.on('file-analyzed', handleFileAnalyzed);
    analytics.on('analysis-progress', handleAnalysisProgress);
    analytics.on('settings-updated', handleSettingsUpdated);

    // Listen for file changes in workspace (mock implementation)
    if (integrationSettings.autoAnalysis) {
      setupAutoAnalysis();
    }
  };

  // Handle workspace analysis complete
  const handleWorkspaceAnalyzed = useCallback((results: Map<string, CodeMetrics>) => {
    
    updateMetricsFromResults(results);
    setIsAnalyzing(false);
    
    // Update session metrics
    setSessionMetrics(prev => ({
      ...prev,
      analysisTime: Date.now(),
      filesAnalyzed: results.size,
      issuesFound: Array.from(results.values()).reduce((sum, m) => sum + m.codeSmells.length + m.technicalDebt.issues.length, 0)
    }));

    // Show completion notification
    if (integrationSettings.notificationsEnabled && integrationSettings.notificationTypes.analysisComplete) {
      addNotification({
        type: 'analysis_complete',
        title: 'Analysis Complete',
        message: `Analyzed ${results.size} files. Click to view detailed results.`,
        severity: 'success',
        actionable: true,
        actions: [
          {
            label: 'View Results',
            action: () => setActiveView('dashboard')
          }
        ]
      });
    }

    // Check quality gates
    if (integrationSettings.qualityGateEnabled) {
      checkQualityGates(results);
    }

    // Generate recommendations
    generateAutomaticRecommendations(results);
  }, [integrationSettings]);

  // Handle file analysis
  const handleFileAnalyzed = useCallback((metrics: CodeMetrics) => {
    
    // Check for critical issues
    const criticalIssues = metrics.technicalDebt.issues.filter(i => i.severity === 'critical' || i.severity === 'blocker');
    
    if (criticalIssues.length > 0 && integrationSettings.notificationsEnabled) {
      addNotification({
        type: 'debt_increase',
        title: 'Critical Issues Found',
        message: `Found ${criticalIssues.length} critical issues in ${metrics.file}`,
        severity: 'error',
        actionable: true,
        actions: [
          {
            label: 'Open File',
            action: () => onOpenFile?.(metrics.file)
          },
          {
            label: 'View Issues',
            action: () => setActiveView('dashboard')
          }
        ]
      });
    }
  }, [integrationSettings, onOpenFile]);

  // Handle analysis progress
  const handleAnalysisProgress = useCallback((progress: AnalysisProgress) => {
    setAnalysisProgress(progress);
  }, []);

  // Handle settings updated
  const handleSettingsUpdated = useCallback(() => {
    
  }, []);

  // Update metrics from results
  const updateMetricsFromResults = (results: Map<string, CodeMetrics>) => {
    const metrics = Array.from(results.values());
    const currentScore = metrics.reduce((sum, m) => sum + m.qualityScore.overall_score, 0) / metrics.length;
    
    setMetricsState(prev => {
      const trend = currentScore > prev.currentScore ? 'improving' : 
                   currentScore < prev.currentScore ? 'declining' : 'stable';
      
      return {
        currentScore: Math.round(currentScore),
        previousScore: prev.currentScore,
        trend,
        lastAnalysis: new Date(),
        analysisCount: prev.analysisCount + 1,
        autoAnalysisEnabled: prev.autoAnalysisEnabled
      };
    });
  };

  // Update metrics from cache
  const updateMetricsFromCache = (cache: Map<string, CodeMetrics>) => {
    updateMetricsFromResults(cache);
  };

  // Check quality gates
  const checkQualityGates = (results: Map<string, CodeMetrics>) => {
    const metrics = Array.from(results.values());
    const avgScore = metrics.reduce((sum, m) => sum + m.qualityScore.overall_score, 0) / metrics.length;
    const totalDebt = metrics.reduce((sum, m) => sum + m.technicalDebt.totalMinutes, 0);
    const avgComplexity = metrics.reduce((sum, m) => sum + m.cyclomaticComplexity, 0) / metrics.length;
    const avgCoverage = metrics.reduce((sum, m) => sum + m.testCoverage.total_coverage, 0) / metrics.length;

    const gates = [];
    
    if (avgScore < integrationSettings.thresholds.qualityScoreThreshold) {
      gates.push(`Quality score (${Math.round(avgScore)}) below threshold (${integrationSettings.thresholds.qualityScoreThreshold})`);
    }
    
    if (totalDebt > integrationSettings.thresholds.debtThreshold) {
      gates.push(`Technical debt (${Math.round(totalDebt / 60)}h) exceeds threshold (${Math.round(integrationSettings.thresholds.debtThreshold / 60)}h)`);
    }
    
    if (avgComplexity > integrationSettings.thresholds.complexityThreshold) {
      gates.push(`Average complexity (${avgComplexity.toFixed(1)}) exceeds threshold (${integrationSettings.thresholds.complexityThreshold})`);
    }
    
    if (avgCoverage < integrationSettings.thresholds.coverageThreshold) {
      gates.push(`Test coverage (${Math.round(avgCoverage)}%) below threshold (${integrationSettings.thresholds.coverageThreshold}%)`);
    }

    if (gates.length > 0) {
      addNotification({
        type: 'quality_change',
        title: 'Quality Gates Failed',
        message: `${gates.length} quality gates failed. Click to view details.`,
        severity: 'warning',
        actionable: true,
        actions: [
          {
            label: 'View Details',
            action: () => setActiveView('dashboard')
          },
          {
            label: 'Settings',
            action: () => setShowSettings(true)
          }
        ]
      });
    }
  };

  // Generate automatic recommendations
  const generateAutomaticRecommendations = async (results: Map<string, CodeMetrics>) => {
    try {
      const recommendations = await analytics.getQualityRecommendations();
      const highImpactRecs = recommendations.filter(r => r.impact === 'high').slice(0, 3);
      
      if (highImpactRecs.length > 0 && integrationSettings.notificationsEnabled && integrationSettings.notificationTypes.recommendations) {
        addNotification({
          type: 'recommendation',
          title: 'Quality Recommendations Available',
          message: `${highImpactRecs.length} high-impact recommendations ready for review.`,
          severity: 'info',
          actionable: true,
          actions: [
            {
              label: 'View Recommendations',
              action: () => setActiveView('dashboard')
            }
          ]
        });
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    }
  };

  // Setup auto-analysis
  const setupAutoAnalysis = () => {
    if (autoAnalysisTimer) {
      clearInterval(autoAnalysisTimer);
    }

    if (integrationSettings.autoAnalysis) {
      const timer = setInterval(() => {
        handleAnalyzeWorkspace();
      }, integrationSettings.analysisInterval * 60 * 1000);
      
      setAutoAnalysisTimer(timer);
    }
  };

  // Handle workspace analysis
  const handleAnalyzeWorkspace = async () => {
    if (isAnalyzing) return;
    
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
    } catch (error) {
      console.error('Analysis failed:', error);
      setIsAnalyzing(false);
      
      addNotification({
        type: 'analysis_complete',
        title: 'Analysis Failed',
        message: 'Workspace analysis failed. Please check logs for details.',
        severity: 'error',
        actionable: false
      });
    }
  };

  // Add notification
  const addNotification = (notification: Omit<NotificationState, 'id' | 'timestamp'>) => {
    const newNotification: NotificationState = {
      ...notification,
      id: `notification-${Date.now()}`,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 10)); // Keep last 10
  };

  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Update integration settings
  const updateIntegrationSettings = (updates: Partial<IntegrationSettings>) => {
    setIntegrationSettings(prev => {
      const newSettings = { ...prev, ...updates };
      saveSettings(newSettings);
      
      // Update auto-analysis if changed
      if (updates.autoAnalysis !== undefined || updates.analysisInterval !== undefined) {
        setupAutoAnalysis();
      }
      
      return newSettings;
    });
  };

  // Load settings from storage
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('quality-integration-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        setIntegrationSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // Save settings to storage
  const saveSettings = (settings: IntegrationSettings) => {
    try {
      localStorage.setItem('quality-integration-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  // Export analysis results
  const exportAnalysisResults = async () => {
    try {
      const results = analytics.getAnalysisCache();
      const debt = await analytics.getTechnicalDebt();
      const recommendations = await analytics.getQualityRecommendations();
      
      const exportData = {
        timestamp: new Date().toISOString(),
        workspace: workspacePath,
        summary: {
          totalFiles: results.size,
          averageQuality: metricsState.currentScore,
          technicalDebtHours: Math.round(debt?.totalMinutes || 0 / 60 * 10) / 10,
          recommendationsCount: recommendations.length
        },
        metrics: Array.from(results.entries()),
        technicalDebt: debt,
        recommendations,
        settings: integrationSettings
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `quality-analysis-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        type: 'analysis_complete',
        title: 'Export Complete',
        message: 'Analysis results exported successfully.',
        severity: 'success',
        actionable: false
      });
    } catch (error) {
      console.error('Export failed:', error);
      
      addNotification({
        type: 'analysis_complete',
        title: 'Export Failed',
        message: 'Failed to export analysis results.',
        severity: 'error',
        actionable: false
      });
    }
  };

  // Cleanup
  const cleanup = () => {
    if (autoAnalysisTimer) {
      clearInterval(autoAnalysisTimer);
    }
    analytics.removeAllListeners();
  };

  // Get notification icon
  const getNotificationIcon = (type: NotificationState['type'], severity: NotificationState['severity']) => {
    if (severity === 'error') return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    if (severity === 'success') return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <Info className="h-4 w-4 text-blue-600" />;
  };

  // Get trend icon
  const getTrendIcon = (trend: QualityMetricsState['trend']) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-600 transform rotate-180" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Initializing Quality Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quality-integration h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Quality Analytics</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant={metricsState.trend === 'improving' ? 'default' : metricsState.trend === 'declining' ? 'destructive' : 'secondary'}>
              {getTrendIcon(metricsState.trend)}
              <span className="ml-1">Score: {metricsState.currentScore}</span>
            </Badge>
            
            {integrationSettings.autoAnalysis && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                Auto-Analysis
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)} className="w-auto">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="notifications" className="relative">
                Notifications
                {notifications.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            onClick={handleAnalyzeWorkspace}
            disabled={isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Analyze
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeView} onValueChange={(value: string) => setActiveView(value as 'dashboard' | 'settings' | 'notifications')} className="h-full">
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="h-full m-0">
            <QualityDashboard
              analytics={analytics}
              workspacePath={workspacePath}
              onAnalyzeWorkspace={handleAnalyzeWorkspace}
              onAnalyzeFile={(file) => analytics.analyzeFile(file, '')}
            />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="h-full m-0 p-4">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={clearAllNotifications}>
                    Clear All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateIntegrationSettings({ 
                      notificationsEnabled: !integrationSettings.notificationsEnabled 
                    })}
                  >
                    {integrationSettings.notificationsEnabled ? (
                      <>
                        <BellOff className="h-4 w-4 mr-2" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4 mr-2" />
                        Enable
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Bell className="h-8 w-8 mx-auto mb-2" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <Alert key={notification.id} className="relative">
                      <div className="flex items-start space-x-3">
                        {getNotificationIcon(notification.type, notification.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNotification(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          </div>
                          <AlertDescription className="mt-1">
                            {notification.message}
                          </AlertDescription>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {notification.timestamp.toLocaleTimeString()}
                          </p>
                          {notification.actionable && notification.actions && (
                            <div className="flex items-center space-x-2 mt-3">
                              {notification.actions.map((action, index) => (
                                <Button
                                  key={index}
                                  variant={action.variant || 'outline'}
                                  size="sm"
                                  onClick={action.action}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Alert>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="h-full m-0 p-4">
            <div className="h-full overflow-auto">
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Quality Analytics Settings
                  </h2>
                </div>

                {/* Auto-Analysis Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="h-5 w-5 mr-2" />
                      Auto-Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-analysis">Enable Auto-Analysis</Label>
                      <Switch
                        id="auto-analysis"
                        checked={integrationSettings.autoAnalysis}
                        onCheckedChange={(checked: boolean) => updateIntegrationSettings({ autoAnalysis: checked })}
                      />
                    </div>
                    
                    <div>
                      <Label>Analysis Interval (minutes)</Label>
                      <Slider
                        value={[integrationSettings.analysisInterval]}
                        onValueChange={([value]: number[]) => updateIntegrationSettings({ analysisInterval: value })}
                        max={240}
                        min={5}
                        step={5}
                        className="mt-2"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {integrationSettings.analysisInterval} minutes
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quality Gates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Quality Gates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="quality-gates">Enable Quality Gates</Label>
                      <Switch
                        id="quality-gates"
                        checked={integrationSettings.qualityGateEnabled}
                        onCheckedChange={(checked: boolean) => updateIntegrationSettings({ qualityGateEnabled: checked })}
                      />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label>Minimum Quality Score</Label>
                        <Input
                          type="number"
                          value={integrationSettings.thresholds.qualityScoreThreshold}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateIntegrationSettings({
                            thresholds: {
                              ...integrationSettings.thresholds,
                              qualityScoreThreshold: Number(e.target.value)
                            }
                          })}
                          min={0}
                          max={100}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label>Maximum Technical Debt (minutes)</Label>
                        <Input
                          type="number"
                          value={integrationSettings.thresholds.debtThreshold}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateIntegrationSettings({
                            thresholds: {
                              ...integrationSettings.thresholds,
                              debtThreshold: Number(e.target.value)
                            }
                          })}
                          min={0}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label>Maximum Complexity</Label>
                        <Input
                          type="number"
                          value={integrationSettings.thresholds.complexityThreshold}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateIntegrationSettings({
                            thresholds: {
                              ...integrationSettings.thresholds,
                              complexityThreshold: Number(e.target.value)
                            }
                          })}
                          min={1}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label>Minimum Test Coverage (%)</Label>
                        <Input
                          type="number"
                          value={integrationSettings.thresholds.coverageThreshold}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateIntegrationSettings({
                            thresholds: {
                              ...integrationSettings.thresholds,
                              coverageThreshold: Number(e.target.value)
                            }
                          })}
                          min={0}
                          max={100}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bell className="h-5 w-5 mr-2" />
                      Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifications">Enable Notifications</Label>
                      <Switch
                        id="notifications"
                        checked={integrationSettings.notificationsEnabled}
                        onCheckedChange={(checked: boolean) => updateIntegrationSettings({ notificationsEnabled: checked })}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="quality-changes">Quality Changes</Label>
                        <Switch
                          id="quality-changes"
                          checked={integrationSettings.notificationTypes.qualityChanges}
                          onCheckedChange={(checked: boolean) => updateIntegrationSettings({
                            notificationTypes: {
                              ...integrationSettings.notificationTypes,
                              qualityChanges: checked
                            }
                          })}
                          disabled={!integrationSettings.notificationsEnabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="debt-increase">Technical Debt Increase</Label>
                        <Switch
                          id="debt-increase"
                          checked={integrationSettings.notificationTypes.debtIncrease}
                          onCheckedChange={(checked: boolean) => updateIntegrationSettings({
                            notificationTypes: {
                              ...integrationSettings.notificationTypes,
                              debtIncrease: checked
                            }
                          })}
                          disabled={!integrationSettings.notificationsEnabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="analysis-complete">Analysis Complete</Label>
                        <Switch
                          id="analysis-complete"
                          checked={integrationSettings.notificationTypes.analysisComplete}
                          onCheckedChange={(checked: boolean) => updateIntegrationSettings({
                            notificationTypes: {
                              ...integrationSettings.notificationTypes,
                              analysisComplete: checked
                            }
                          })}
                          disabled={!integrationSettings.notificationsEnabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="recommendations">Recommendations</Label>
                        <Switch
                          id="recommendations"
                          checked={integrationSettings.notificationTypes.recommendations}
                          onCheckedChange={(checked: boolean) => updateIntegrationSettings({
                            notificationTypes: {
                              ...integrationSettings.notificationTypes,
                              recommendations: checked
                            }
                          })}
                          disabled={!integrationSettings.notificationsEnabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Button onClick={exportAnalysisResults} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Results
                      </Button>
                      
                      <Button 
                        onClick={() => analytics.clearCache()} 
                        variant="outline"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Clear Cache
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default QualityIntegration;
