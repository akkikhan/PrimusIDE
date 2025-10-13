// Advanced Testing Dashboard - Interactive testing interface with comprehensive management capabilities
// Real-time test execution, coverage visualization, and intelligent test management

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './TestingDashboard.css';

interface TestingDashboardProps {
  testingFramework: any; // AdvancedTestingFramework instance
  onTestRunComplete?: (results: any) => void;
  onTestGenerated?: (suite: any) => void;
  className?: string;
}

interface DashboardState {
  activeView: 'overview' | 'suites' | 'coverage' | 'reports' | 'settings';
  testSuites: Map<string, any>;
  activeExecution?: any;
  coverage?: any;
  statistics: any;
  isRunning: boolean;
  selectedSuites: Set<string>;
  filterCriteria: FilterCriteria;
  watchMode: boolean;
  autoRun: boolean;
}

interface FilterCriteria {
  status: 'all' | 'passed' | 'failed' | 'skipped' | 'pending';
  type: 'all' | 'unit' | 'integration' | 'e2e' | 'component';
  tags: string[];
  search: string;
  dateRange?: [Date, Date];
}

interface TestSuiteCardProps {
  suite: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRun: (id: string) => void;
  onView: (id: string) => void;
}

interface CoverageVisualizationProps {
  coverage: any;
  onFileSelect?: (file: string) => void;
}

interface TestExecutionProgressProps {
  execution: any;
  onCancel?: () => void;
}

const TestingDashboard: React.FC<TestingDashboardProps> = ({
  testingFramework,
  onTestRunComplete,
  onTestGenerated,
  className = ''
}) => {
  const [state, setState] = useState<DashboardState>({
    activeView: 'overview',
    testSuites: new Map(),
    statistics: null,
    isRunning: false,
    selectedSuites: new Set(),
    filterCriteria: {
      status: 'all',
      type: 'all',
      tags: [],
      search: ''
    },
    watchMode: false,
    autoRun: false
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  // Initialize dashboard
  useEffect(() => {
    if (!testingFramework) return;

    const initializeDashboard = async () => {
      try {
        // Discover existing tests
        await testingFramework.discoverTests();
        
        // Get initial statistics
        const stats = testingFramework.getStatistics();
        const suites = testingFramework.getTestSuites();

        setState(prev => ({
          ...prev,
          testSuites: suites,
          statistics: stats
        }));

      } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        addNotification('error', 'Failed to initialize testing dashboard');
      }
    };

    initializeDashboard();
    setupEventListeners();
  }, [testingFramework]);

  // Setup event listeners
  const setupEventListeners = useCallback(() => {
    if (!testingFramework) return;

    testingFramework.on('tests-discovered', (suites: any[]) => {
      setState(prev => {
        const newSuites = new Map(prev.testSuites);
        suites.forEach(suite => newSuites.set(suite.id, suite));
        return { ...prev, testSuites: newSuites };
      });
      addNotification('info', `Discovered ${suites.length} test suites`);
    });

    testingFramework.on('test-execution-started', (execution: any) => {
      setState(prev => ({
        ...prev,
        activeExecution: execution,
        isRunning: true
      }));
      addNotification('info', 'Test execution started');
    });

    testingFramework.on('test-execution-completed', (execution: any) => {
      setState(prev => ({
        ...prev,
        activeExecution: undefined,
        isRunning: false,
        statistics: testingFramework.getStatistics()
      }));
      
      const { summary } = execution.results;
      const status = summary.failed > 0 ? 'error' : 'success';
      addNotification(status, `Tests completed: ${summary.passed}/${summary.total} passed`);
      
      onTestRunComplete?.(execution.results);
    });

    testingFramework.on('test-completed', (result: any) => {
      // Update suite with test result
      setState(prev => {
        const newSuites = new Map(prev.testSuites);
        const suite = Array.from(newSuites.values()).find(s => 
          s.tests.some((t: any) => t.id === result.testId)
        );
        
        if (suite) {
          const test = suite.tests.find((t: any) => t.id === result.testId);
          if (test) {
            test.results = result;
            test.status = result.status;
            newSuites.set(suite.id, { ...suite });
          }
        }
        
        return { ...prev, testSuites: newSuites };
      });
    });

    testingFramework.on('coverage-updated', (coverage: any) => {
      setState(prev => ({ ...prev, coverage }));
    });

    testingFramework.on('tests-generated', (suite: any) => {
      setState(prev => {
        const newSuites = new Map(prev.testSuites);
        newSuites.set(suite.id, suite);
        return { ...prev, testSuites: newSuites };
      });
      addNotification('success', `Generated test suite: ${suite.name}`);
      onTestGenerated?.(suite);
    });
  }, [testingFramework, onTestRunComplete, onTestGenerated]);

  // Add notification
  const addNotification = useCallback((type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const notification = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date(),
      dismissed: false
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, dismissed: true } : n)
      );
    }, 5000);
  }, []);

  // Filter test suites
  const filteredSuites = useMemo(() => {
    return Array.from(state.testSuites.values()).filter(suite => {
      // Status filter
      if (state.filterCriteria.status !== 'all') {
        if (state.filterCriteria.status !== suite.status) return false;
      }

      // Type filter
      if (state.filterCriteria.type !== 'all') {
        if (state.filterCriteria.type !== suite.type) return false;
      }

      // Tags filter
      if (state.filterCriteria.tags.length > 0) {
        const hasTag = state.filterCriteria.tags.some(tag => suite.tags.includes(tag));
        if (!hasTag) return false;
      }

      // Search filter
      if (state.filterCriteria.search) {
        const search = state.filterCriteria.search.toLowerCase();
        const matchesName = suite.name.toLowerCase().includes(search);
        const matchesDescription = suite.description?.toLowerCase().includes(search);
        const matchesFile = suite.file.toLowerCase().includes(search);
        
        if (!matchesName && !matchesDescription && !matchesFile) return false;
      }

      return true;
    });
  }, [state.testSuites, state.filterCriteria]);

  // Run selected tests
  const runSelectedTests = useCallback(async () => {
    if (state.selectedSuites.size === 0) {
      addNotification('warning', 'No test suites selected');
      return;
    }

    try {
      const suiteIds = Array.from(state.selectedSuites);
      await testingFramework.runTests(suiteIds);
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      addNotification('error', 'Test execution failed');
    }
  }, [state.selectedSuites, testingFramework]);

  // Run all tests
  const runAllTests = useCallback(async () => {
    try {
      await testingFramework.runTests();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      addNotification('error', 'Test execution failed');
    }
  }, [testingFramework]);

  // Generate tests for file
  const generateTests = useCallback(async (targetFile: string) => {
    try {
      await testingFramework.generateTests(targetFile);
    } catch (error) {
      console.error('❌ Test generation failed:', error);
      addNotification('error', 'Test generation failed');
    }
  }, [testingFramework]);

  // Toggle watch mode
  const toggleWatchMode = useCallback(async () => {
    try {
      if (state.watchMode) {
        // Stop watching
        const watchers = testingFramework.getWatchers();
        for (const [id] of watchers) {
          testingFramework.stopWatcher(id);
        }
        setState(prev => ({ ...prev, watchMode: false }));
        addNotification('info', 'Watch mode stopped');
      } else {
        // Start watching
        await testingFramework.watchTests();
        setState(prev => ({ ...prev, watchMode: true }));
        addNotification('info', 'Watch mode started');
      }
    } catch (error) {
      console.error('❌ Watch mode toggle failed:', error);
      addNotification('error', 'Failed to toggle watch mode');
    }
  }, [state.watchMode, testingFramework]);

  // Update filter criteria
  const updateFilter = useCallback((updates: Partial<FilterCriteria>) => {
    setState(prev => ({
      ...prev,
      filterCriteria: { ...prev.filterCriteria, ...updates }
    }));
  }, []);

  // Toggle suite selection
  const toggleSuiteSelection = useCallback((suiteId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedSuites);
      if (newSelected.has(suiteId)) {
        newSelected.delete(suiteId);
      } else {
        newSelected.add(suiteId);
      }
      return { ...prev, selectedSuites: newSelected };
    });
  }, []);

  // Select all filtered suites
  const selectAllFiltered = useCallback(() => {
    const filteredIds = filteredSuites.map(suite => suite.id);
    setState(prev => ({
      ...prev,
      selectedSuites: new Set(filteredIds)
    }));
  }, [filteredSuites]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedSuites: new Set()
    }));
  }, []);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(section)) {
        newExpanded.delete(section);
      } else {
        newExpanded.add(section);
      }
      return newExpanded;
    });
  }, []);

  // Render overview
  const renderOverview = () => (
    <div className="testing-overview">
      <div className="overview-header">
        <h2>Testing Overview</h2>
        <div className="overview-actions">
          <button 
            className="btn-primary"
            onClick={runAllTests}
            disabled={state.isRunning}
          >
            {state.isRunning ? 'Running...' : 'Run All Tests'}
          </button>
          <button 
            className={`btn-secondary ${state.watchMode ? 'active' : ''}`}
            onClick={toggleWatchMode}
          >
            {state.watchMode ? 'Stop Watch' : 'Watch Mode'}
          </button>
        </div>
      </div>

      {state.statistics && (
        <div className="statistics-grid">
          <div className="stat-card">
            <div className="stat-value">{state.statistics.totalSuites}</div>
            <div className="stat-label">Test Suites</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{state.statistics.totalTests}</div>
            <div className="stat-label">Total Tests</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{state.statistics.passRate.toFixed(1)}%</div>
            <div className="stat-label">Pass Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{state.statistics.averageDuration.toFixed(0)}ms</div>
            <div className="stat-label">Avg Duration</div>
          </div>
        </div>
      )}

      {state.activeExecution && (
        <TestExecutionProgress 
          execution={state.activeExecution}
          onCancel={() => addNotification('info', 'Cancel functionality not implemented')}
        />
      )}

      {state.coverage && (
        <CoverageVisualization 
          coverage={state.coverage}
          onFileSelect={(file) => addNotification('info', `Selected file: ${file}`)}
        />
      )}
    </div>
  );

  // Render test suites
  const renderTestSuites = () => (
    <div className="test-suites-view">
      <div className="suites-header">
        <h2>Test Suites</h2>
        <div className="suites-actions">
          <button 
            className="btn-primary"
            onClick={runSelectedTests}
            disabled={state.isRunning || state.selectedSuites.size === 0}
          >
            Run Selected ({state.selectedSuites.size})
          </button>
          <button 
            className="btn-secondary"
            onClick={selectAllFiltered}
          >
            Select All Filtered
          </button>
          <button 
            className="btn-secondary"
            onClick={clearSelection}
          >
            Clear Selection
          </button>
        </div>
      </div>

      <div className="suites-filters">
        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select 
            id="status-filter"
            value={state.filterCriteria.status}
            onChange={(e) => updateFilter({ status: e.target.value as any })}
            aria-label="Filter by test status"
          >
            <option value="all">All</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="type-filter">Type:</label>
          <select 
            id="type-filter"
            value={state.filterCriteria.type}
            onChange={(e) => updateFilter({ type: e.target.value as any })}
            aria-label="Filter by test type"
          >
            <option value="all">All</option>
            <option value="unit">Unit</option>
            <option value="integration">Integration</option>
            <option value="e2e">E2E</option>
            <option value="component">Component</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="search-filter">Search:</label>
          <input
            id="search-filter"
            type="text"
            placeholder="Search suites..."
            value={state.filterCriteria.search}
            onChange={(e) => updateFilter({ search: e.target.value })}
            aria-label="Search test suites"
          />
        </div>
      </div>

      <div className="suites-grid">
        {filteredSuites.map(suite => (
          <TestSuiteCard
            key={suite.id}
            suite={suite}
            isSelected={state.selectedSuites.has(suite.id)}
            onSelect={toggleSuiteSelection}
            onRun={(id) => testingFramework.runTests([id])}
            onView={(id) => addNotification('info', `Viewing suite: ${id}`)}
          />
        ))}
      </div>
    </div>
  );

  // Render coverage view
  const renderCoverage = () => (
    <div className="coverage-view">
      <h2>Test Coverage</h2>
      {state.coverage ? (
        <CoverageVisualization 
          coverage={state.coverage}
          onFileSelect={(file) => addNotification('info', `Selected file: ${file}`)}
        />
      ) : (
        <div className="coverage-placeholder">
          <p>No coverage data available. Run tests to generate coverage report.</p>
          <button className="btn-primary" onClick={runAllTests}>
            Run Tests
          </button>
        </div>
      )}
    </div>
  );

  // Render settings view
  const renderSettings = () => (
    <div className="settings-view">
      <h2>Testing Settings</h2>
      <div className="settings-grid">
        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              checked={state.autoRun}
              onChange={(e) => setState(prev => ({ ...prev, autoRun: e.target.checked }))}
            />
            Auto-run tests on file changes
          </label>
        </div>
        
        <div className="setting-group">
          <label>Framework:</label>
          <select defaultValue="jest">
            <option value="jest">Jest</option>
            <option value="vitest">Vitest</option>
            <option value="mocha">Mocha</option>
            <option value="jasmine">Jasmine</option>
          </select>
        </div>

        <div className="setting-group">
          <label>Test timeout (ms):</label>
          <input type="number" defaultValue={5000} min={1000} max={30000} />
        </div>

        <div className="setting-group">
          <label>Coverage threshold (%):</label>
          <input type="number" defaultValue={80} min={0} max={100} />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`testing-dashboard ${className}`}>
      <div className="dashboard-header">
        <h1>🧪 Advanced Testing Framework</h1>
        <div className="dashboard-nav">
          {['overview', 'suites', 'coverage', 'reports', 'settings'].map(view => (
            <button
              key={view}
              className={`nav-btn ${state.activeView === view ? 'active' : ''}`}
              onClick={() => setState(prev => ({ ...prev, activeView: view as any }))}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        {state.activeView === 'overview' && renderOverview()}
        {state.activeView === 'suites' && renderTestSuites()}
        {state.activeView === 'coverage' && renderCoverage()}
        {state.activeView === 'reports' && (
          <div className="reports-view">
            <h2>Test Reports</h2>
            <p>Reports functionality coming soon...</p>
          </div>
        )}
        {state.activeView === 'settings' && renderSettings()}
      </div>

      {/* Notifications */}
      <div className="notifications-container">
        {notifications
          .filter(n => !n.dismissed)
          .slice(-5)
          .map(notification => (
            <div
              key={notification.id}
              className={`notification notification-${notification.type}`}
            >
              <span>{notification.message}</span>
              <button 
                onClick={() => setNotifications(prev => 
                  prev.map(n => n.id === notification.id ? { ...n, dismissed: true } : n)
                )}
              >
                ×
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};

// Test Suite Card Component
const TestSuiteCard: React.FC<TestSuiteCardProps> = ({
  suite,
  isSelected,
  onSelect,
  onRun,
  onView
}) => {
  const statusIcons = {
    passed: '✅',
    failed: '❌',
    skipped: '⏭️',
    pending: '⏳',
    running: '🔄'
  } as const;
  
  const statusIcon = statusIcons[suite.status as keyof typeof statusIcons] || '❓';

  const testCount = suite.tests?.length || 0;
  const passedCount = suite.tests?.filter((t: any) => t.status === 'passed').length || 0;

  return (
    <div className={`test-suite-card ${isSelected ? 'selected' : ''} ${suite.status}`}>
      <div className="suite-header">
        <div className="suite-info">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(suite.id)}
            aria-label={`Select test suite ${suite.name}`}
          />
          <span className="suite-status">{statusIcon}</span>
          <h3>{suite.name}</h3>
        </div>
        <div className="suite-actions">
          <button className="btn-small" onClick={() => onRun(suite.id)}>
            Run
          </button>
          <button className="btn-small" onClick={() => onView(suite.id)}>
            View
          </button>
        </div>
      </div>

      <div className="suite-details">
        <p className="suite-description">{suite.description}</p>
        <div className="suite-meta">
          <span className="suite-file">{suite.file}</span>
          <span className="suite-type">{suite.type}</span>
        </div>
        <div className="suite-stats">
          <span>{testCount} tests</span>
          {suite.results && (
            <span>{passedCount}/{testCount} passed</span>
          )}
        </div>
        <div className="suite-tags">
          {suite.tags?.map((tag: string) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Coverage Visualization Component
const CoverageVisualization: React.FC<CoverageVisualizationProps> = ({
  coverage,
  onFileSelect
}) => {
  return (
    <div className="coverage-visualization">
      <h3>Coverage Overview</h3>
      
      <div className="coverage-summary">
        <div className="coverage-metric">
          <div className="metric-label">Statements</div>
          <div className="metric-bar">
            <div 
              className="metric-fill metric-fill-statements"
              data-percentage={coverage.statements.percentage}
            />
          </div>
          <div className="metric-value">{coverage.statements.percentage}%</div>
        </div>

        <div className="coverage-metric">
          <div className="metric-label">Branches</div>
          <div className="metric-bar">
            <div 
              className="metric-fill metric-fill-branches"
              data-percentage={coverage.branches.percentage}
            />
          </div>
          <div className="metric-value">{coverage.branches.percentage}%</div>
        </div>

        <div className="coverage-metric">
          <div className="metric-label">Functions</div>
          <div className="metric-bar">
            <div 
              className="metric-fill metric-fill-functions"
              data-percentage={coverage.functions.percentage}
            />
          </div>
          <div className="metric-value">{coverage.functions.percentage}%</div>
        </div>

        <div className="coverage-metric">
          <div className="metric-label">Lines</div>
          <div className="metric-bar">
            <div 
              className="metric-fill metric-fill-lines"
              data-percentage={coverage.lines.percentage}
            />
          </div>
          <div className="metric-value">{coverage.lines.percentage}%</div>
        </div>
      </div>

      <div className="coverage-files">
        <h4>File Coverage</h4>
        <div className="files-list">
          {coverage.files?.map((file: any) => (
            <div 
              key={file.file}
              className="file-coverage"
              onClick={() => onFileSelect?.(file.file)}
            >
              <div className="file-name">{file.file}</div>
              <div className="file-metrics">
                <span>S: {file.statements.percentage}%</span>
                <span>B: {file.branches.percentage}%</span>
                <span>F: {file.functions.percentage}%</span>
                <span>L: {file.lines.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Test Execution Progress Component
const TestExecutionProgress: React.FC<TestExecutionProgressProps> = ({
  execution,
  onCancel
}) => {
  const progress = execution.runner?.progress;
  
  return (
    <div className="test-execution-progress">
      <div className="progress-header">
        <h3>Running Tests</h3>
        <button className="btn-small btn-danger" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {progress && (
        <div className="progress-details">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              data-percentage={progress.percentage}
            />
          </div>
          <div className="progress-stats">
            <span>{progress.completed}/{progress.total} tests</span>
            <span>{progress.failed} failed</span>
            <span>{progress.skipped} skipped</span>
            {progress.estimatedTimeRemaining && (
              <span>~{Math.round(progress.estimatedTimeRemaining / 1000)}s remaining</span>
            )}
          </div>
          {progress.currentTest && (
            <div className="current-test">
              Running: {progress.currentTest}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestingDashboard;
