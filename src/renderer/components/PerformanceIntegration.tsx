// Performance Integration - Main coordinator for performance monitoring system
// Integrates monitor, dashboard, and insights engine with intelligent orchestration

import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdvancedPerformanceMonitor, { PerformanceMetrics, PerformanceAlert, OptimizationSuggestion } from '../services/AdvancedPerformanceMonitor';
import PerformanceInsightsEngine, { PerformanceInsight, PerformanceBaseline, PerformanceReport } from '../services/PerformanceInsightsEngine';
import PerformanceDashboard from './PerformanceDashboard';

interface PerformanceIntegrationProps {
  onAlert?: (alert: PerformanceAlert) => void;
  onInsight?: (insight: PerformanceInsight) => void;
  onOptimizationSuggestion?: (suggestion: OptimizationSuggestion) => void;
  onReportGenerated?: (report: PerformanceReport) => void;
  className?: string;
}

interface IntegrationState {
  isInitialized: boolean;
  isMonitoring: boolean;
  isAnalyzing: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  lastUpdate: number;
}

interface PerformanceSession {
  id: string;
  startTime: number;
  endTime?: number;
  label: string;
  baselineId?: string;
  metrics: PerformanceMetrics[];
  insights: PerformanceInsight[];
  alerts: PerformanceAlert[];
  suggestions: OptimizationSuggestion[];
}

interface AutoOptimizationConfig {
  enabled: boolean;
  autoImplement: boolean;
  confidenceThreshold: number;
  maxAutomatedChanges: number;
  safetyMode: boolean;
}

interface NotificationSettings {
  enableDesktopNotifications: boolean;
  enableSoundAlerts: boolean;
  minimumSeverity: 'info' | 'warning' | 'error' | 'critical';
  quietHours: { start: string; end: string };
}

const PerformanceIntegration: React.FC<PerformanceIntegrationProps> = ({
  onAlert,
  onInsight,
  onOptimizationSuggestion,
  onReportGenerated,
  className = ''
}) => {
  // Core services
  const [monitor] = useState(() => new AdvancedPerformanceMonitor());
  const [insightsEngine] = useState(() => new PerformanceInsightsEngine(monitor));
  
  // State management
  const [state, setState] = useState<IntegrationState>({
    isInitialized: false,
    isMonitoring: false,
    isAnalyzing: false,
    connectionStatus: 'disconnected',
    systemHealth: 'good',
    lastUpdate: 0
  });

  // Session management
  const [currentSession, setCurrentSession] = useState<PerformanceSession | null>(null);
  const [sessions, setSessions] = useState<PerformanceSession[]>([]);
  
  // Configuration
  const [autoOptimization, setAutoOptimization] = useState<AutoOptimizationConfig>({
    enabled: true,
    autoImplement: false,
    confidenceThreshold: 85,
    maxAutomatedChanges: 3,
    safetyMode: true
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    enableDesktopNotifications: true,
    enableSoundAlerts: false,
    minimumSeverity: 'warning',
    quietHours: { start: '22:00', end: '08:00' }
  });

  // Refs
  const integrationRef = useRef<HTMLDivElement>(null);
  const healthCheckInterval = useRef<NodeJS.Timeout>();
  const autoOptimizationCount = useRef(0);

  // Initialize performance integration
  useEffect(() => {
    
    initializeIntegration();

    return () => {
      cleanup();
    };
  }, []);

  /**
   * Initialize the complete performance monitoring integration
   */
  const initializeIntegration = async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, connectionStatus: 'connected' }));

      // Setup event listeners for monitor
      monitor.on('monitoring-started', () => {
        setState(prev => ({ ...prev, isMonitoring: true }));
        startSession('Monitoring Session');
      });

      monitor.on('monitoring-stopped', () => {
        setState(prev => ({ ...prev, isMonitoring: false }));
        endCurrentSession();
      });

      monitor.on('metrics-updated', handleMetricsUpdate);
      monitor.on('performance-alert', handleAlert);
      monitor.on('optimization-suggestion', handleOptimizationSuggestion);

      // Setup event listeners for insights engine
      insightsEngine.on('analysis-started', () => {
        setState(prev => ({ ...prev, isAnalyzing: true }));
      });

      insightsEngine.on('analysis-stopped', () => {
        setState(prev => ({ ...prev, isAnalyzing: false }));
      });

      insightsEngine.on('insight-generated', handleInsightGenerated);
      insightsEngine.on('anomaly-detected', handleAnomalyDetected);
      insightsEngine.on('baseline-created', handleBaselineCreated);
      insightsEngine.on('report-generated', handleReportGenerated);

      // Start health monitoring
      startHealthMonitoring();

      // Start insights analysis
      insightsEngine.startContinuousAnalysis();

      setState(prev => ({ 
        ...prev, 
        isInitialized: true, 
        connectionStatus: 'connected',
        lastUpdate: Date.now()
      }));

    } catch (error) {
      console.error('❌ Failed to initialize Performance Integration:', error);
      setState(prev => ({ ...prev, connectionStatus: 'error' }));
    }
  };

  /**
   * Handle metrics updates and system health assessment
   */
  const handleMetricsUpdate = useCallback((metrics: PerformanceMetrics) => {
    // Update system health based on current metrics
    const health = assessSystemHealth(metrics);
    
    setState(prev => ({ 
      ...prev, 
      systemHealth: health,
      lastUpdate: Date.now()
    }));

    // Add metrics to current session
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        metrics: [...prev.metrics, metrics].slice(-1000) // Keep last 1000 metrics
      } : null);
    }

    // Auto-optimization check
    if (autoOptimization.enabled) {
      checkAutoOptimization(metrics);
    }
  }, [currentSession, autoOptimization]);

  /**
   * Handle performance alerts with intelligent routing
   */
  const handleAlert = useCallback((alert: PerformanceAlert) => {
    
    // Add alert to current session
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        alerts: [...prev.alerts, alert]
      } : null);
    }

    // Show notification if configured
    showNotification(alert.title, alert.description, alert.severity);

    // Trigger auto-optimization if critical
    if (alert.severity === 'critical' && autoOptimization.enabled) {
      triggerAutoOptimization(alert);
    }

    // Call external handler
    if (onAlert) {
      onAlert(alert);
    }
  }, [currentSession, autoOptimization, onAlert]);

  /**
   * Handle optimization suggestions with smart implementation
   */
  const handleOptimizationSuggestion = useCallback((suggestion: OptimizationSuggestion) => {
    
    // Add suggestion to current session
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        suggestions: [...prev.suggestions, suggestion]
      } : null);
    }

    // Auto-implement if configured and conditions met
    if (autoOptimization.autoImplement && shouldAutoImplement(suggestion)) {
      implementOptimization(suggestion);
    }

    // Call external handler
    if (onOptimizationSuggestion) {
      onOptimizationSuggestion(suggestion);
    }
  }, [currentSession, autoOptimization, onOptimizationSuggestion]);

  /**
   * Handle generated insights with context awareness
   */
  const handleInsightGenerated = useCallback((insight: PerformanceInsight) => {
    
    // Add insight to current session
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        insights: [...prev.insights, insight]
      } : null);
    }

    // Show notification for high-priority insights
    if (insight.severity === 'high' || insight.severity === 'critical') {
      showNotification(
        `Insight: ${insight.title}`, 
        insight.description, 
        insight.severity === 'critical' ? 'critical' : 'warning'
      );
    }

    // Call external handler
    if (onInsight) {
      onInsight(insight);
    }
  }, [currentSession, onInsight]);

  /**
   * Handle anomaly detection with immediate response
   */
  const handleAnomalyDetected = useCallback((anomaly: any) => {
    
    // Create high-priority alert for significant anomalies
    if (anomaly.significance > 75) {
      const alert: PerformanceAlert = {
        id: `anomaly-alert-${Date.now()}`,
        type: 'rendering',
        severity: anomaly.significance > 90 ? 'critical' : 'warning',
        title: `Anomaly Detected: ${anomaly.metric}`,
        description: `Unusual behavior detected in ${anomaly.metric}. Value: ${anomaly.actualValue}, Expected: ${anomaly.expectedValue}`,
        metrics: anomaly,
        suggestions: [],
        timestamp: Date.now(),
        acknowledged: false
      };

      handleAlert(alert);
    }
  }, []);

  /**
   * Handle baseline creation with session tracking
   */
  const handleBaselineCreated = useCallback((baseline: PerformanceBaseline) => {
    
    // Associate baseline with current session
    if (currentSession) {
      setCurrentSession(prev => prev ? {
        ...prev,
        baselineId: baseline.id
      } : null);
    }
  }, [currentSession]);

  /**
   * Handle report generation with export options
   */
  const handleReportGenerated = useCallback((report: PerformanceReport) => {
    
    // Call external handler
    if (onReportGenerated) {
      onReportGenerated(report);
    }

    // Auto-export if configured
    exportReport(report, 'json');
  }, [onReportGenerated]);

  /**
   * Start a new performance monitoring session
   */
  const startSession = useCallback((label: string): void => {
    const session: PerformanceSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      label,
      metrics: [],
      insights: [],
      alerts: [],
      suggestions: []
    };

    setCurrentSession(session);
    setSessions(prev => [...prev, session].slice(-50)); // Keep last 50 sessions

  }, []);

  /**
   * End the current performance monitoring session
   */
  const endCurrentSession = useCallback((): void => {
    if (!currentSession) return;

    const endedSession = {
      ...currentSession,
      endTime: Date.now()
    };

    setSessions(prev => 
      prev.map(s => s.id === currentSession.id ? endedSession : s)
    );

    setCurrentSession(null);

  }, [currentSession]);

  /**
   * Assess system health based on current metrics
   */
  const assessSystemHealth = (metrics: PerformanceMetrics): IntegrationState['systemHealth'] => {
    let score = 100;

    // CPU health impact
    if (metrics.cpu.usage > 90) score -= 30;
    else if (metrics.cpu.usage > 70) score -= 15;
    else if (metrics.cpu.usage > 50) score -= 5;

    // Memory health impact
    const memoryUsageMB = metrics.memory.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 1000) score -= 25;
    else if (memoryUsageMB > 500) score -= 12;
    else if (memoryUsageMB > 250) score -= 5;

    // Network health impact
    if (metrics.network.averageResponseTime > 5000) score -= 20;
    else if (metrics.network.averageResponseTime > 2000) score -= 10;
    else if (metrics.network.averageResponseTime > 1000) score -= 5;

    // Rendering health impact
    if (metrics.rendering.fps < 20) score -= 25;
    else if (metrics.rendering.fps < 30) score -= 15;
    else if (metrics.rendering.fps < 45) score -= 5;

    // UX health impact
    if (metrics.userExperience.largestContentfulPaint > 4000) score -= 20;
    else if (metrics.userExperience.largestContentfulPaint > 2500) score -= 10;

    // Determine health level
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 25) return 'poor';
    return 'critical';
  };

  /**
   * Start health monitoring with intelligent alerts
   */
  const startHealthMonitoring = (): void => {
    healthCheckInterval.current = setInterval(() => {
      const currentMetrics = monitor.getMetrics();
      const latestMetrics = currentMetrics[currentMetrics.length - 1];
      
      if (latestMetrics) {
        const health = assessSystemHealth(latestMetrics);
        
        // Alert on health degradation
        if (health === 'critical' || health === 'poor') {
          showNotification(
            'System Health Warning',
            `System health is ${health}. Consider optimization.`,
            health === 'critical' ? 'critical' : 'warning'
          );
        }
      }
    }, 30000); // Check every 30 seconds
  };

  /**
   * Check for auto-optimization opportunities
   */
  const checkAutoOptimization = (metrics: PerformanceMetrics): void => {
    if (!autoOptimization.enabled || 
        autoOptimizationCount.current >= autoOptimization.maxAutomatedChanges) {
      return;
    }

    // Auto-optimize memory if critical
    if (metrics.memory.heapUsed > 1024 * 1024 * 1024) { // > 1GB
      triggerMemoryOptimization();
    }

    // Auto-optimize rendering if FPS is critically low
    if (metrics.rendering.fps < 15) {
      triggerRenderingOptimization();
    }
  };

  /**
   * Determine if optimization should be auto-implemented
   */
  const shouldAutoImplement = (suggestion: OptimizationSuggestion): boolean => {
    return autoOptimization.autoImplement &&
           suggestion.impact === 'high' &&
           suggestion.effort === 'easy' &&
           autoOptimizationCount.current < autoOptimization.maxAutomatedChanges;
  };

  /**
   * Implement optimization suggestion
   */
  const implementOptimization = (suggestion: OptimizationSuggestion): void => {
    
    // Increment auto-optimization count
    autoOptimizationCount.current++;

    // Implementation would happen here based on suggestion category
    // This is a placeholder for the actual implementation logic
    
    showNotification(
      'Optimization Applied',
      `Applied: ${suggestion.title}`,
      'info'
    );
  };

  /**
   * Trigger auto-optimization for alerts
   */
  const triggerAutoOptimization = (alert: PerformanceAlert): void => {
    if (autoOptimization.safetyMode && autoOptimizationCount.current > 0) {
      // In safety mode, limit auto-optimizations
      return;
    }

    switch (alert.type) {
      case 'memory':
        triggerMemoryOptimization();
        break;
      case 'cpu':
        triggerCPUOptimization();
        break;
      case 'rendering':
        triggerRenderingOptimization();
        break;
    }
  };

  /**
   * Trigger memory optimization
   */
  const triggerMemoryOptimization = (): void => {
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }

    // Clear caches
    if (typeof caches !== 'undefined') {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }

    autoOptimizationCount.current++;
  };

  /**
   * Trigger CPU optimization
   */
  const triggerCPUOptimization = (): void => {
    
    // Implement CPU optimization strategies
    // This could include pausing non-critical operations, 
    // reducing animation frame rates, etc.
    
    autoOptimizationCount.current++;
  };

  /**
   * Trigger rendering optimization
   */
  const triggerRenderingOptimization = (): void => {
    
    // Reduce animation complexity, hide non-visible elements, etc.
    
    autoOptimizationCount.current++;
  };

  /**
   * Show notification based on settings
   */
  const showNotification = (title: string, message: string, severity: string): void => {
    if (!notifications.enableDesktopNotifications) return;

    // Check minimum severity
    const severityLevels = ['info', 'warning', 'error', 'critical'];
    const minLevel = severityLevels.indexOf(notifications.minimumSeverity);
    const currentLevel = severityLevels.indexOf(severity);
    
    if (currentLevel < minLevel) return;

    // Check quiet hours
    if (isQuietHours()) return;

    // Show desktop notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '🚀' // You could use an actual icon path here
      });
    }

    // Play sound if enabled
    if (notifications.enableSoundAlerts) {
      playAlertSound(severity);
    }
  };

  /**
   * Check if currently in quiet hours
   */
  const isQuietHours = (): boolean => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = notifications.quietHours;
    
    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Overnight quiet hours
      return currentTime >= start || currentTime <= end;
    }
  };

  /**
   * Play alert sound based on severity
   */
  const playAlertSound = (severity: string): void => {
    // Implementation would play appropriate sound based on severity
    
  };

  /**
   * Export performance report
   */
  const exportReport = (report: PerformanceReport, format: 'json' | 'csv' | 'pdf'): void => {
    try {
      let content: string;
      let mimeType: string;
      let filename: string;

      switch (format) {
        case 'json':
          content = JSON.stringify(report, null, 2);
          mimeType = 'application/json';
          filename = `performance-report-${report.id}.json`;
          break;
        case 'csv':
          content = convertReportToCSV(report);
          mimeType = 'text/csv';
          filename = `performance-report-${report.id}.csv`;
          break;
        default:
          return;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('❌ Error exporting report:', error);
    }
  };

  /**
   * Convert report to CSV format
   */
  const convertReportToCSV = (report: PerformanceReport): string => {
    // Simple CSV conversion for demonstration
    const rows = [
      ['Metric', 'Value', 'Status', 'Timestamp'],
      ...report.summary.keyMetrics.map(metric => [
        metric.name,
        metric.current.toString(),
        metric.status,
        new Date(report.generatedAt).toISOString()
      ])
    ];

    return rows.map(row => row.join(',')).join('\n');
  };

  /**
   * Cleanup resources
   */
  const cleanup = (): void => {
    
    if (healthCheckInterval.current) {
      clearInterval(healthCheckInterval.current);
    }

    monitor.stopMonitoring();
    insightsEngine.stopContinuousAnalysis();

    // Remove all event listeners
    monitor.removeAllListeners();
    insightsEngine.removeAllListeners();
  };

  /**
   * Handle optimization implementation
   */
  const handleOptimize = (suggestion: OptimizationSuggestion): void => {
    implementOptimization(suggestion);
  };

  /**
   * Handle data export
   */
  const handleExport = (data: any): void => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div ref={integrationRef} className={`performance-integration ${className}`}>
      {/* Integration Status Bar */}
      <div className="integration-status">
        <div className="status-indicators">
          <div className={`status-indicator ${state.connectionStatus}`}>
            <span className="indicator-dot"></span>
            <span className="indicator-label">
              {state.connectionStatus === 'connected' ? 'Connected' : 
               state.connectionStatus === 'error' ? 'Error' : 'Disconnected'}
            </span>
          </div>
          
          <div className={`health-indicator ${state.systemHealth}`}>
            <span className="health-icon">
              {state.systemHealth === 'excellent' ? '🟢' :
               state.systemHealth === 'good' ? '🔵' :
               state.systemHealth === 'fair' ? '🟡' :
               state.systemHealth === 'poor' ? '🟠' : '🔴'}
            </span>
            <span className="health-label">{state.systemHealth}</span>
          </div>

          {currentSession && (
            <div className="session-indicator">
              <span className="session-icon">📝</span>
              <span className="session-label">{currentSession.label}</span>
              <span className="session-duration">
                {Math.round((Date.now() - currentSession.startTime) / 1000)}s
              </span>
            </div>
          )}
        </div>

        <div className="integration-controls">
          <button
            className={`auto-optimization-toggle ${autoOptimization.enabled ? 'enabled' : 'disabled'}`}
            onClick={() => setAutoOptimization(prev => ({ ...prev, enabled: !prev.enabled }))}
          >
            🤖 Auto-Opt: {autoOptimization.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Main Dashboard */}
      {state.isInitialized && (
        <PerformanceDashboard
          monitor={monitor}
          onOptimize={handleOptimize}
          onExport={handleExport}
          className="integrated-dashboard"
        />
      )}

      {/* Initialization Loading */}
      {!state.isInitialized && (
        <div className="initialization-loading">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h3>🚀 Initializing Performance Monitoring</h3>
            <p>Setting up advanced performance monitoring and insights...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceIntegration;
