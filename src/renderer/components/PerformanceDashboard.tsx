// Performance Dashboard - Real-time monitoring interface with intelligent insights
// Advanced visualization with charts, alerts, and optimization recommendations

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  AdvancedPerformanceMonitor, 
  PerformanceMetrics, 
  PerformanceAlert, 
  OptimizationSuggestion,
  PerformanceSnapshot,
  PerformanceConfig
} from '../services/AdvancedPerformanceMonitor';

interface PerformanceDashboardProps {
  monitor: AdvancedPerformanceMonitor;
  onOptimize?: (suggestion: OptimizationSuggestion) => void;
  onExport?: (data: any) => void;
  className?: string;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  fill?: boolean;
}

interface MetricCard {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  status?: 'good' | 'warning' | 'critical';
}

interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  monitor,
  onOptimize,
  onExport,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [snapshots, setSnapshots] = useState<PerformanceSnapshot[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1m' | '5m' | '15m' | '1h' | '24h'>('5m');
  const [selectedMetricType, setSelectedMetricType] = useState<'cpu' | 'memory' | 'network' | 'rendering' | 'bundle' | 'ux'>('cpu');
  const [config, setConfig] = useState<PerformanceConfig>(monitor.getConfig());
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Initialize dashboard
  useEffect(() => {
    
    // Load initial data
    setMetrics(monitor.getMetrics());
    setAlerts(monitor.getAlerts());
    setSuggestions(monitor.getSuggestions());
    setSnapshots(monitor.getSnapshots());

    // Setup event listeners
    const handleMetricsUpdate = (newMetrics: PerformanceMetrics) => {
      setMetrics(prev => {
        const updated = [...prev, newMetrics];
        return updated.slice(-1000); // Keep last 1000 metrics
      });
    };

    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 100)); // Keep last 100 alerts
    };

    const handleSuggestion = (suggestion: OptimizationSuggestion) => {
      setSuggestions(prev => [suggestion, ...prev].slice(0, 50)); // Keep last 50 suggestions
    };

    const handleSnapshot = (snapshot: PerformanceSnapshot) => {
      setSnapshots(prev => [snapshot, ...prev].slice(0, 20)); // Keep last 20 snapshots
    };

    const handleMonitoringStart = () => {
      setIsMonitoring(true);
      
    };

    const handleMonitoringStop = () => {
      setIsMonitoring(false);
      
    };

    // Add event listeners
    monitor.on('metrics-updated', handleMetricsUpdate);
    monitor.on('performance-alert', handleAlert);
    monitor.on('optimization-suggestion', handleSuggestion);
    monitor.on('snapshot-created', handleSnapshot);
    monitor.on('monitoring-started', handleMonitoringStart);
    monitor.on('monitoring-stopped', handleMonitoringStop);

    // Start real-time updates
    if (realTimeEnabled) {
      startRealTimeUpdates();
    }

    return () => {
      // Cleanup event listeners
      monitor.off('metrics-updated', handleMetricsUpdate);
      monitor.off('performance-alert', handleAlert);
      monitor.off('optimization-suggestion', handleSuggestion);
      monitor.off('snapshot-created', handleSnapshot);
      monitor.off('monitoring-started', handleMonitoringStart);
      monitor.off('monitoring-stopped', handleMonitoringStop);

      // Stop real-time updates
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [monitor, realTimeEnabled]);

  // Start real-time chart updates
  const startRealTimeUpdates = useCallback(() => {
    const updateCharts = () => {
      if (realTimeEnabled && chartCanvasRef.current) {
        drawRealTimeChart();
      }
      animationFrameRef.current = requestAnimationFrame(updateCharts);
    };
    updateCharts();
  }, [realTimeEnabled]);

  // Get filtered metrics based on time range
  const filteredMetrics = useMemo(() => {
    const now = Date.now();
    const timeRanges = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };
    
    const cutoff = now - timeRanges[selectedTimeRange];
    return metrics.filter(m => m.timestamp > cutoff);
  }, [metrics, selectedTimeRange]);

  // Generate chart data for selected metric type
  const chartData = useMemo(() => {
    if (filteredMetrics.length === 0) return null;

    const labels = filteredMetrics.map(m => 
      new Date(m.timestamp).toLocaleTimeString()
    );

    const datasets: ChartDataset[] = [];

    switch (selectedMetricType) {
      case 'cpu':
        datasets.push({
          label: 'CPU Usage (%)',
          data: filteredMetrics.map(m => m.cpu.usage),
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          fill: true
        });
        break;
      
      case 'memory':
        datasets.push({
          label: 'Heap Used (MB)',
          data: filteredMetrics.map(m => m.memory.heapUsed / 1024 / 1024),
          borderColor: '#4ecdc4',
          backgroundColor: 'rgba(78, 205, 196, 0.1)',
          fill: true
        });
        break;
      
      case 'network':
        datasets.push({
          label: 'Response Time (ms)',
          data: filteredMetrics.map(m => m.network.averageResponseTime),
          borderColor: '#45b7d1',
          backgroundColor: 'rgba(69, 183, 209, 0.1)',
          fill: true
        });
        break;
      
      case 'rendering':
        datasets.push({
          label: 'FPS',
          data: filteredMetrics.map(m => m.rendering.fps),
          borderColor: '#f9ca24',
          backgroundColor: 'rgba(249, 202, 36, 0.1)',
          fill: true
        });
        break;
      
      case 'bundle':
        datasets.push({
          label: 'Bundle Size (MB)',
          data: filteredMetrics.map(m => m.bundle.totalSize / 1024 / 1024),
          borderColor: '#a55eea',
          backgroundColor: 'rgba(165, 94, 234, 0.1)',
          fill: true
        });
        break;
      
      case 'ux':
        datasets.push({
          label: 'LCP (ms)',
          data: filteredMetrics.map(m => m.userExperience.largestContentfulPaint),
          borderColor: '#26de81',
          backgroundColor: 'rgba(38, 222, 129, 0.1)',
          fill: true
        });
        break;
    }

    return { labels, datasets };
  }, [filteredMetrics, selectedMetricType]);

  // Generate metric cards
  const metricCards = useMemo((): MetricCard[] => {
    if (filteredMetrics.length === 0) return [];

    const latest = filteredMetrics[filteredMetrics.length - 1];
    const previous = filteredMetrics[filteredMetrics.length - 2];

    const cards: MetricCard[] = [
      {
        title: 'CPU Usage',
        value: Math.round(latest.cpu.usage),
        unit: '%',
        trend: previous ? (latest.cpu.usage > previous.cpu.usage ? 'up' : latest.cpu.usage < previous.cpu.usage ? 'down' : 'stable') : 'stable',
        trendValue: previous ? Math.round(latest.cpu.usage - previous.cpu.usage) : 0,
        status: latest.cpu.usage > 80 ? 'critical' : latest.cpu.usage > 60 ? 'warning' : 'good'
      },
      {
        title: 'Memory',
        value: Math.round(latest.memory.heapUsed / 1024 / 1024),
        unit: 'MB',
        trend: previous ? (latest.memory.heapUsed > previous.memory.heapUsed ? 'up' : latest.memory.heapUsed < previous.memory.heapUsed ? 'down' : 'stable') : 'stable',
        trendValue: previous ? Math.round((latest.memory.heapUsed - previous.memory.heapUsed) / 1024 / 1024) : 0,
        status: latest.memory.heapUsed > 512 * 1024 * 1024 ? 'critical' : latest.memory.heapUsed > 256 * 1024 * 1024 ? 'warning' : 'good'
      },
      {
        title: 'Network',
        value: Math.round(latest.network.averageResponseTime),
        unit: 'ms',
        trend: previous ? (latest.network.averageResponseTime > previous.network.averageResponseTime ? 'up' : latest.network.averageResponseTime < previous.network.averageResponseTime ? 'down' : 'stable') : 'stable',
        trendValue: previous ? Math.round(latest.network.averageResponseTime - previous.network.averageResponseTime) : 0,
        status: latest.network.averageResponseTime > 2000 ? 'critical' : latest.network.averageResponseTime > 1000 ? 'warning' : 'good'
      },
      {
        title: 'FPS',
        value: Math.round(latest.rendering.fps),
        unit: '',
        trend: previous ? (latest.rendering.fps < previous.rendering.fps ? 'up' : latest.rendering.fps > previous.rendering.fps ? 'down' : 'stable') : 'stable',
        trendValue: previous ? Math.round(previous.rendering.fps - latest.rendering.fps) : 0,
        status: latest.rendering.fps < 30 ? 'critical' : latest.rendering.fps < 45 ? 'warning' : 'good'
      }
    ];

    return cards;
  }, [filteredMetrics]);

  // Get alert summary
  const alertSummary = useMemo((): AlertSummary => {
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
    
    return {
      total: unacknowledgedAlerts.length,
      critical: unacknowledgedAlerts.filter(a => a.severity === 'critical').length,
      warning: unacknowledgedAlerts.filter(a => a.severity === 'warning').length,
      info: unacknowledgedAlerts.filter(a => a.severity === 'info').length
    };
  }, [alerts]);

  // Get filtered alerts
  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'all') return alerts;
    return alerts.filter(alert => alert.severity === alertFilter);
  }, [alerts, alertFilter]);

  // Get top suggestions
  const topSuggestions = useMemo(() => {
    return suggestions
      .filter(s => s.impact === 'high' || s.impact === 'critical')
      .slice(0, 5);
  }, [suggestions]);

  // Draw real-time chart
  const drawRealTimeChart = useCallback(() => {
    if (!chartCanvasRef.current || !chartData) return;

    const canvas = chartCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Chart dimensions
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;

    // Get data
    const data = chartData.datasets[0]?.data || [];
    if (data.length === 0) return;

    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const valueRange = maxValue - minValue;

    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const timeSlices = Math.min(data.length, 10);
    for (let i = 0; i <= timeSlices; i++) {
      const x = padding + (chartWidth / timeSlices) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }

    // Draw data line
    if (data.length > 1) {
      ctx.strokeStyle = chartData.datasets[0].borderColor;
      ctx.fillStyle = chartData.datasets[0].backgroundColor;
      ctx.lineWidth = 2;

      // Create path for line
      ctx.beginPath();
      
      data.forEach((value, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const normalizedValue = valueRange > 0 ? (value - minValue) / valueRange : 0.5;
        const y = padding + chartHeight - (normalizedValue * chartHeight);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Fill area under line
      ctx.lineTo(padding + chartWidth, padding + chartHeight);
      ctx.lineTo(padding, padding + chartHeight);
      ctx.closePath();
      ctx.fill();
    }

    // Draw labels
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    
    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (valueRange / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i + 4;
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(value).toString(), padding - 10, y);
    }

    // Chart title
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillText(chartData.datasets[0]?.label || '', rect.width / 2, 20);

  }, [chartData]);

  // Handle monitoring toggle
  const toggleMonitoring = async () => {
    if (isMonitoring) {
      monitor.stopMonitoring();
    } else {
      await monitor.startMonitoring();
    }
  };

  // Handle snapshot creation
  const createSnapshot = () => {
    const label = prompt('Enter snapshot label:');
    if (label) {
      monitor.createSnapshot(label);
    }
  };

  // Handle alert acknowledgment
  const acknowledgeAlert = (alertId: string) => {
    monitor.acknowledgeAlert(alertId);
  };

  // Handle suggestion implementation
  const implementSuggestion = (suggestion: OptimizationSuggestion) => {
    if (onOptimize) {
      onOptimize(suggestion);
    }
  };

  // Export performance data
  const exportData = () => {
    const data = {
      metrics: filteredMetrics,
      alerts,
      suggestions,
      snapshots,
      config,
      timestamp: Date.now()
    };
    
    if (onExport) {
      onExport(data);
    } else {
      // Download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div ref={dashboardRef} className={`performance-dashboard ${className}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h2>🚀 Performance Monitor</h2>
          <div className="status-indicator">
            <span className={`status-dot ${isMonitoring ? 'active' : 'inactive'}`}></span>
            <span className="status-text">
              {isMonitoring ? 'Monitoring Active' : 'Monitoring Stopped'}
            </span>
          </div>
        </div>
        
        <div className="header-controls">
          <button
            className={`monitor-toggle ${isMonitoring ? 'stop' : 'start'}`}
            onClick={toggleMonitoring}
          >
            {isMonitoring ? '⏹️ Stop' : '▶️ Start'}
          </button>
          
          <button className="snapshot-btn" onClick={createSnapshot}>
            📸 Snapshot
          </button>
          
          <button className="export-btn" onClick={exportData}>
            📊 Export
          </button>
          
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertSummary.total > 0 && (
        <div className="alert-banner">
          <span className="alert-icon">⚠️</span>
          <span className="alert-text">
            {alertSummary.critical > 0 && (
              <span className="critical">{alertSummary.critical} Critical</span>
            )}
            {alertSummary.warning > 0 && (
              <span className="warning">{alertSummary.warning} Warning</span>
            )}
            {alertSummary.info > 0 && (
              <span className="info">{alertSummary.info} Info</span>
            )}
          </span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="metric-cards">
        {metricCards.map((card, index) => (
          <div key={index} className={`metric-card ${card.status}`}>
            <div className="card-header">
              <span className="card-title">{card.title}</span>
              {card.trend !== 'stable' && (
                <span className={`trend-indicator ${card.trend}`}>
                  {card.trend === 'up' ? '↑' : '↓'} {Math.abs(card.trendValue || 0)}
                </span>
              )}
            </div>
            <div className="card-value">
              <span className="value">{card.value}</span>
              {card.unit && <span className="unit">{card.unit}</span>}
            </div>
            <div className={`status-bar ${card.status}`}></div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Chart Section */}
        <div className="chart-section">
          <div className="chart-controls">
            <div className="time-range-selector">
              {(['1m', '5m', '15m', '1h', '24h'] as const).map(range => (
                <button
                  key={range}
                  className={selectedTimeRange === range ? 'active' : ''}
                  onClick={() => setSelectedTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
            
            <div className="metric-type-selector">
              {(['cpu', 'memory', 'network', 'rendering', 'bundle', 'ux'] as const).map(type => (
                <button
                  key={type}
                  className={selectedMetricType === type ? 'active' : ''}
                  onClick={() => setSelectedMetricType(type)}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="chart-container">
            <canvas ref={chartCanvasRef} className="performance-chart"></canvas>
          </div>
        </div>

        {/* Side Panel */}
        <div className="side-panel">
          {/* Alerts Section */}
          <div className="alerts-section">
            <div className="section-header">
              <h3>🚨 Alerts</h3>
              <div className="alert-filter">
                {(['all', 'critical', 'warning', 'info'] as const).map(filter => (
                  <button
                    key={filter}
                    className={alertFilter === filter ? 'active' : ''}
                    onClick={() => setAlertFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="alerts-list">
              {filteredAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className={`alert-item ${alert.severity}`}>
                  <div className="alert-content">
                    <div className="alert-title">{alert.title}</div>
                    <div className="alert-description">{alert.description}</div>
                    <div className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <button
                      className="acknowledge-btn"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      ✓
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions Section */}
          <div className="suggestions-section">
            <div className="section-header">
              <h3>💡 Optimization Suggestions</h3>
            </div>
            
            <div className="suggestions-list">
              {topSuggestions.map(suggestion => (
                <div key={suggestion.id} className={`suggestion-item ${suggestion.impact}`}>
                  <div className="suggestion-content">
                    <div className="suggestion-title">{suggestion.title}</div>
                    <div className="suggestion-description">{suggestion.description}</div>
                    <div className="suggestion-meta">
                      <span className={`impact ${suggestion.impact}`}>
                        Impact: {suggestion.impact}
                      </span>
                      <span className={`effort ${suggestion.effort}`}>
                        Effort: {suggestion.effort}
                      </span>
                    </div>
                    <div className="suggestion-improvement">
                      {suggestion.estimatedImprovement}
                    </div>
                  </div>
                  <button
                    className="implement-btn"
                    onClick={() => implementSuggestion(suggestion)}
                  >
                    Implement
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-panel">
            <div className="settings-header">
              <h3>⚙️ Performance Settings</h3>
              <button
                className="close-btn"
                onClick={() => setShowSettings(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="settings-content">
              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.enableRealTimeMonitoring}
                    onChange={(e) => {
                      const newConfig = { ...config, enableRealTimeMonitoring: e.target.checked };
                      setConfig(newConfig);
                      monitor.updateConfig(newConfig);
                    }}
                  />
                  Enable Real-time Monitoring
                </label>
              </div>
              
              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.enableMemoryProfiling}
                    onChange={(e) => {
                      const newConfig = { ...config, enableMemoryProfiling: e.target.checked };
                      setConfig(newConfig);
                      monitor.updateConfig(newConfig);
                    }}
                  />
                  Enable Memory Profiling
                </label>
              </div>
              
              <div className="setting-group">
                <label>
                  Sampling Interval (ms):
                  <input
                    type="number"
                    value={config.samplingInterval}
                    onChange={(e) => {
                      const newConfig = { ...config, samplingInterval: parseInt(e.target.value) };
                      setConfig(newConfig);
                      monitor.updateConfig(newConfig);
                    }}
                    min="100"
                    max="10000"
                    step="100"
                  />
                </label>
              </div>
              
              <div className="setting-group">
                <h4>Alert Thresholds</h4>
                <label>
                  Memory Usage (MB):
                  <input
                    type="number"
                    value={config.alertThresholds.memoryUsage}
                    onChange={(e) => {
                      const newConfig = {
                        ...config,
                        alertThresholds: {
                          ...config.alertThresholds,
                          memoryUsage: parseInt(e.target.value)
                        }
                      };
                      setConfig(newConfig);
                      monitor.updateConfig(newConfig);
                    }}
                  />
                </label>
                
                <label>
                  CPU Usage (%):
                  <input
                    type="number"
                    value={config.alertThresholds.cpuUsage}
                    onChange={(e) => {
                      const newConfig = {
                        ...config,
                        alertThresholds: {
                          ...config.alertThresholds,
                          cpuUsage: parseInt(e.target.value)
                        }
                      };
                      setConfig(newConfig);
                      monitor.updateConfig(newConfig);
                    }}
                    min="0"
                    max="100"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
