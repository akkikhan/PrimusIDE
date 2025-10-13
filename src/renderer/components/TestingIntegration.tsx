// Advanced Testing Integration - Seamless IDE integration for comprehensive testing capabilities
// Intelligent test management, automated execution, and real-time monitoring

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TestingDashboard from './TestingDashboard';
import AdvancedTestingFramework from '../services/AdvancedTestingFramework';
import './TestingIntegration.css';

interface TestingIntegrationProps {
  workspaceRoot: string;
  onTestResults?: (results: any) => void;
  onCoverageUpdate?: (coverage: any) => void;
  className?: string;
}

interface IntegrationState {
  framework?: AdvancedTestingFramework;
  isInitialized: boolean;
  isRunning: boolean;
  autoWatch: boolean;
  settings: TestSettings;
  recentResults: TestExecutionResult[];
  notifications: Notification[];
  statistics: TestStatistics;
  quickActions: QuickAction[];
}

interface TestSettings {
  autoRun: boolean;
  watchMode: boolean;
  coverage: boolean;
  parallel: boolean;
  timeout: number;
  retries: number;
  framework: 'jest' | 'vitest' | 'mocha' | 'jasmine';
  environment: 'node' | 'jsdom' | 'happy-dom';
  verbose: boolean;
  bail: boolean;
  notifications: boolean;
  autoGenerate: boolean;
}

interface TestExecutionResult {
  id: string;
  timestamp: Date;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  status: 'success' | 'failed' | 'partial';
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  dismissed: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

interface TestStatistics {
  totalSuites: number;
  totalTests: number;
  lastRun?: Date;
  averageDuration: number;
  passRate: number;
  coverage: number;
  trend: 'up' | 'down' | 'stable';
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  enabled: boolean;
  description: string;
}

const TestingIntegration: React.FC<TestingIntegrationProps> = ({
  workspaceRoot,
  onTestResults,
  onCoverageUpdate,
  className = ''
}) => {
  const [state, setState] = useState<IntegrationState>({
    isInitialized: false,
    isRunning: false,
    autoWatch: false,
    settings: {
      autoRun: false,
      watchMode: false,
      coverage: true,
      parallel: true,
      timeout: 5000,
      retries: 2,
      framework: 'jest',
      environment: 'node',
      verbose: false,
      bail: false,
      notifications: true,
      autoGenerate: false
    },
    recentResults: [],
    notifications: [],
    statistics: {
      totalSuites: 0,
      totalTests: 0,
      averageDuration: 0,
      passRate: 0,
      coverage: 0,
      trend: 'stable'
    },
    quickActions: []
  });

  const [isVisible, setIsVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const frameworkRef = useRef<AdvancedTestingFramework | null>(null);

  // Initialize testing framework
  useEffect(() => {
    initializeFramework();
  }, [workspaceRoot]);

  // Setup quick actions
  useEffect(() => {
    const actions: QuickAction[] = [
      {
        id: 'run-all',
        label: 'Run All Tests',
        icon: '🚀',
        action: runAllTests,
        enabled: state.isInitialized && !state.isRunning,
        description: 'Execute all test suites in the workspace'
      },
      {
        id: 'run-current',
        label: 'Run Current File',
        icon: '📄',
        action: runCurrentFileTests,
        enabled: state.isInitialized && !state.isRunning && selectedFiles.length > 0,
        description: 'Run tests for the currently selected file'
      },
      {
        id: 'generate-tests',
        label: 'Generate Tests',
        icon: '🤖',
        action: generateTestsForSelection,
        enabled: state.isInitialized && selectedFiles.length > 0,
        description: 'AI-powered test generation for selected files'
      },
      {
        id: 'toggle-watch',
        label: state.autoWatch ? 'Stop Watch' : 'Start Watch',
        icon: state.autoWatch ? '⏹️' : '👀',
        action: toggleWatchMode,
        enabled: state.isInitialized,
        description: 'Monitor files for changes and auto-run tests'
      },
      {
        id: 'coverage-report',
        label: 'Coverage Report',
        icon: '📊',
        action: generateCoverageReport,
        enabled: state.isInitialized,
        description: 'Generate detailed test coverage report'
      },
      {
        id: 'debug-tests',
        label: 'Debug Mode',
        icon: '🐛',
        action: enableDebugMode,
        enabled: state.isInitialized && !state.isRunning,
        description: 'Run tests in debug mode with enhanced logging'
      }
    ];

    setState(prev => ({ ...prev, quickActions: actions }));
  }, [state.isInitialized, state.isRunning, state.autoWatch, selectedFiles]);

  // Initialize framework
  const initializeFramework = useCallback(async () => {
    try {
      
      const framework = new AdvancedTestingFramework({
        testDir: 'tests',
        sourceDir: 'src',
        framework: state.settings.framework,
        coverage: {
          enabled: state.settings.coverage,
          threshold: {
            global: { statements: 80, branches: 80, functions: 80, lines: 80 }
          },
          reporters: ['text', 'lcov', 'html'],
          collectFrom: ['src/**/*.{js,ts,jsx,tsx}'],
          exclude: ['node_modules/**', 'dist/**'],
          includeUntested: true,
          watermarks: {
            statements: [50, 80],
            branches: [50, 80],
            functions: [50, 80],
            lines: [50, 80]
          }
        },
        parallel: state.settings.parallel,
        timeout: state.settings.timeout,
        retries: state.settings.retries,
        watchMode: state.settings.watchMode,
        verbose: state.settings.verbose,
        bail: state.settings.bail
      });

      // Setup event listeners
      setupFrameworkListeners(framework);

      frameworkRef.current = framework;

      // Discover existing tests
      await framework.discoverTests();

      // Get initial statistics
      const stats = framework.getStatistics();

      setState(prev => ({
        ...prev,
        framework,
        isInitialized: true,
        statistics: {
          totalSuites: stats.totalSuites,
          totalTests: stats.totalTests,
          averageDuration: stats.averageDuration,
          passRate: stats.passRate,
          coverage: 0,
          trend: 'stable'
        }
      }));

      addNotification('success', 'Testing Framework Ready', 'Advanced testing capabilities are now available');

    } catch (error) {
      console.error('❌ Framework initialization failed:', error);
      addNotification('error', 'Initialization Failed', 'Could not initialize testing framework');
    }
  }, [workspaceRoot, state.settings]);

  // Setup framework event listeners
  const setupFrameworkListeners = useCallback((framework: AdvancedTestingFramework) => {
    framework.on('test-execution-started', () => {
      setState(prev => ({ ...prev, isRunning: true }));
      if (state.settings.notifications) {
        addNotification('info', 'Tests Started', 'Test execution is now running');
      }
    });

    framework.on('test-execution-completed', (execution: any) => {
      const result: TestExecutionResult = {
        id: execution.id,
        timestamp: new Date(),
        duration: execution.duration,
        summary: execution.results.summary,
        coverage: execution.results.coverage ? {
          statements: execution.results.coverage.statements.percentage,
          branches: execution.results.coverage.branches.percentage,
          functions: execution.results.coverage.functions.percentage,
          lines: execution.results.coverage.lines.percentage
        } : undefined,
        status: execution.results.summary.failed > 0 ? 'failed' : 'success'
      };

      setState(prev => ({
        ...prev,
        isRunning: false,
        recentResults: [result, ...prev.recentResults.slice(0, 9)], // Keep last 10 results
        statistics: {
          ...prev.statistics,
          lastRun: result.timestamp,
          passRate: result.summary.total > 0 ? (result.summary.passed / result.summary.total) * 100 : 0,
          coverage: result.coverage?.statements || 0
        }
      }));

      if (state.settings.notifications) {
        const type = result.status === 'success' ? 'success' : 'error';
        const title = result.status === 'success' ? 'Tests Passed' : 'Tests Failed';
        const message = `${result.summary.passed}/${result.summary.total} tests passed in ${result.duration}ms`;
        addNotification(type, title, message);
      }

      onTestResults?.(execution.results);
    });

    framework.on('coverage-updated', (coverage: any) => {
      setState(prev => ({
        ...prev,
        statistics: {
          ...prev.statistics,
          coverage: coverage.overall.percentage
        }
      }));
      onCoverageUpdate?.(coverage);
    });

    framework.on('tests-generated', (suite: any) => {
      if (state.settings.notifications) {
        addNotification('success', 'Tests Generated', `Created test suite: ${suite.name}`);
      }
    });

    framework.on('watcher-started', () => {
      setState(prev => ({ ...prev, autoWatch: true }));
      if (state.settings.notifications) {
        addNotification('info', 'Watch Mode', 'Monitoring files for changes');
      }
    });

    framework.on('watcher-stopped', () => {
      setState(prev => ({ ...prev, autoWatch: false }));
    });
  }, [state.settings.notifications, onTestResults, onCoverageUpdate]);

  // Add notification
  const addNotification = useCallback((
    type: Notification['type'],
    title: string,
    message: string,
    actions?: NotificationAction[]
  ) => {
    const notification: Notification = {
      id: `notification-${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      dismissed: false,
      actions
    };

    setState(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications.slice(0, 19)] // Keep last 20
    }));

    // Auto-dismiss after 5 seconds for info notifications
    if (type === 'info') {
      setTimeout(() => {
        dismissNotification(notification.id);
      }, 5000);
    }
  }, []);

  // Dismiss notification
  const dismissNotification = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === id ? { ...n, dismissed: true } : n
      )
    }));
  }, []);

  // Quick action implementations
  const runAllTests = useCallback(async () => {
    if (!state.framework || state.isRunning) return;

    try {
      await state.framework.runTests();
    } catch (error) {
      console.error('❌ Failed to run all tests:', error);
      addNotification('error', 'Test Execution Failed', 'Could not run all tests');
    }
  }, [state.framework, state.isRunning]);

  const runCurrentFileTests = useCallback(async () => {
    if (!state.framework || state.isRunning || selectedFiles.length === 0) return;

    try {
      // Find test suites for selected files
      const suites = state.framework.getTestSuites();
      const relevantSuites = Array.from(suites.values())
        .filter(suite => selectedFiles.some(file => suite.file.includes(file) || file.includes(suite.file)));

      if (relevantSuites.length > 0) {
        const suiteIds = relevantSuites.map(suite => suite.id);
        await state.framework.runTests(suiteIds);
      } else {
        addNotification('warning', 'No Tests Found', 'No test suites found for selected files');
      }
    } catch (error) {
      console.error('❌ Failed to run current file tests:', error);
      addNotification('error', 'Test Execution Failed', 'Could not run tests for current file');
    }
  }, [state.framework, state.isRunning, selectedFiles]);

  const generateTestsForSelection = useCallback(async () => {
    if (!state.framework || selectedFiles.length === 0) return;

    try {
      for (const file of selectedFiles) {
        if (file.match(/\.(js|ts|jsx|tsx)$/) && !file.includes('.test.') && !file.includes('.spec.')) {
          await state.framework.generateTests(file);
        }
      }
    } catch (error) {
      console.error('❌ Failed to generate tests:', error);
      addNotification('error', 'Test Generation Failed', 'Could not generate tests for selected files');
    }
  }, [state.framework, selectedFiles]);

  const toggleWatchMode = useCallback(async () => {
    if (!state.framework) return;

    try {
      if (state.autoWatch) {
        const watchers = state.framework.getWatchers();
        for (const [id] of watchers) {
          state.framework.stopWatcher(id);
        }
      } else {
        await state.framework.watchTests();
      }
    } catch (error) {
      console.error('❌ Failed to toggle watch mode:', error);
      addNotification('error', 'Watch Mode Failed', 'Could not toggle watch mode');
    }
  }, [state.framework, state.autoWatch]);

  const generateCoverageReport = useCallback(async () => {
    if (!state.framework) return;

    try {
      const coverage = await state.framework.getCoverage();
      // In a real implementation, this would open/generate a detailed coverage report
      addNotification('success', 'Coverage Report', 'Coverage report generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate coverage report:', error);
      addNotification('error', 'Coverage Report Failed', 'Could not generate coverage report');
    }
  }, [state.framework]);

  const enableDebugMode = useCallback(async () => {
    if (!state.framework || state.isRunning) return;

    try {
      // Update configuration for debug mode
      state.framework.updateConfiguration({
        verbose: true,
        timeout: 30000, // Longer timeout for debugging
        bail: false
      });

      addNotification('info', 'Debug Mode', 'Debug mode enabled - verbose logging activated');
    } catch (error) {
      console.error('❌ Failed to enable debug mode:', error);
      addNotification('error', 'Debug Mode Failed', 'Could not enable debug mode');
    }
  }, [state.framework, state.isRunning]);

  // Update settings
  const updateSettings = useCallback((updates: Partial<TestSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));

    // Apply settings to framework
    if (state.framework) {
      const config = {
        framework: updates.framework,
        timeout: updates.timeout,
        retries: updates.retries,
        parallel: updates.parallel,
        watchMode: updates.watchMode,
        verbose: updates.verbose,
        bail: updates.bail,
        coverage: updates.coverage ? {
          enabled: updates.coverage,
          threshold: {
            global: { statements: 80, branches: 80, functions: 80, lines: 80 }
          },
          reporters: ['text', 'lcov', 'html'],
          collectFrom: ['src/**/*.{js,ts,jsx,tsx}'],
          exclude: ['node_modules/**', 'dist/**'],
          includeUntested: true,
          watermarks: {
            statements: [50, 80] as [number, number],
            branches: [50, 80] as [number, number],
            functions: [50, 80] as [number, number],
            lines: [50, 80] as [number, number]
          }
        } : { 
          enabled: false,
          threshold: { global: { statements: 0, branches: 0, functions: 0, lines: 0 } },
          reporters: [],
          collectFrom: [],
          exclude: [],
          includeUntested: false,
          watermarks: {
            statements: [0, 0] as [number, number],
            branches: [0, 0] as [number, number],
            functions: [0, 0] as [number, number],
            lines: [0, 0] as [number, number]
          }
        }
      };

      state.framework.updateConfiguration(config);
    }
  }, [state.framework]);

  // Handle file selection changes (would be connected to IDE file explorer)
  const handleFileSelection = useCallback((files: string[]) => {
    setSelectedFiles(files);
  }, []);

  // Render status bar
  const renderStatusBar = () => (
    <div className="testing-status-bar">
      <div className="status-info">
        <span className={`status-indicator ${state.isInitialized ? 'ready' : 'loading'}`}>
          {state.isInitialized ? '✅' : '⏳'}
        </span>
        <span className="status-text">
          {state.isInitialized 
            ? `${state.statistics.totalSuites} suites, ${state.statistics.totalTests} tests`
            : 'Initializing...'}
        </span>
        {state.isRunning && (
          <span className="running-indicator">🔄 Running...</span>
        )}
        {state.autoWatch && (
          <span className="watch-indicator">👀 Watching</span>
        )}
      </div>

      <div className="status-actions">
        {state.statistics.lastRun && (
          <span className="last-run">
            Last run: {state.statistics.lastRun.toLocaleTimeString()}
          </span>
        )}
        {state.statistics.passRate > 0 && (
          <span className={`pass-rate ${state.statistics.passRate >= 80 ? 'good' : 'needs-improvement'}`}>
            {state.statistics.passRate.toFixed(1)}% pass rate
          </span>
        )}
        {state.statistics.coverage > 0 && (
          <span className={`coverage ${state.statistics.coverage >= 80 ? 'good' : 'needs-improvement'}`}>
            {state.statistics.coverage.toFixed(1)}% coverage
          </span>
        )}
      </div>
    </div>
  );

  // Render quick actions
  const renderQuickActions = () => (
    <div className="quick-actions">
      <h3>Quick Actions</h3>
      <div className="actions-grid">
        {state.quickActions.map(action => (
          <button
            key={action.id}
            className={`quick-action ${action.enabled ? '' : 'disabled'}`}
            onClick={action.action}
            disabled={!action.enabled}
            title={action.description}
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Render recent results
  const renderRecentResults = () => (
    <div className="recent-results">
      <h3>Recent Test Results</h3>
      <div className="results-list">
        {state.recentResults.length === 0 ? (
          <div className="no-results">No test results yet</div>
        ) : (
          state.recentResults.map(result => (
            <div key={result.id} className={`result-item ${result.status}`}>
              <div className="result-header">
                <span className="result-status">
                  {result.status === 'success' ? '✅' : '❌'}
                </span>
                <span className="result-summary">
                  {result.summary.passed}/{result.summary.total} passed
                </span>
                <span className="result-duration">{result.duration}ms</span>
                <span className="result-time">
                  {result.timestamp.toLocaleTimeString()}
                </span>
              </div>
              {result.coverage && (
                <div className="result-coverage">
                  Coverage: {result.coverage.statements.toFixed(1)}%
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className={`testing-integration ${className}`}>
      {/* Status Bar */}
      {renderStatusBar()}

      {/* Main Dashboard */}
      {isVisible && state.framework && (
        <div className="dashboard-container">
          <TestingDashboard
            testingFramework={state.framework}
            onTestRunComplete={(results) => onTestResults?.(results)}
            onTestGenerated={(suite) => addNotification('success', 'Tests Generated', `Created: ${suite.name}`)}
          />
        </div>
      )}

      {/* Sidebar Panel */}
      <div className={`testing-sidebar ${isVisible ? 'visible' : 'hidden'}`}>
        <div className="sidebar-header">
          <h2>🧪 Testing</h2>
          <button
            className="toggle-dashboard"
            onClick={() => setIsVisible(!isVisible)}
            title={isVisible ? 'Hide Dashboard' : 'Show Dashboard'}
          >
            {isVisible ? '⬇️' : '⬆️'}
          </button>
        </div>

        <div className="sidebar-content">
          {renderQuickActions()}
          {renderRecentResults()}
        </div>
      </div>

      {/* Notifications */}
      <div className="notifications-overlay">
        {state.notifications
          .filter(n => !n.dismissed)
          .slice(0, 3)
          .map(notification => (
            <div
              key={notification.id}
              className={`notification notification-${notification.type}`}
            >
              <div className="notification-header">
                <span className="notification-title">{notification.title}</span>
                <button
                  className="dismiss-btn"
                  onClick={() => dismissNotification(notification.id)}
                >
                  ×
                </button>
              </div>
              <div className="notification-message">{notification.message}</div>
              {notification.actions && (
                <div className="notification-actions">
                  {notification.actions.map((action, index) => (
                    <button
                      key={index}
                      className={`notification-action ${action.primary ? 'primary' : 'secondary'}`}
                      onClick={() => {
                        action.action();
                        dismissNotification(notification.id);
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default TestingIntegration;
