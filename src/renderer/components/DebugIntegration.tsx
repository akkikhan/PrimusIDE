// Debug Integration - Seamless debugging integration with IDE
// Advanced orchestration and debugging workflow management

import React, { useState, useEffect } from 'react';
import AdvancedDebugEngine, { DebugSession, SmartBreakpoint, DebugInsight } from '../services/AdvancedDebugEngine';
import DebugDashboard from './DebugDashboard';

interface DebugIntegrationProps {
  className?: string;
  onDebugStateChange?: (isDebugging: boolean) => void;
  onBreakpointHit?: (breakpoint: SmartBreakpoint) => void;
  onInsightGenerated?: (insight: DebugInsight) => void;
}

interface DebugWorkspace {
  id: string;
  name: string;
  path: string;
  files: string[];
  activeFile?: string;
  debugConfigurations: DebugConfiguration[];
}

interface DebugConfiguration {
  name: string;
  type: string;
  request: 'launch' | 'attach';
  program?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  port?: number;
  host?: string;
  stopOnEntry?: boolean;
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
  sourceMaps?: boolean;
  outFiles?: string[];
  skipFiles?: string[];
  smartStep?: boolean;
  justMyCode?: boolean;
}

interface DebugNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  action?: {
    label: string;
    callback: () => void;
  };
  autoClose?: boolean;
  duration?: number;
}

interface DebugMetrics {
  sessionsStarted: number;
  breakpointsHit: number;
  stepExecutions: number;
  averageSessionDuration: number;
  insightsGenerated: number;
  performanceProfilesCreated: number;
}

interface DebugSettings {
  autoStopOnEntry: boolean;
  smartStepEnabled: boolean;
  justMyCodeEnabled: boolean;
  enableSourceMaps: boolean;
  enablePerformanceProfiling: boolean;
  autoSaveBreakpoints: boolean;
  enableIntelligentInsights: boolean;
  notificationLevel: 'all' | 'warnings' | 'errors' | 'none';
  maxConsoleMessages: number;
  autoEvaluateWatches: boolean;
}

export const DebugIntegration: React.FC<DebugIntegrationProps> = ({
  className = '',
  onDebugStateChange,
  onBreakpointHit,
  onInsightGenerated
}) => {
  // Core state
  const [debugEngine] = useState(() => new AdvancedDebugEngine());
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isDebugging, setIsDebugging] = useState<boolean>(false);
  
  // Workspace state
  const [workspace, setWorkspace] = useState<DebugWorkspace | null>(null);
  const [activeSession, setActiveSession] = useState<DebugSession | null>(null);
  
  // UI state
  const [notifications, setNotifications] = useState<DebugNotification[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics>({
    sessionsStarted: 0,
    breakpointsHit: 0,
    stepExecutions: 0,
    averageSessionDuration: 0,
    insightsGenerated: 0,
    performanceProfilesCreated: 0
  });
  
  // Settings state
  const [settings, setSettings] = useState<DebugSettings>({
    autoStopOnEntry: true,
    smartStepEnabled: true,
    justMyCodeEnabled: true,
    enableSourceMaps: true,
    enablePerformanceProfiling: true,
    autoSaveBreakpoints: true,
    enableIntelligentInsights: true,
    notificationLevel: 'warnings',
    maxConsoleMessages: 1000,
    autoEvaluateWatches: true
  });

  // Auto-close notifications
  useEffect(() => {
    const timer = setInterval(() => {
      setNotifications(prev => 
        prev.filter(notification => {
          if (notification.autoClose !== false) {
            const age = Date.now() - notification.timestamp;
            const duration = notification.duration || 5000;
            return age < duration;
          }
          return true;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initialize debug integration
  useEffect(() => {
    const initializeDebugIntegration = async () => {
      
      try {
        // Load workspace configuration
        await loadWorkspace();
        
        // Load saved settings
        loadSettings();
        
        // Setup debug engine event handlers
        setupDebugEngineHandlers();
        
        // Load saved breakpoints and watch expressions
        if (settings.autoSaveBreakpoints) {
          await loadSavedBreakpoints();
        }

        setIsInitialized(true);
        
        showNotification({
          type: 'success',
          title: 'Debug Integration Ready',
          message: 'Advanced debugging capabilities initialized successfully'
        });

      } catch (error) {
        console.error('❌ Failed to initialize Debug Integration:', error);
        showNotification({
          type: 'error',
          title: 'Initialization Failed',
          message: 'Failed to initialize debugging capabilities'
        });
      }
    };

    initializeDebugIntegration();
  }, []);

  // Debug state change notification
  useEffect(() => {
    onDebugStateChange?.(isDebugging);
  }, [isDebugging, onDebugStateChange]);

  /**
   * Setup debug engine event handlers
   */
  const setupDebugEngineHandlers = () => {
    // Session events
    debugEngine.on('session-started', handleSessionStarted);
    debugEngine.on('session-stopped', handleSessionStopped);
    debugEngine.on('session-paused', handleSessionPaused);
    debugEngine.on('session-continued', handleSessionContinued);
    
    // Breakpoint events
    debugEngine.on('breakpoint-hit', handleBreakpointHit);
    debugEngine.on('breakpoint-set', handleBreakpointSet);
    debugEngine.on('breakpoint-removed', handleBreakpointRemoved);
    
    // Execution events
    debugEngine.on('step-executed', handleStepExecuted);
    debugEngine.on('execution-paused', handleExecutionPaused);
    debugEngine.on('execution-continued', handleExecutionContinued);
    
    // Insights and profiling
    debugEngine.on('debug-insight', handleDebugInsight);
    debugEngine.on('profiling-started', handleProfilingStarted);
    debugEngine.on('profiling-stopped', handleProfilingStopped);
    
    // Errors
    debugEngine.on('error', handleDebugError);
  };

  /**
   * Load workspace configuration
   */
  const loadWorkspace = async (): Promise<void> => {
    // In a real implementation, this would load from VS Code workspace
    const mockWorkspace: DebugWorkspace = {
      id: 'workspace-1',
      name: 'Current Project',
      path: '/current/project',
      files: ['src/main.ts', 'src/utils.ts', 'test/test.ts'],
      activeFile: 'src/main.ts',
      debugConfigurations: [
        {
          name: 'Launch Program',
          type: 'node',
          request: 'launch',
          program: '${workspaceFolder}/src/main.ts',
          outFiles: ['${workspaceFolder}/dist/**/*.js'],
          sourceMaps: true,
          stopOnEntry: false,
          console: 'integratedTerminal',
          smartStep: true,
          justMyCode: true
        },
        {
          name: 'Attach to Process',
          type: 'node',
          request: 'attach',
          port: 9229,
          host: 'localhost',
          skipFiles: ['<node_internals>/**']
        }
      ]
    };

    setWorkspace(mockWorkspace);
  };

  /**
   * Load saved settings
   */
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('debug-settings');
      if (savedSettings) {
        setSettings({ ...settings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Failed to load debug settings:', error);
    }
  };

  /**
   * Save settings
   */
  const saveSettings = (newSettings: DebugSettings) => {
    try {
      localStorage.setItem('debug-settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      showNotification({
        type: 'success',
        title: 'Settings Saved',
        message: 'Debug settings have been saved successfully'
      });
    } catch (error) {
      console.error('Failed to save debug settings:', error);
      showNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save debug settings'
      });
    }
  };

  /**
   * Load saved breakpoints
   */
  const loadSavedBreakpoints = async (): Promise<void> => {
    try {
      const savedBreakpoints = localStorage.getItem('debug-breakpoints');
      if (savedBreakpoints) {
        const breakpoints = JSON.parse(savedBreakpoints);
        
        for (const bp of breakpoints) {
          await debugEngine.setBreakpoint(bp.file, bp.line, {
            condition: bp.condition,
            hitCondition: bp.hitCondition,
            logMessage: bp.logMessage
          });
        }

      }
    } catch (error) {
      console.error('Failed to load saved breakpoints:', error);
    }
  };

  /**
   * Save breakpoints
   */
  const saveBreakpoints = () => {
    if (!settings.autoSaveBreakpoints) return;

    try {
      const breakpoints = debugEngine.getBreakpoints().map(bp => ({
        file: bp.file,
        line: bp.line,
        condition: bp.condition,
        hitCondition: bp.hitCondition,
        logMessage: bp.logMessage
      }));
      
      localStorage.setItem('debug-breakpoints', JSON.stringify(breakpoints));
    } catch (error) {
      console.error('Failed to save breakpoints:', error);
    }
  };

  /**
   * Show notification
   */
  const showNotification = (notification: Omit<DebugNotification, 'id' | 'timestamp'>) => {
    // Check notification level setting
    if (settings.notificationLevel === 'none') return;
    if (settings.notificationLevel === 'errors' && notification.type !== 'error') return;
    if (settings.notificationLevel === 'warnings' && !['error', 'warning'].includes(notification.type)) return;

    const newNotification: DebugNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, newNotification]);
  };

  /**
   * Dismiss notification
   */
  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Event handlers
  const handleSessionStarted = (session: DebugSession) => {
    
    setActiveSession(session);
    setIsDebugging(true);
    
    setDebugMetrics(prev => ({
      ...prev,
      sessionsStarted: prev.sessionsStarted + 1
    }));

    showNotification({
      type: 'success',
      title: 'Debug Session Started',
      message: `Started debugging: ${session.name}`,
      action: {
        label: 'View Session',
        callback: () => 
      }
    });

    // Auto-enable performance profiling if enabled
    if (settings.enablePerformanceProfiling) {
      setTimeout(async () => {
        try {
          await debugEngine.startCPUProfile();
          showNotification({
            type: 'info',
            title: 'Performance Profiling Started',
            message: 'Automatic CPU profiling enabled for this session'
          });
        } catch (error) {
          console.error('Failed to start automatic profiling:', error);
        }
      }, 1000);
    }
  };

  const handleSessionStopped = (session: DebugSession) => {
    
    if (activeSession?.id === session.id) {
      setActiveSession(null);
      setIsDebugging(false);
    }

    // Update metrics
    if (session.endTime && session.startTime) {
      const duration = session.endTime - session.startTime;
      setDebugMetrics(prev => ({
        ...prev,
        averageSessionDuration: (prev.averageSessionDuration + duration) / 2
      }));
    }

    showNotification({
      type: 'info',
      title: 'Debug Session Ended',
      message: `Debugging session "${session.name}" has ended`
    });

    // Save breakpoints if enabled
    saveBreakpoints();
  };

  const handleSessionPaused = () => {
    
    showNotification({
      type: 'info',
      title: 'Execution Paused',
      message: 'Program execution has been paused',
      duration: 3000
    });
  };

  const handleSessionContinued = () => {
    
  };

  const handleBreakpointHit = (breakpoint: SmartBreakpoint) => {
    
    setDebugMetrics(prev => ({
      ...prev,
      breakpointsHit: prev.breakpointsHit + 1
    }));

    // Show notification for important breakpoints
    if (breakpoint.intelligence.impactScore > 70) {
      showNotification({
        type: 'warning',
        title: 'Important Breakpoint Hit',
        message: `High-impact breakpoint at ${breakpoint.file}:${breakpoint.line}`,
        action: {
          label: 'View Location',
          callback: () => 
        }
      });
    }

    onBreakpointHit?.(breakpoint);

    // Auto-evaluate watches if enabled
    if (settings.autoEvaluateWatches) {
      setTimeout(() => {
        debugEngine.getWatchExpressions().forEach(watch => {
          debugEngine.evaluateWatchExpression(watch.expression.id);
        });
      }, 100);
    }
  };

  const handleBreakpointSet = (breakpoint: SmartBreakpoint) => {
    
    // Show intelligent recommendations
    if (settings.enableIntelligentInsights && breakpoint.intelligence.recommendations.length > 0) {
      showNotification({
        type: 'info',
        title: 'Smart Breakpoint Set',
        message: `Breakpoint with ${breakpoint.intelligence.recommendations.length} intelligent recommendations`,
        duration: 4000
      });
    }

    // Auto-save breakpoints
    setTimeout(saveBreakpoints, 100);
  };

  const handleBreakpointRemoved = (breakpoint: SmartBreakpoint) => {
    
    // Show analytics if breakpoint was frequently used
    if (breakpoint.hitCount > 10) {
      showNotification({
        type: 'info',
        title: 'Active Breakpoint Removed',
        message: `Removed breakpoint that was hit ${breakpoint.hitCount} times`,
        duration: 4000
      });
    }

    // Auto-save breakpoints
    setTimeout(saveBreakpoints, 100);
  };

  const handleStepExecuted = (data: { type: string; duration: number }) => {
    console.log('👟 Step executed:', data.type, `(${data.duration}ms)`);
    
    setDebugMetrics(prev => ({
      ...prev,
      stepExecutions: prev.stepExecutions + 1
    }));

    // Warn about slow steps
    if (data.duration > 1000) {
      showNotification({
        type: 'warning',
        title: 'Slow Step Execution',
        message: `Step ${data.type} took ${data.duration}ms to complete`,
        duration: 6000
      });
    }
  };

  const handleExecutionPaused = () => {
    
  };

  const handleExecutionContinued = () => {
    
  };

  const handleDebugInsight = (insight: DebugInsight) => {
    
    setDebugMetrics(prev => ({
      ...prev,
      insightsGenerated: prev.insightsGenerated + 1
    }));

    if (settings.enableIntelligentInsights) {
      showNotification({
        type: insight.severity === 'critical' || insight.severity === 'error' ? 'error' : 
              insight.severity === 'warning' ? 'warning' : 'info',
        title: `Debug Insight: ${insight.title}`,
        message: insight.description,
        action: {
          label: 'View Details',
          callback: () => 
        },
        autoClose: false
      });
    }

    onInsightGenerated?.(insight);
  };

  const handleProfilingStarted = (profile: any) => {
    
    showNotification({
      type: 'info',
      title: 'Performance Profiling Started',
      message: `Started ${profile.type} profiling for analysis`,
      duration: 3000
    });
  };

  const handleProfilingStopped = (profile: any) => {
    
    setDebugMetrics(prev => ({
      ...prev,
      performanceProfilesCreated: prev.performanceProfilesCreated + 1
    }));

    showNotification({
      type: 'success',
      title: 'Performance Profile Complete',
      message: `${profile.type} profiling complete - analysis available`,
      action: {
        label: 'View Profile',
        callback: () => 
      }
    });
  };

  const handleDebugError = (error: any) => {
    console.error('❌ Debug error:', error);
    
    showNotification({
      type: 'error',
      title: 'Debug Error',
      message: error.message || 'An unknown debug error occurred',
      autoClose: false,
      action: {
        label: 'Retry',
        callback: () => 
      }
    });
  };

  // Settings handlers
  const handleSettingsChange = (key: keyof DebugSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  if (!isInitialized) {
    return (
      <div className={`debug-integration debug-loading ${className}`}>
        <div className="debug-loading-content">
          <div className="debug-loading-spinner"></div>
          <h3>Initializing Advanced Debugging...</h3>
          <p>Setting up intelligent debugging capabilities</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`debug-integration ${className}`}>
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="debug-notifications">
          {notifications.slice(-5).map(notification => (
            <div 
              key={notification.id} 
              className={`debug-notification debug-notification-${notification.type}`}
            >
              <div className="debug-notification-content">
                <div className="debug-notification-header">
                  <strong>{notification.title}</strong>
                  <button 
                    onClick={() => dismissNotification(notification.id)}
                    className="debug-notification-close"
                  >
                    ✕
                  </button>
                </div>
                <div className="debug-notification-message">
                  {notification.message}
                </div>
                {notification.action && (
                  <div className="debug-notification-actions">
                    <button 
                      onClick={notification.action.callback}
                      className="debug-notification-action"
                    >
                      {notification.action.label}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="debug-settings-modal">
          <div className="debug-settings-content">
            <div className="debug-settings-header">
              <h3>Debug Settings</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="debug-settings-close"
              >
                ✕
              </button>
            </div>

            <div className="debug-settings-sections">
              <div className="debug-settings-section">
                <h4>General Settings</h4>
                <label className="debug-setting-item">
                  <input
                    type="checkbox"
                    checked={settings.autoStopOnEntry}
                    onChange={(e) => handleSettingsChange('autoStopOnEntry', e.target.checked)}
                  />
                  Auto-stop on entry
                </label>
                <label className="debug-setting-item">
                  <input
                    type="checkbox"
                    checked={settings.smartStepEnabled}
                    onChange={(e) => handleSettingsChange('smartStepEnabled', e.target.checked)}
                  />
                  Enable smart stepping
                </label>
                <label className="debug-setting-item">
                  <input
                    type="checkbox"
                    checked={settings.justMyCodeEnabled}
                    onChange={(e) => handleSettingsChange('justMyCodeEnabled', e.target.checked)}
                  />
                  Just My Code debugging
                </label>
                <label className="debug-setting-item">
                  <input
                    type="checkbox"
                    checked={settings.enableSourceMaps}
                    onChange={(e) => handleSettingsChange('enableSourceMaps', e.target.checked)}
                  />
                  Enable source maps
                </label>
              </div>

              <div className="debug-settings-section">
                <h4>Advanced Features</h4>
                <label className="debug-setting-item">
                  <input
                    type="checkbox"
                    checked={settings.enablePerformanceProfiling}
                    onChange={(e) => handleSettingsChange('enablePerformanceProfiling', e.target.checked)}
                  />
                  Auto-enable performance profiling
                </label>
                <label className="debug-setting-item">
                  <input
                    type="checkbox"
                    checked={settings.enableIntelligentInsights}
                    onChange={(e) => handleSettingsChange('enableIntelligentInsights', e.target.checked)}
                  />
                  Generate intelligent insights
                </label>
                <label className="debug-setting-item">
                  <input
                    type="checkbox"
                    checked={settings.autoSaveBreakpoints}
                    onChange={(e) => handleSettingsChange('autoSaveBreakpoints', e.target.checked)}
                  />
                  Auto-save breakpoints
                </label>
                <label className="debug-setting-item">
                  <input
                    type="checkbox"
                    checked={settings.autoEvaluateWatches}
                    onChange={(e) => handleSettingsChange('autoEvaluateWatches', e.target.checked)}
                  />
                  Auto-evaluate watch expressions
                </label>
              </div>

              <div className="debug-settings-section">
                <h4>Notifications</h4>
                <label className="debug-setting-item">
                  Notification Level:
                  <select
                    value={settings.notificationLevel}
                    onChange={(e) => handleSettingsChange('notificationLevel', e.target.value)}
                    className="debug-setting-select"
                  >
                    <option value="all">All notifications</option>
                    <option value="warnings">Warnings and errors</option>
                    <option value="errors">Errors only</option>
                    <option value="none">None</option>
                  </select>
                </label>
                <label className="debug-setting-item">
                  Max console messages:
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    value={settings.maxConsoleMessages}
                    onChange={(e) => handleSettingsChange('maxConsoleMessages', parseInt(e.target.value))}
                    className="debug-setting-input"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Debug Dashboard */}
      <div className="debug-main-container">
        {/* Debug Status Bar */}
        <div className="debug-status-bar">
          <div className="debug-status-info">
            {isDebugging && activeSession ? (
              <div className="debug-active-info">
                <span className={`debug-status-indicator debug-status-${activeSession.status}`}>
                  ●
                </span>
                <span>Debugging: {activeSession.name}</span>
                <span className="debug-session-duration">
                  {Math.floor((Date.now() - activeSession.startTime) / 1000)}s
                </span>
              </div>
            ) : (
              <span className="debug-inactive-info">Not debugging</span>
            )}
          </div>

          <div className="debug-status-actions">
            <div className="debug-metrics-summary">
              <span title="Sessions started">🚀 {debugMetrics.sessionsStarted}</span>
              <span title="Breakpoints hit">📍 {debugMetrics.breakpointsHit}</span>
              <span title="Insights generated">🔍 {debugMetrics.insightsGenerated}</span>
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="debug-settings-button"
              title="Debug Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Debug Dashboard */}
        <DebugDashboard
          debugEngine={debugEngine}
          onSessionStart={(session) => console.log('Session started in dashboard:', session.id)}
          onSessionStop={(sessionId) => console.log('Session stopped in dashboard:', sessionId)}
          className="debug-dashboard-main"
        />
      </div>
    </div>
  );
};

export default DebugIntegration;
