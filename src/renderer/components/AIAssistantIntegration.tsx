// AI Assistant Integration - Main component that orchestrates all AI features
// Combines chat, code generation, debugging, and context awareness

import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdvancedAIService, { 
  AIResponse, 
  CodeContext as AdvancedCodeContext, 
  ConversationAttachment,
  CodeSuggestion,
  AICapabilities
} from '../services/AdvancedAIService';
import AIChatInterface from './AIChatInterface';
import AICodeGenerator from './AICodeGenerator';
import { ContextAwarenessService } from '../services/ContextAwarenessService';
import { CodeContext } from '../services/AIIntegrationSystem';
import './AIAssistantIntegration.css';

interface AIAssistantIntegrationProps {
  contextService: ContextAwarenessService;
  onInsertCode: (code: string, position?: { line: number; column: number }) => void;
  onApplySuggestion: (code: string, startLine: number, endLine: number) => void;
  onPreviewCode: (code: string) => void;
  onShowError: (message: string) => void;
  onShowSuccess: (message: string) => void;
  editorRef?: React.RefObject<any>;
  className?: string;
}

interface AIFeature {
  id: string;
  name: string;
  icon: string;
  description: string;
  component: React.ComponentType<any>;
  enabled: boolean;
  hotkey?: string;
}

interface AISettings {
  defaultModel: string;
  enableAutoSuggestions: boolean;
  enableRealTimeHelp: boolean;
  suggestionDelay: number;
  maxSuggestions: number;
  enableCodeCompletion: boolean;
  enableErrorAnalysis: boolean;
  enablePerformanceHints: boolean;
  apiKeys: Record<string, string>;
}

interface ActiveSession {
  conversationId: string;
  startTime: number;
  messageCount: number;
  codeGenerated: number;
  suggestionsApplied: number;
}

const AIAssistantIntegration: React.FC<AIAssistantIntegrationProps> = ({
  contextService,
  onInsertCode,
  onApplySuggestion,
  onPreviewCode,
  onShowError,
  onShowSuccess,
  editorRef,
  className = ''
}) => {
  // State
  const [aiService] = useState(() => new AdvancedAIService());
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string>('chat');
  const [currentContext, setCurrentContext] = useState<CodeContext>({} as CodeContext);
  const [advancedContext, setAdvancedContext] = useState<AdvancedCodeContext>({} as AdvancedCodeContext);
  const [capabilities, setCapabilities] = useState<AICapabilities>({} as AICapabilities);
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  const [settings, setSettings] = useState<AISettings>({
    defaultModel: 'gpt-4',
    enableAutoSuggestions: true,
    enableRealTimeHelp: true,
    suggestionDelay: 1000,
    maxSuggestions: 5,
    enableCodeCompletion: true,
    enableErrorAnalysis: true,
    enablePerformanceHints: true,
    apiKeys: {}
  });

  const [activeSession, setActiveSession] = useState<ActiveSession>({
    conversationId: `session-${Date.now()}`,
    startTime: Date.now(),
    messageCount: 0,
    codeGenerated: 0,
    suggestionsApplied: 0
  });

  const [recentSuggestions, setRecentSuggestions] = useState<CodeSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);

  // Refs
  const contextUpdateTimerRef = useRef<NodeJS.Timeout>();
  const suggestionTimerRef = useRef<NodeJS.Timeout>();

  // Available AI features
  const aiFeatures: AIFeature[] = [
    {
      id: 'chat',
      name: 'AI Chat',
      icon: '💬',
      description: 'Conversational AI assistance',
      component: AIChatInterface,
      enabled: true,
      hotkey: 'Ctrl+Shift+A'
    },
    {
      id: 'generator',
      name: 'Code Generator',
      icon: '⚡',
      description: 'AI-powered code generation',
      component: AICodeGenerator,
      enabled: true,
      hotkey: 'Ctrl+Shift+G'
    },
    {
      id: 'debugger',
      name: 'AI Debugger',
      icon: '🐛',
      description: 'Intelligent debugging assistance',
      component: React.Fragment, // Placeholder
      enabled: false
    },
    {
      id: 'reviewer',
      name: 'Code Reviewer',
      icon: '👁️',
      description: 'AI code review and suggestions',
      component: React.Fragment, // Placeholder
      enabled: false
    }
  ];

  /**
   * Initialize AI service
   */
  const initializeAI = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      
      // Set up API keys
      Object.entries(settings.apiKeys).forEach(([provider, key]) => {
        if (key) {
          aiService.setApiKey(provider, key);
        }
      });

      // Set default model
      aiService.setDefaultModel(settings.defaultModel);
      
      // Get capabilities
      const caps = aiService.getCapabilities();
      setCapabilities(caps);
      
      // Set up event listeners
      aiService.on('request-started', (request) => {
        
      });

      aiService.on('request-completed', (request, response) => {
        
        updateSessionStats('messageCount');
      });

      aiService.on('request-error', (request, error) => {
        console.error('❌ AI request failed:', error);
        onShowError(`AI request failed: ${error.message}`);
      });

      setConnectionStatus('connected');
      setIsInitialized(true);
      onShowSuccess('AI Assistant initialized successfully!');

    } catch (error) {
      console.error('AI initialization error:', error);
      setConnectionStatus('disconnected');
      onShowError('Failed to initialize AI Assistant');
    }
  }, [aiService, settings.apiKeys, settings.defaultModel, onShowError, onShowSuccess]);

  /**
   * Update context from editor
   */
  const updateContext = useCallback(async () => {
    try {
      if (!editorRef?.current || !contextService) return;

      const snapshot = await contextService.captureContext();
      const insights = contextService.analyzeContext(snapshot);
      
      // Update AIIntegrationSystem context
      const contextData: CodeContext = {
        filePath: snapshot.activeFile || '',
        projectRoot: '',
        language: snapshot.activeLanguage || 'typescript',
        imports: [],
        dependencies: [],
        recentFiles: snapshot.recentlyModifiedFiles,
        symbols: []
      };
      setCurrentContext(contextData);
      
      // Update AdvancedAIService context
      const advancedContextData: AdvancedCodeContext = {
        currentFile: snapshot.activeFile || '',
        language: snapshot.activeLanguage || 'typescript',
        selectedCode: snapshot.selectedText || '',
        cursorPosition: snapshot.cursorPosition || { line: 0, column: 0 },
        projectStructure: snapshot.workspaceFiles,
        importStatements: [],
        nearbyFunctions: [],
        fileContent: '',
        workspaceContext: `Project with ${snapshot.workspaceFiles.length} files`
      };
      setAdvancedContext(advancedContextData);

      // Auto-suggest if enabled
      if (settings.enableAutoSuggestions && advancedContextData.selectedCode) {
        if (suggestionTimerRef.current) {
          clearTimeout(suggestionTimerRef.current);
        }
        
        suggestionTimerRef.current = setTimeout(async () => {
          try {
            const suggestions = await aiService.getCodeSuggestions(
              advancedContextData, 
              settings.maxSuggestions
            );
            setRecentSuggestions(suggestions);
          } catch (error) {
            console.error('Auto-suggestion error:', error);
          }
        }, settings.suggestionDelay);
      }

    } catch (error) {
      console.error('Context update error:', error);
    }
  }, [aiService, contextService, editorRef, settings.enableAutoSuggestions, settings.maxSuggestions, settings.suggestionDelay]);

  /**
   * Handle AI chat message
   */
  const handleChatMessage = async (message: string, attachments?: ConversationAttachment[]): Promise<AIResponse> => {
    try {
      const response = await aiService.chat(
        message,
        activeSession.conversationId,
        currentContext,
        attachments
      );
      
      updateSessionStats('messageCount');
      return response;
    } catch (error) {
      console.error('Chat message error:', error);
      throw error;
    }
  };

  /**
   * Convert AIIntegrationSystem CodeContext to AdvancedAIService CodeContext
   */
  const convertToAdvancedContext = (context: CodeContext): AdvancedCodeContext => {
    return {
      currentFile: context.filePath,
      language: context.language,
      selectedCode: '', // Not available in AIIntegrationSystem context
      cursorPosition: { line: 0, column: 0 }, // Default values
      projectStructure: context.recentFiles,
      importStatements: context.imports || [],
      nearbyFunctions: [], // Not available
      fileContent: '', // Not available
      workspaceContext: context.projectRoot
    };
  };

  /**
   * Handle code generation
   */
  const handleCodeGeneration = async (prompt: string, context: AdvancedCodeContext, options: any): Promise<AIResponse> => {
    try {
      const response = await aiService.generateCompletion(advancedContext, prompt, options.model);
      updateSessionStats('codeGenerated');
      return response;
    } catch (error) {
      console.error('Code generation error:', error);
      throw error;
    }
  };

  /**
   * Handle code insertion
   */
  const handleInsertCode = useCallback((code: string, position?: { line: number; column: number }) => {
    onInsertCode(code, position);
    updateSessionStats('suggestionsApplied');
    onShowSuccess('Code inserted successfully!');
  }, [onInsertCode, onShowSuccess]);

  /**
   * Handle suggestion application
   */
  const handleApplySuggestion = useCallback((code: string, startLine: number, endLine: number) => {
    onApplySuggestion(code, startLine, endLine);
    updateSessionStats('suggestionsApplied');
    onShowSuccess('Suggestion applied successfully!');
  }, [onApplySuggestion, onShowSuccess]);

  /**
   * Update session statistics
   */
  const updateSessionStats = (stat: keyof Omit<ActiveSession, 'conversationId' | 'startTime'>) => {
    setActiveSession(prev => ({
      ...prev,
      [stat]: prev[stat] + 1
    }));
  };

  /**
   * Analyze code quality
   */
  const analyzeCodeQuality = async () => {
    if (!advancedContext.selectedCode && !advancedContext.fileContent) return;

    setIsAnalyzing(true);
    try {
      const codeToAnalyze = advancedContext.selectedCode || advancedContext.fileContent;
      const context = { ...currentContext, selectedCode: codeToAnalyze };

      const [explanationResponse, reviewResponse] = await Promise.all([
        aiService.explainCode(convertToAdvancedContext(context)),
        aiService.reviewCode(convertToAdvancedContext(context), 'all')
      ]);

      setAnalysisResults([
        {
          type: 'explanation',
          title: 'Code Explanation',
          content: explanationResponse.content,
          metadata: explanationResponse.metadata
        },
        {
          type: 'review',
          title: 'Code Review',
          content: reviewResponse.content,
          metadata: reviewResponse.metadata
        }
      ]);
    } catch (error) {
      console.error('Code analysis error:', error);
      onShowError('Failed to analyze code');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Get debugging help
   */
  const getDebuggingHelp = async (errorMessage?: string) => {
    try {
      const response = await aiService.debugCode(convertToAdvancedContext(currentContext), errorMessage);
      return response;
    } catch (error) {
      console.error('Debugging help error:', error);
      throw error;
    }
  };

  /**
   * Generate documentation
   */
  const generateDocumentation = async (style: 'jsdoc' | 'typescript' | 'python' | 'markdown' = 'jsdoc') => {
    try {
      const response = await aiService.generateDocumentation(convertToAdvancedContext(currentContext), style);
      return response;
    } catch (error) {
      console.error('Documentation generation error:', error);
      throw error;
    }
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    if (!isVisible) return;

    // Find matching feature hotkey
    const feature = aiFeatures.find(f => f.hotkey === `${event.ctrlKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.key}`);
    
    if (feature && feature.enabled) {
      event.preventDefault();
      setActiveFeature(feature.id);
    }

    // Global shortcuts
    if (event.ctrlKey && event.shiftKey) {
      switch (event.key) {
        case 'A':
          event.preventDefault();
          setIsVisible(!isVisible);
          setActiveFeature('chat');
          break;
        case 'G':
          event.preventDefault();
          setIsVisible(true);
          setActiveFeature('generator');
          break;
        case 'D':
          event.preventDefault();
          analyzeCodeQuality();
          break;
      }
    }
  }, [isVisible, analyzeCodeQuality]);

  /**
   * Effects
   */
  useEffect(() => {
    initializeAI();
  }, [initializeAI]);

  useEffect(() => {
    if (isInitialized) {
      // Set up context update timer
      contextUpdateTimerRef.current = setInterval(updateContext, 2000);
      
      return () => {
        if (contextUpdateTimerRef.current) {
          clearInterval(contextUpdateTimerRef.current);
        }
      };
    }
  }, [isInitialized, updateContext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);

  useEffect(() => {
    return () => {
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className={`ai-assistant-loading ${className}`}>
        <div className="loading-spinner">🤖</div>
        <div>Initializing AI Assistant...</div>
      </div>
    );
  }

  return (
    <div className={`ai-assistant-integration ${className} ${isVisible ? 'visible' : 'hidden'}`}>
      {/* AI Assistant Toggle */}
      {!isVisible && (
        <div className="ai-assistant-trigger">
          <button
            className="ai-trigger-btn"
            onClick={() => setIsVisible(true)}
            title="Open AI Assistant (Ctrl+Shift+A)"
          >
            🤖 AI Assistant
            <div className="connection-status">
              <span className={`status-dot ${connectionStatus}`}></span>
              {connectionStatus}
            </div>
          </button>
        </div>
      )}

      {/* Main AI Assistant Interface */}
      {isVisible && (
        <div className="ai-assistant-main">
          {/* Header */}
          <div className="ai-header">
            <div className="ai-title">
              <span className="ai-icon">🤖</span>
              <h2>AI Assistant</h2>
              <div className="connection-indicator">
                <span className={`status-dot ${connectionStatus}`}></span>
                <span className="status-text">{connectionStatus}</span>
              </div>
            </div>
            
            <div className="ai-controls">
              <button
                className="analyze-btn"
                onClick={analyzeCodeQuality}
                disabled={isAnalyzing || !currentContext.filePath}
                title="Analyze Code Quality (Ctrl+Shift+D)"
              >
                {isAnalyzing ? '🔄' : '🔍'} Analyze
              </button>
              <button
                className="close-btn"
                onClick={() => setIsVisible(false)}
                title="Close AI Assistant"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Feature Tabs */}
          <div className="ai-features">
            {aiFeatures.filter(f => f.enabled).map(feature => (
              <button
                key={feature.id}
                className={`feature-btn ${activeFeature === feature.id ? 'active' : ''}`}
                onClick={() => setActiveFeature(feature.id)}
                title={`${feature.description}${feature.hotkey ? ` (${feature.hotkey})` : ''}`}
              >
                <span className="feature-icon">{feature.icon}</span>
                <span className="feature-name">{feature.name}</span>
              </button>
            ))}
          </div>

          {/* Active Feature Content */}
          <div className="ai-content">
            {activeFeature === 'chat' && (
              <div className="ai-chat-placeholder">
                <h3>AI Chat Interface</h3>
                <p>Chat interface would be rendered here with proper AIIntegrationSystem integration.</p>
                <button onClick={() => console.log('Chat message sent')}>
                  Send Test Message
                </button>
              </div>
            )}

            {activeFeature === 'generator' && (
              <AICodeGenerator
                onGenerateCode={handleCodeGeneration}
                onInsertCode={handleInsertCode}
                onPreviewCode={onPreviewCode}
                context={convertToAdvancedContext(currentContext)}
                isVisible={true}
                onToggle={() => setIsVisible(false)}
              />
            )}
          </div>

          {/* Analysis Results */}
          {analysisResults.length > 0 && (
            <div className="analysis-results">
              <h3>📊 Analysis Results</h3>
              {analysisResults.map((result, index) => (
                <div key={index} className="analysis-item">
                  <h4>{result.title}</h4>
                  <div className="analysis-content">
                    {result.content.split('\n').map((line: string, lineIndex: number) => (
                      <p key={lineIndex}>{line}</p>
                    ))}
                  </div>
                  <div className="analysis-meta">
                    Model: {result.metadata.model} | 
                    Confidence: {Math.round(result.metadata.confidence * 100)}% |
                    Time: {result.metadata.processingTime}ms
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Suggestions */}
          {recentSuggestions.length > 0 && (
            <div className="recent-suggestions">
              <h3>💡 Suggestions</h3>
              <div className="suggestions-list">
                {recentSuggestions.slice(0, 3).map(suggestion => (
                  <div key={suggestion.id} className="suggestion-item">
                    <div className="suggestion-header">
                      <span className="suggestion-title">{suggestion.title}</span>
                      <div className="suggestion-actions">
                        <span className="suggestion-confidence">
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                        <button
                          className="apply-suggestion-btn"
                          onClick={() => handleApplySuggestion(suggestion.code, suggestion.startLine, suggestion.endLine)}
                          title="Apply suggestion"
                        >
                          ✅ Apply
                        </button>
                      </div>
                    </div>
                    <p className="suggestion-description">{suggestion.description}</p>
                    <div className="suggestion-meta">
                      <span className={`priority ${suggestion.priority}`}>{suggestion.priority}</span>
                      <span className={`category ${suggestion.category}`}>{suggestion.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session Stats */}
          <div className="session-stats">
            <div className="stat-item">
              <span className="stat-label">Messages:</span>
              <span className="stat-value">{activeSession.messageCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Generated:</span>
              <span className="stat-value">{activeSession.codeGenerated}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Applied:</span>
              <span className="stat-value">{activeSession.suggestionsApplied}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Session:</span>
              <span className="stat-value">
                {Math.round((Date.now() - activeSession.startTime) / 60000)}m
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantIntegration;
