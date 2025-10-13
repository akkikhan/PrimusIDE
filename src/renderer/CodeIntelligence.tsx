import React, { useState, useEffect } from 'react';

interface CodeInsight {
  id: string;
  type: 'suggestion' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  filePath?: string;
  line?: number;
  severity: 'low' | 'medium' | 'high';
  autofix?: boolean;
}

interface CodeMetrics {
  linesOfCode: number;
  complexity: number;
  maintainabilityIndex: number;
  testCoverage: number;
  dependencies: number;
  outdatedDeps: number;
}

interface CodeIntelligenceProps {
  isVisible: boolean;
  onToggle: () => void;
  activeFile?: string;
}

const CodeIntelligence: React.FC<CodeIntelligenceProps> = ({ isVisible, onToggle, activeFile }) => {
  const [insights, setInsights] = useState<CodeInsight[]>([]);
  const [metrics, setMetrics] = useState<CodeMetrics>({
    linesOfCode: 0,
    complexity: 0,
    maintainabilityIndex: 0,
    testCoverage: 0,
    dependencies: 0,
    outdatedDeps: 0
  });
  const [activeTab, setActiveTab] = useState<'insights' | 'metrics' | 'refactor'>('insights');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  useEffect(() => {
    if (isVisible) {
      analyzeCode();
    }
  }, [isVisible, activeFile]);

  const analyzeCode = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const mockInsights: CodeInsight[] = [
        {
          id: '1',
          type: 'suggestion',
          title: 'Use async/await',
          description: 'Consider using async/await instead of Promise.then() for better readability',
          filePath: activeFile || 'src/main.ts',
          line: 42,
          severity: 'low',
          autofix: true
        },
        {
          id: '2',
          type: 'warning',
          title: 'Unused import',
          description: 'The imported module "lodash" is not being used in this file',
          filePath: activeFile || 'src/utils.ts',
          line: 1,
          severity: 'medium',
          autofix: true
        },
        {
          id: '3',
          type: 'error',
          title: 'Memory leak detected',
          description: 'Event listener is not being removed in cleanup',
          filePath: activeFile || 'src/component.tsx',
          line: 28,
          severity: 'high',
          autofix: false
        },
        {
          id: '4',
          type: 'info',
          title: 'Performance optimization',
          description: 'This function could benefit from memoization',
          filePath: activeFile || 'src/hooks.ts',
          line: 15,
          severity: 'low',
          autofix: true
        }
      ];

      const mockMetrics: CodeMetrics = {
        linesOfCode: Math.floor(Math.random() * 10000) + 5000,
        complexity: Math.floor(Math.random() * 20) + 10,
        maintainabilityIndex: Math.floor(Math.random() * 30) + 60,
        testCoverage: Math.floor(Math.random() * 40) + 60,
        dependencies: Math.floor(Math.random() * 50) + 20,
        outdatedDeps: Math.floor(Math.random() * 10) + 2
      };

      setInsights(mockInsights);
      setMetrics(mockMetrics);
      setIsAnalyzing(false);
    }, 2000);
  };

  const applyFix = async (insight: CodeInsight) => {
    try {
      // Simulate applying auto-fix
      
      // Remove the insight after fixing
      setInsights(prev => prev.filter(i => i.id !== insight.id));
    } catch (error) {
      console.error('Failed to apply fix:', error);
    }
  };

  const getInsightIcon = (type: CodeInsight['type']) => {
    switch (type) {
      case 'suggestion': return '💡';
      case 'warning': return '⚠️';
      case 'error': return '🚨';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getSeverityColor = (severity: CodeInsight['severity']) => {
    switch (severity) {
      case 'high': return 'var(--error-color)';
      case 'medium': return 'var(--warning-color)';
      case 'low': return 'var(--info-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const getMetricColor = (value: number, type: keyof CodeMetrics) => {
    switch (type) {
      case 'complexity':
        return value > 15 ? 'var(--error-color)' : value > 10 ? 'var(--warning-color)' : 'var(--success-color)';
      case 'maintainabilityIndex':
        return value < 70 ? 'var(--error-color)' : value < 85 ? 'var(--warning-color)' : 'var(--success-color)';
      case 'testCoverage':
        return value < 60 ? 'var(--error-color)' : value < 80 ? 'var(--warning-color)' : 'var(--success-color)';
      default:
        return 'var(--text-primary)';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="code-intelligence">
      <div className="intelligence-header">
        <h2>Code Intelligence</h2>
        <div className="intelligence-actions">
          <button onClick={analyzeCode} disabled={isAnalyzing} title="Analyze Code">
            {isAnalyzing ? '🔄' : '🔍'}
          </button>
          <button onClick={onToggle} title="Close">×</button>
        </div>
      </div>

      <div className="intelligence-tabs">
        <button 
          className={activeTab === 'insights' ? 'active' : ''}
          onClick={() => setActiveTab('insights')}
        >
          Insights ({insights.length})
        </button>
        <button 
          className={activeTab === 'metrics' ? 'active' : ''}
          onClick={() => setActiveTab('metrics')}
        >
          Metrics
        </button>
        <button 
          className={activeTab === 'refactor' ? 'active' : ''}
          onClick={() => setActiveTab('refactor')}
        >
          Refactor
        </button>
      </div>

      <div className="intelligence-content">
        {isAnalyzing && (
          <div className="analyzing-overlay">
            <div className="loading-spinner">🤖</div>
            <p>Analyzing code with AI...</p>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="insights-panel">
            {insights.length === 0 ? (
              <p className="no-insights">No insights found. Click analyze to scan your code.</p>
            ) : (
              insights.map(insight => (
                <div key={insight.id} className={`insight-item ${insight.type}`}>
                  <div className="insight-header">
                    <span className="insight-icon">{getInsightIcon(insight.type)}</span>
                    <div className="insight-title-area">
                      <h4>{insight.title}</h4>
                      <span className={`severity-badge ${insight.severity}`}>
                        {insight.severity}
                      </span>
                    </div>
                  </div>
                  <p className="insight-description">{insight.description}</p>
                  {insight.filePath && (
                    <div className="insight-location">
                      <span className="file-path">{insight.filePath}</span>
                      {insight.line && <span className="line-number">:{insight.line}</span>}
                    </div>
                  )}
                  {insight.autofix && (
                    <button 
                      className="autofix-btn"
                      onClick={() => applyFix(insight)}
                    >
                      🔧 Auto-fix
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="metrics-panel">
            <div className="metrics-grid">
              <div className="metric-item">
                <div className="metric-label">Lines of Code</div>
                <div className="metric-value">{metrics.linesOfCode.toLocaleString()}</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Cyclomatic Complexity</div>
                <div className={`metric-value ${
                  metrics.complexity > 15 ? 'high-complexity' : 
                  metrics.complexity > 10 ? 'medium-complexity' : 'low-complexity'
                }`}>
                  {metrics.complexity}
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Maintainability Index</div>
                <div className={`metric-value ${
                  metrics.maintainabilityIndex < 70 ? 'low-maintainability' : 
                  metrics.maintainabilityIndex < 85 ? 'medium-maintainability' : 'high-maintainability'
                }`}>
                  {metrics.maintainabilityIndex}%
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Test Coverage</div>
                <div className={`metric-value ${
                  metrics.testCoverage < 60 ? 'low-coverage' : 
                  metrics.testCoverage < 80 ? 'medium-coverage' : 'high-coverage'
                }`}>
                  {metrics.testCoverage}%
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Dependencies</div>
                <div className="metric-value">{metrics.dependencies}</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Outdated Dependencies</div>
                <div className={`metric-value ${metrics.outdatedDeps > 5 ? 'outdated-deps' : ''}`}>
                  {metrics.outdatedDeps}
                </div>
              </div>
            </div>

            <div className="metrics-chart">
              <h3>Code Quality Trends</h3>
              <div className="placeholder-chart">
                📈 Chart visualization would go here
              </div>
            </div>
          </div>
        )}

        {activeTab === 'refactor' && (
          <div className="refactor-panel">
            <h3>Refactoring Suggestions</h3>
            <div className="refactor-suggestions">
              <div className="refactor-item">
                <h4>🔄 Extract Method</h4>
                <p>Long method detected in UserService.ts line 45-78</p>
                <button className="refactor-btn">Apply Refactoring</button>
              </div>
              <div className="refactor-item">
                <h4>📦 Move to Module</h4>
                <p>Utility functions could be moved to separate module</p>
                <button className="refactor-btn">Apply Refactoring</button>
              </div>
              <div className="refactor-item">
                <h4>🏗️ Introduce Interface</h4>
                <p>Multiple classes could benefit from shared interface</p>
                <button className="refactor-btn">Apply Refactoring</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeIntelligence;
