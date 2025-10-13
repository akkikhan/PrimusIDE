// Debug Dashboard - Interactive debugging interface with intelligent insights
// Advanced UI for breakpoint management, variable inspection, and performance profiling

import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdvancedDebugEngine, { 
  DebugSession, 
  SmartBreakpoint, 
  IntelligentWatch, 
  StackFrame, 
  Variable,
  Scope,
  DebugInsight,
  PerformanceProfile,
  DebugConsoleMessage,
  Thread,
  DebugConfiguration 
} from '../services/AdvancedDebugEngine';

interface DebugDashboardProps {
  debugEngine: AdvancedDebugEngine;
  onSessionStart?: (session: DebugSession) => void;
  onSessionStop?: (sessionId: string) => void;
  className?: string;
}

interface DebugView {
  id: string;
  name: string;
  component: React.ReactNode;
  icon: string;
}

interface CallStackItem {
  frame: StackFrame;
  variables: Variable[];
  scopes: Scope[];
  isActive: boolean;
}

interface BreakpointGroup {
  file: string;
  breakpoints: SmartBreakpoint[];
  enabled: boolean;
}

interface WatchGroup {
  category: string;
  watches: IntelligentWatch[];
}

export const DebugDashboard: React.FC<DebugDashboardProps> = ({
  debugEngine,
  onSessionStart,
  onSessionStop,
  className = ''
}) => {
  // Core state
  const [activeSession, setActiveSession] = useState<DebugSession | null>(null);
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [activeView, setActiveView] = useState<string>('breakpoints');
  
  // Debug data state
  const [breakpoints, setBreakpoints] = useState<SmartBreakpoint[]>([]);
  const [watchExpressions, setWatchExpressions] = useState<IntelligentWatch[]>([]);
  const [callStack, setCallStack] = useState<CallStackItem[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [consoleMessages, setConsoleMessages] = useState<DebugConsoleMessage[]>([]);
  const [insights, setInsights] = useState<DebugInsight[]>([]);
  const [performanceProfiles, setPerformanceProfiles] = useState<PerformanceProfile[]>([]);
  
  // UI state
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const [expandedBreakpointGroups, setExpandedBreakpointGroups] = useState<Set<string>>(new Set());
  const [expandedWatchGroups, setExpandedWatchGroups] = useState<Set<string>>(new Set());
  const [filterInsightsSeverity, setFilterInsightsSeverity] = useState<string>('all');
  const [autoScrollConsole, setAutoScrollConsole] = useState<boolean>(true);
  
  // Configuration state
  const [newBreakpointFile, setNewBreakpointFile] = useState<string>('');
  const [newBreakpointLine, setNewBreakpointLine] = useState<number>(1);
  const [newBreakpointCondition, setNewBreakpointCondition] = useState<string>('');
  const [newWatchExpression, setNewWatchExpression] = useState<string>('');
  const [sessionConfig, setSessionConfig] = useState<Partial<DebugConfiguration>>({
    name: 'Debug Session',
    type: 'node',
    request: 'launch'
  });
  
  // Refs
  const consoleRef = useRef<HTMLDivElement>(null);
  const callStackRef = useRef<HTMLDivElement>(null);

  // Initialize component
  useEffect(() => {
    const updateData = () => {
      setActiveSession(debugEngine.getActiveSession());
      setSessions(debugEngine.getActiveSessions());
      setBreakpoints(debugEngine.getBreakpoints());
      setWatchExpressions(debugEngine.getWatchExpressions());
      setConsoleMessages(debugEngine.getConsoleMessages());
      setInsights(debugEngine.getDebugInsights());
      setPerformanceProfiles(debugEngine.getPerformanceProfiles());
      setThreads(debugEngine.getCurrentThreads());
      
      // Update call stack
      updateCallStack();
    };

    // Initial data load
    updateData();

    // Listen for debug events
    const handleSessionStarted = (session: DebugSession) => {
      updateData();
      onSessionStart?.(session);
    };

    const handleSessionStopped = (session: DebugSession) => {
      updateData();
      onSessionStop?.(session.id);
    };

    const handleBreakpointHit = () => {
      updateData();
      updateCallStack();
    };

    const handleInsight = (insight: DebugInsight) => {
      setInsights(prev => [...prev, insight]);
    };

    // Register event listeners
    debugEngine.on('session-started', handleSessionStarted);
    debugEngine.on('session-stopped', handleSessionStopped);
    debugEngine.on('breakpoint-hit', handleBreakpointHit);
    debugEngine.on('debug-insight', handleInsight);
    debugEngine.on('step-executed', updateData);
    debugEngine.on('watch-updated', updateData);

    return () => {
      debugEngine.off('session-started', handleSessionStarted);
      debugEngine.off('session-stopped', handleSessionStopped);
      debugEngine.off('breakpoint-hit', handleBreakpointHit);
      debugEngine.off('debug-insight', handleInsight);
      debugEngine.off('step-executed', updateData);
      debugEngine.off('watch-updated', updateData);
    };
  }, [debugEngine, onSessionStart, onSessionStop]);

  // Auto-scroll console
  useEffect(() => {
    if (autoScrollConsole && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleMessages, autoScrollConsole]);

  // Update call stack
  const updateCallStack = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'paused') {
      setCallStack([]);
      return;
    }

    try {
      const stackTrace = await debugEngine.getStackTrace();
      const callStackItems: CallStackItem[] = [];

      for (const frame of stackTrace.stackFrames) {
        const scopes = await debugEngine.getScopes(frame.id);
        const variables: Variable[] = [];
        
        // Get variables for each scope
        for (const scope of scopes) {
          if (scope.variablesReference > 0) {
            const scopeVariables = await debugEngine.getVariables(scope.variablesReference);
            variables.push(...scopeVariables);
          }
        }

        callStackItems.push({
          frame,
          variables,
          scopes,
          isActive: frame.id === selectedFrameId || (selectedFrameId === null && frame.id === stackTrace.stackFrames[0]?.id)
        });
      }

      setCallStack(callStackItems);
    } catch (error) {
      console.error('Failed to update call stack:', error);
    }
  }, [activeSession, debugEngine, selectedFrameId]);

  // Debug control handlers
  const handleStartSession = async () => {
    try {
      const config: DebugConfiguration = {
        name: sessionConfig.name || 'Debug Session',
        type: sessionConfig.type || 'node',
        request: sessionConfig.request || 'launch',
        program: sessionConfig.program,
        args: sessionConfig.args,
        env: sessionConfig.env,
        cwd: sessionConfig.cwd,
        port: sessionConfig.port,
        host: sessionConfig.host,
        stopOnEntry: sessionConfig.stopOnEntry,
        console: sessionConfig.console,
        sourceMaps: sessionConfig.sourceMaps,
        outFiles: sessionConfig.outFiles,
        skipFiles: sessionConfig.skipFiles,
        smartStep: sessionConfig.smartStep,
        justMyCode: sessionConfig.justMyCode
      };

      await debugEngine.startSession(config);
    } catch (error) {
      console.error('Failed to start debug session:', error);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    
    try {
      await debugEngine.stopSession(activeSession.id);
    } catch (error) {
      console.error('Failed to stop debug session:', error);
    }
  };

  const handleStepOver = async () => {
    try {
      await debugEngine.stepOver();
    } catch (error) {
      console.error('Failed to step over:', error);
    }
  };

  const handleStepInto = async () => {
    try {
      await debugEngine.stepInto();
    } catch (error) {
      console.error('Failed to step into:', error);
    }
  };

  const handleStepOut = async () => {
    try {
      await debugEngine.stepOut();
    } catch (error) {
      console.error('Failed to step out:', error);
    }
  };

  const handleContinue = async () => {
    try {
      await debugEngine.continue();
    } catch (error) {
      console.error('Failed to continue:', error);
    }
  };

  const handlePause = async () => {
    try {
      await debugEngine.pause();
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  };

  // Breakpoint handlers
  const handleAddBreakpoint = async () => {
    if (!newBreakpointFile || newBreakpointLine < 1) return;

    try {
      await debugEngine.setBreakpoint(newBreakpointFile, newBreakpointLine, {
        condition: newBreakpointCondition || undefined
      });
      
      setNewBreakpointFile('');
      setNewBreakpointLine(1);
      setNewBreakpointCondition('');
    } catch (error) {
      console.error('Failed to add breakpoint:', error);
    }
  };

  const handleToggleBreakpoint = async (breakpointId: string) => {
    const breakpoint = breakpoints.find(bp => bp.id === breakpointId);
    if (!breakpoint) return;

    try {
      if (breakpoint.enabled) {
        await debugEngine.removeBreakpoint(breakpointId);
      } else {
        await debugEngine.setBreakpoint(breakpoint.file, breakpoint.line, {
          condition: breakpoint.condition,
          hitCondition: breakpoint.hitCondition,
          logMessage: breakpoint.logMessage
        });
      }
    } catch (error) {
      console.error('Failed to toggle breakpoint:', error);
    }
  };

  const handleRemoveBreakpoint = async (breakpointId: string) => {
    try {
      await debugEngine.removeBreakpoint(breakpointId);
    } catch (error) {
      console.error('Failed to remove breakpoint:', error);
    }
  };

  // Watch expression handlers
  const handleAddWatchExpression = () => {
    if (!newWatchExpression.trim()) return;

    debugEngine.addWatchExpression(newWatchExpression.trim());
    setNewWatchExpression('');
  };

  const handleRemoveWatchExpression = (watchId: string) => {
    debugEngine.removeWatchExpression(watchId);
  };

  const handleEvaluateWatchExpression = async (watchId: string) => {
    try {
      await debugEngine.evaluateWatchExpression(watchId, selectedFrameId || undefined);
    } catch (error) {
      console.error('Failed to evaluate watch expression:', error);
    }
  };

  // Profiling handlers
  const handleStartCPUProfile = async () => {
    try {
      await debugEngine.startCPUProfile();
    } catch (error) {
      console.error('Failed to start CPU profile:', error);
    }
  };

  const handleStopCPUProfile = async (profileId: string) => {
    try {
      await debugEngine.stopCPUProfile(profileId);
    } catch (error) {
      console.error('Failed to stop CPU profile:', error);
    }
  };

  // Group breakpoints by file
  const breakpointGroups: BreakpointGroup[] = breakpoints.reduce((groups, bp) => {
    let group = groups.find(g => g.file === bp.file);
    if (!group) {
      group = { file: bp.file, breakpoints: [], enabled: true };
      groups.push(group);
    }
    group.breakpoints.push(bp);
    return groups;
  }, [] as BreakpointGroup[]);

  // Group watch expressions by category
  const watchGroups: WatchGroup[] = watchExpressions.reduce((groups, watch) => {
    const category = watch.expression.expression.includes('.') ? 
      watch.expression.expression.split('.')[0] : 'Variables';
    
    let group = groups.find(g => g.category === category);
    if (!group) {
      group = { category, watches: [] };
      groups.push(group);
    }
    group.watches.push(watch);
    return groups;
  }, [] as WatchGroup[]);

  // Filter insights by severity
  const filteredInsights = insights.filter(insight => 
    filterInsightsSeverity === 'all' || insight.severity === filterInsightsSeverity
  );

  // Debug views
  const debugViews: DebugView[] = [
    {
      id: 'breakpoints',
      name: 'Breakpoints',
      icon: '🔴',
      component: (
        <div className="debug-breakpoints">
          <div className="debug-section-header">
            <h3>Smart Breakpoints</h3>
            <div className="debug-controls">
              <input
                type="text"
                placeholder="File path"
                value={newBreakpointFile}
                onChange={(e) => setNewBreakpointFile(e.target.value)}
                className="debug-input"
              />
              <input
                type="number"
                placeholder="Line"
                min="1"
                value={newBreakpointLine}
                onChange={(e) => setNewBreakpointLine(parseInt(e.target.value) || 1)}
                className="debug-input debug-input-small"
              />
              <input
                type="text"
                placeholder="Condition (optional)"
                value={newBreakpointCondition}
                onChange={(e) => setNewBreakpointCondition(e.target.value)}
                className="debug-input"
              />
              <button onClick={handleAddBreakpoint} className="debug-button debug-button-primary">
                Add
              </button>
            </div>
          </div>

          <div className="debug-breakpoint-groups">
            {breakpointGroups.map(group => (
              <div key={group.file} className="debug-breakpoint-group">
                <div 
                  className="debug-group-header"
                  onClick={() => {
                    const newExpanded = new Set(expandedBreakpointGroups);
                    if (newExpanded.has(group.file)) {
                      newExpanded.delete(group.file);
                    } else {
                      newExpanded.add(group.file);
                    }
                    setExpandedBreakpointGroups(newExpanded);
                  }}
                >
                  <span className={`debug-expand-icon ${expandedBreakpointGroups.has(group.file) ? 'expanded' : ''}`}>
                    ▶
                  </span>
                  <span className="debug-file-name">{group.file}</span>
                  <span className="debug-breakpoint-count">({group.breakpoints.length})</span>
                </div>

                {expandedBreakpointGroups.has(group.file) && (
                  <div className="debug-breakpoint-list">
                    {group.breakpoints.map(bp => (
                      <div key={bp.id} className={`debug-breakpoint-item ${bp.enabled ? 'enabled' : 'disabled'}`}>
                        <div className="debug-breakpoint-info">
                          <div className="debug-breakpoint-location">
                            Line {bp.line}
                            {bp.condition && <span className="debug-condition"> • {bp.condition}</span>}
                          </div>
                          <div className="debug-breakpoint-stats">
                            Hits: {bp.hitCount} • Impact: {Math.round((bp.analytics.cpuImpact + bp.analytics.memoryImpact) / 2)}
                          </div>
                          {bp.intelligence.recommendations.length > 0 && (
                            <div className="debug-recommendations">
                              {bp.intelligence.recommendations.map((rec, index) => (
                                <div key={index} className="debug-recommendation">💡 {rec}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="debug-breakpoint-actions">
                          <button
                            onClick={() => handleToggleBreakpoint(bp.id)}
                            className={`debug-button ${bp.enabled ? 'debug-button-secondary' : 'debug-button-primary'}`}
                          >
                            {bp.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleRemoveBreakpoint(bp.id)}
                            className="debug-button debug-button-danger"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'watch',
      name: 'Watch',
      icon: '👁️',
      component: (
        <div className="debug-watch">
          <div className="debug-section-header">
            <h3>Intelligent Watch</h3>
            <div className="debug-controls">
              <input
                type="text"
                placeholder="Expression to watch"
                value={newWatchExpression}
                onChange={(e) => setNewWatchExpression(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddWatchExpression()}
                className="debug-input"
              />
              <button onClick={handleAddWatchExpression} className="debug-button debug-button-primary">
                Add Watch
              </button>
            </div>
          </div>

          <div className="debug-watch-groups">
            {watchGroups.map(group => (
              <div key={group.category} className="debug-watch-group">
                <div 
                  className="debug-group-header"
                  onClick={() => {
                    const newExpanded = new Set(expandedWatchGroups);
                    if (newExpanded.has(group.category)) {
                      newExpanded.delete(group.category);
                    } else {
                      newExpanded.add(group.category);
                    }
                    setExpandedWatchGroups(newExpanded);
                  }}
                >
                  <span className={`debug-expand-icon ${expandedWatchGroups.has(group.category) ? 'expanded' : ''}`}>
                    ▶
                  </span>
                  <span className="debug-group-name">{group.category}</span>
                  <span className="debug-watch-count">({group.watches.length})</span>
                </div>

                {expandedWatchGroups.has(group.category) && (
                  <div className="debug-watch-list">
                    {group.watches.map(watch => (
                      <div key={watch.expression.id} className="debug-watch-item">
                        <div className="debug-watch-info">
                          <div className="debug-watch-expression">
                            {watch.expression.expression}
                          </div>
                          <div className="debug-watch-value">
                            {watch.expression.error ? (
                              <span className="debug-error">{watch.expression.error}</span>
                            ) : (
                              <span className="debug-value">
                                {watch.expression.value || 'Not evaluated'}
                                {watch.expression.type && <span className="debug-type"> ({watch.expression.type})</span>}
                              </span>
                            )}
                          </div>
                          {watch.predictions.length > 0 && (
                            <div className="debug-predictions">
                              <strong>Predictions:</strong>
                              {watch.predictions.slice(-3).map((pred, index) => (
                                <div key={index} className="debug-prediction">
                                  🔮 {pred.predictedValue} ({pred.confidence}% confidence)
                                </div>
                              ))}
                            </div>
                          )}
                          {watch.suggestions.length > 0 && (
                            <div className="debug-suggestions">
                              <strong>Suggestions:</strong>
                              {watch.suggestions.slice(0, 3).map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => setNewWatchExpression(suggestion)}
                                  className="debug-suggestion-button"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="debug-watch-actions">
                          <button
                            onClick={() => handleEvaluateWatchExpression(watch.expression.id)}
                            className="debug-button debug-button-secondary"
                          >
                            Refresh
                          </button>
                          <button
                            onClick={() => handleRemoveWatchExpression(watch.expression.id)}
                            className="debug-button debug-button-danger"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'callstack',
      name: 'Call Stack',
      icon: '📚',
      component: (
        <div className="debug-callstack" ref={callStackRef}>
          <div className="debug-section-header">
            <h3>Call Stack & Variables</h3>
            {threads.length > 0 && (
              <div className="debug-thread-selector">
                <select 
                className="debug-select"
                title="Select debug thread"
                aria-label="Select debug thread"
              >
                  {threads.map(thread => (
                    <option key={thread.id} value={thread.id}>
                      Thread {thread.id}: {thread.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="debug-callstack-list">
            {callStack.map((item, index) => (
              <div 
                key={item.frame.id} 
                className={`debug-callstack-frame ${item.isActive ? 'active' : ''}`}
                onClick={() => setSelectedFrameId(item.frame.id)}
              >
                <div className="debug-frame-header">
                  <div className="debug-frame-info">
                    <span className="debug-frame-name">{item.frame.name}</span>
                    <span className="debug-frame-location">
                      {item.frame.source?.name || 'unknown'}:{item.frame.line}
                    </span>
                  </div>
                  <span className="debug-frame-index">#{index}</span>
                </div>

                {item.isActive && (
                  <div className="debug-frame-variables">
                    {item.scopes.map(scope => (
                      <div key={scope.name} className="debug-scope">
                        <div className="debug-scope-header">
                          <strong>{scope.name}</strong>
                        </div>
                        <div className="debug-variable-list">
                          {item.variables
                            .filter(variable => 
                              // Simple scope filtering - in real implementation would use proper scope association
                              scope.name === 'Locals' || scope.name === 'Arguments'
                            )
                            .map(variable => (
                            <div key={variable.name} className="debug-variable">
                              <span className="debug-variable-name">{variable.name}:</span>
                              <span className="debug-variable-value">{variable.value}</span>
                              {variable.type && <span className="debug-variable-type">({variable.type})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'console',
      name: 'Debug Console',
      icon: '💬',
      component: (
        <div className="debug-console">
          <div className="debug-section-header">
            <h3>Debug Console</h3>
            <div className="debug-console-controls">
              <label className="debug-checkbox-label">
                <input
                  type="checkbox"
                  checked={autoScrollConsole}
                  onChange={(e) => setAutoScrollConsole(e.target.checked)}
                />
                Auto-scroll
              </label>
              <button 
                onClick={() => setConsoleMessages([])}
                className="debug-button debug-button-secondary"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="debug-console-messages" ref={consoleRef}>
            {consoleMessages.map(message => (
              <div key={message.id} className={`debug-console-message debug-message-${message.type}`}>
                <span className="debug-message-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
                <span className="debug-message-type">[{message.type.toUpperCase()}]</span>
                <span className="debug-message-content">{message.message}</span>
                {message.source && (
                  <span className="debug-message-source">
                    {message.source}:{message.line}
                  </span>
                )}
              </div>
            ))}
            {consoleMessages.length === 0 && (
              <div className="debug-console-empty">No console messages</div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'insights',
      name: 'Debug Insights',
      icon: '🔍',
      component: (
        <div className="debug-insights">
          <div className="debug-section-header">
            <h3>Intelligent Insights</h3>
            <div className="debug-controls">
              <select
                value={filterInsightsSeverity}
                onChange={(e) => setFilterInsightsSeverity(e.target.value)}
                className="debug-select"
                title="Filter insights by severity"
                aria-label="Filter insights by severity"
              >
                <option value="all">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="debug-insights-list">
            {filteredInsights.map(insight => (
              <div key={insight.id} className={`debug-insight debug-insight-${insight.severity}`}>
                <div className="debug-insight-header">
                  <span className="debug-insight-type">{insight.type.toUpperCase()}</span>
                  <span className="debug-insight-severity">{insight.severity.toUpperCase()}</span>
                  <span className="debug-insight-confidence">{insight.confidence}% confidence</span>
                </div>
                <div className="debug-insight-title">{insight.title}</div>
                <div className="debug-insight-description">{insight.description}</div>
                <div className="debug-insight-location">
                  📍 {insight.location.path} - {insight.location.name}
                </div>
                
                {insight.suggestions.length > 0 && (
                  <div className="debug-insight-suggestions">
                    <strong>Suggestions:</strong>
                    <ul>
                      {insight.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {insight.evidence.length > 0 && (
                  <div className="debug-insight-evidence">
                    <strong>Evidence:</strong>
                    {insight.evidence.map((evidence, index) => (
                      <div key={index} className="debug-evidence-item">
                        <span className="debug-evidence-type">{evidence.type}:</span>
                        <span className="debug-evidence-description">{evidence.description}</span>
                        <span className="debug-evidence-strength">({evidence.strength}% strength)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {filteredInsights.length === 0 && (
              <div className="debug-insights-empty">No insights available</div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'profiling',
      name: 'Performance Profiling',
      icon: '📊',
      component: (
        <div className="debug-profiling">
          <div className="debug-section-header">
            <h3>Performance Profiling</h3>
            <div className="debug-controls">
              <button
                onClick={handleStartCPUProfile}
                disabled={!activeSession}
                className="debug-button debug-button-primary"
              >
                Start CPU Profile
              </button>
            </div>
          </div>

          <div className="debug-profiles-list">
            {performanceProfiles.map(profile => (
              <div key={profile.id} className="debug-profile">
                <div className="debug-profile-header">
                  <span className="debug-profile-type">{profile.type.toUpperCase()}</span>
                  <span className="debug-profile-duration">
                    {profile.endTime ? 
                      `${profile.endTime - profile.startTime}ms` : 
                      'Recording...'
                    }
                  </span>
                </div>
                <div className="debug-profile-info">
                  Session: {profile.sessionId}
                </div>
                <div className="debug-profile-actions">
                  {!profile.endTime ? (
                    <button
                      onClick={() => handleStopCPUProfile(profile.id)}
                      className="debug-button debug-button-secondary"
                    >
                      Stop Recording
                    </button>
                  ) : (
                    <button
                      onClick={() => console.log('View profile:', profile)}
                      className="debug-button debug-button-secondary"
                    >
                      View Results
                    </button>
                  )}
                </div>
              </div>
            ))}
            {performanceProfiles.length === 0 && (
              <div className="debug-profiles-empty">No performance profiles</div>
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={`debug-dashboard ${className}`}>
      {/* Session Controls */}
      <div className="debug-header">
        <div className="debug-session-info">
          {activeSession ? (
            <div className="debug-active-session">
              <span className={`debug-session-status debug-status-${activeSession.status}`}>
                ●
              </span>
              <span className="debug-session-name">{activeSession.name}</span>
              <span className="debug-session-type">({activeSession.type})</span>
            </div>
          ) : (
            <span className="debug-no-session">No active session</span>
          )}
        </div>

        <div className="debug-main-controls">
          {!activeSession ? (
            <button onClick={handleStartSession} className="debug-button debug-button-primary">
              Start Debugging
            </button>
          ) : (
            <>
              <button onClick={handleStopSession} className="debug-button debug-button-danger">
                Stop
              </button>
              
              {activeSession.status === 'paused' ? (
                <>
                  <button onClick={handleContinue} className="debug-button debug-button-primary">
                    Continue
                  </button>
                  <button onClick={handleStepOver} className="debug-button debug-button-secondary">
                    Step Over
                  </button>
                  <button onClick={handleStepInto} className="debug-button debug-button-secondary">
                    Step Into
                  </button>
                  <button onClick={handleStepOut} className="debug-button debug-button-secondary">
                    Step Out
                  </button>
                </>
              ) : (
                <button onClick={handlePause} className="debug-button debug-button-secondary">
                  Pause
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Navigation */}
      <div className="debug-nav">
        {debugViews.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`debug-nav-button ${activeView === view.id ? 'active' : ''}`}
          >
            <span className="debug-nav-icon">{view.icon}</span>
            <span className="debug-nav-label">{view.name}</span>
          </button>
        ))}
      </div>

      {/* Active View Content */}
      <div className="debug-content">
        {debugViews.find(view => view.id === activeView)?.component}
      </div>
    </div>
  );
};

export default DebugDashboard;
