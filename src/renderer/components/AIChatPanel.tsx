import React, { useState, useRef, useEffect } from 'react';
import { getAIService, initializeAIService, AIMessage, AIResponse } from '../ai/AIServiceManager';
import { AIConfigManager } from '../ai/AIConfigManager';
import { codeApplicationService, CodeGenerationRequest } from '../codeApplication/CodeApplicationService';
import { AdvancedAISystem, AIOperationResult } from '../ai/AdvancedAISystem';
import { SwarmOrchestrator } from '../ai/SwarmOrchestrator';
import { AgentContextManager } from '../ai/AgentContextManager';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: 'claude' | 'gpt' | 'gemini' | 'azure';
  codeBlocks?: CodeBlock[];
  metadata?: {
    operation?: string;
    duration?: number;
    confidence?: number;
    risk?: number;
    tokensUsed?: number;
    agentId?: string;
  };
  swarmInfo?: {
    agentId: string;
    taskId: string;
    progress: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
  };
}

interface CodeBlock {
  language: string;
  code: string;
  file?: string;
  startLine?: number;
  endLine?: number;
}

interface AIProvider {
  id: 'claude' | 'gpt' | 'gemini' | 'azure';
  name: string;
  icon: string;
  available: boolean;
  model: string;
}

interface SwarmTask {
  id: string;
  description: string;
  assignedAgent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: any;
}

export const AIChatPanel: React.FC<{
  advancedAISystem?: AdvancedAISystem;
  swarmOrchestrator?: SwarmOrchestrator;
  agentContextManager?: AgentContextManager;
}> = ({
  advancedAISystem,
  swarmOrchestrator,
  agentContextManager
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'claude' | 'gpt' | 'gemini' | 'azure'>('claude');
  const [isComposerMode, setIsComposerMode] = useState(false);
  const [contextFiles, setContextFiles] = useState<string[]>([]);
  const [swarmTasks, setSwarmTasks] = useState<SwarmTask[]>([]);
  const [isSwarmMode, setIsSwarmMode] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize services and connection status
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setConnectionStatus('connecting');

        // Initialize AI service with current configuration
        const config = AIConfigManager.getServiceConfig();
        const aiService = initializeAIService(config);

        // Test connection to Advanced AI System
        if (advancedAISystem) {
          try {
            const status = advancedAISystem.getStatus();
            
            setConnectionStatus('connected');
          } catch (error) {
            console.warn('Advanced AI System not fully initialized:', error);
            setConnectionStatus('disconnected');
          }
        } else {
          setConnectionStatus('disconnected');
        }

        // Test connection to Swarm Orchestrator
        if (swarmOrchestrator) {
          try {
            // Test basic swarm functionality
            
          } catch (error) {
            console.warn('Swarm Orchestrator not fully initialized:', error);
          }
        }

      } catch (error) {
        console.error('Failed to initialize AI services:', error);
        setConnectionStatus('error');
      }
    };

    initializeServices();
  }, [advancedAISystem, swarmOrchestrator]);

  // Get available providers from configuration
  const getAvailableProviders = (): AIProvider[] => {
    const enabledProviders = AIConfigManager.getEnabledProviders();
    const config = AIConfigManager.loadConfig();

    return [
      {
        id: 'claude',
        name: 'Claude',
        icon: '🧠',
        available: enabledProviders.includes('claude'),
        model: config.claude.model
      },
      {
        id: 'gpt',
        name: 'GPT',
        icon: '🤖',
        available: enabledProviders.includes('openai'),
        model: config.openai.model
      },
      {
        id: 'gemini',
        name: 'Gemini',
        icon: '💎',
        available: enabledProviders.includes('gemini'),
        model: config.gemini.model
      },
      {
        id: 'azure',
        name: 'Azure AI',
        icon: '☁️',
        available: enabledProviders.includes('azure'),
        model: config.azure.model
      }
    ];
  };

  const [aiProviders, setAiProviders] = useState<AIProvider[]>(getAvailableProviders());

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Update providers when component mounts or configuration changes
    setAiProviders(getAvailableProviders());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let response: ChatMessage;

      if (isSwarmMode && swarmOrchestrator && advancedAISystem) {
        // Use Swarm Orchestrator for complex tasks
        response = await handleSwarmChat(input);
      } else if (advancedAISystem) {
        // Use Advanced AI System for enhanced AI features
        response = await handleAdvancedAIChat(input);
      } else {
        // Fallback to basic AI service
        response = await handleBasicAIChat(input);
      }

      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('AI request failed:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
        provider: selectedProvider,
        metadata: {
          operation: 'chat',
          duration: 0,
          confidence: 0,
          risk: 1,
          tokensUsed: 0,
          agentId: 'system'
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBasicAIChat = async (prompt: string): Promise<ChatMessage> => {
    try {
      // Initialize AI service with current configuration
      const config = AIConfigManager.getServiceConfig();
      const aiService = initializeAIService(config);

      // Prepare messages array
      const messages: AIMessage[] = [];

      // Add context files if any
      if (contextFiles.length > 0) {
        const contextInfo = `Context files: ${contextFiles.join(', ')}`;
        messages.push({ role: 'system', content: contextInfo });
      }

      // Add user message
      messages.push({ role: 'user', content: prompt });

      // Send to AI provider
      const response: AIResponse = await aiService.sendMessage(selectedProvider, messages);

      // Parse code blocks from response
      const codeBlocks = aiService.parseCodeBlocks(response.content);

      return {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        provider: selectedProvider,
        codeBlocks: codeBlocks,
        metadata: {
          operation: 'basic_chat',
          duration: 0,
          confidence: 0.8,
          risk: 0.1,
          tokensUsed: 0,
          agentId: 'basic-ai'
        }
      };
    } catch (error) {
      console.error('Basic AI Chat Error:', error);
      throw error;
    }
  };

  const handleAdvancedAIChat = async (prompt: string): Promise<ChatMessage> => {
    if (!advancedAISystem) {
      throw new Error('Advanced AI System not available');
    }

    try {
      const startTime = Date.now();

      // Use Advanced AI System for enhanced completions
      const result: AIOperationResult = await advancedAISystem.hybridSearch(prompt, {
        agentId: currentAgentId || 'chat-assistant',
        maxResults: 5,
        includeHighlights: true
      });

      if (!result.success) {
        throw new Error(result.errors.join(', '));
      }

      return {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.data.results.map((r: any) => r.content).join('\n\n'),
        timestamp: new Date(),
        provider: selectedProvider,
        metadata: {
          operation: result.metadata.operation,
          duration: result.metadata.duration,
          confidence: result.metadata.confidence,
          risk: result.metadata.risk,
          tokensUsed: result.metadata.tokensUsed,
          agentId: result.metadata.agentId
        }
      };
    } catch (error) {
      console.error('Advanced AI Chat Error:', error);
      throw error;
    }
  };

  const handleSwarmChat = async (prompt: string): Promise<ChatMessage> => {
    if (!swarmOrchestrator || !advancedAISystem) {
      throw new Error('Swarm system not available');
    }

    try {
      const startTime = Date.now();
      const taskId = `chat_task_${Date.now()}`;

      // Create swarm task for the chat request
      const task = {
        id: taskId,
        type: 'chat' as const,
        description: prompt,
        requirements: ['AI processing', 'Context understanding'],
        priority: 'medium' as const,
        deadline: new Date(Date.now() + 300000), // 5 minutes
        assignedAgent: currentAgentId || 'swarm-chat-assistant'
      };

      // Submit task to swarm
      const taskResult = await swarmOrchestrator.submitTask(task);

      // Update swarm tasks state
      setSwarmTasks(prev => [...prev, {
        id: taskId,
        description: prompt,
        assignedAgent: task.assignedAgent,
        status: 'completed',
        progress: 100,
        result: taskResult
      }]);

      return {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: taskResult.output || 'Task completed by swarm',
        timestamp: new Date(),
        provider: selectedProvider,
        swarmInfo: {
          agentId: task.assignedAgent,
          taskId: taskId,
          progress: 100,
          status: 'completed'
        },
        metadata: {
          operation: 'swarm_chat',
          duration: Date.now() - startTime,
          confidence: 0.9,
          risk: 0.1,
          tokensUsed: 0,
          agentId: task.assignedAgent
        }
      };
    } catch (error) {
      console.error('Swarm Chat Error:', error);
      throw error;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSendMessage();
    }
  };

  const applyCodeSuggestion = async (codeBlock: CodeBlock) => {
    try {
      if (codeBlock.file) {
        // Create a code change using the code application service
        const result = await codeApplicationService.generateAndCreateChange(
          {
            prompt: `Apply this ${codeBlock.language} code to the file`,
            filePath: codeBlock.file,
            insertMode: 'replace',
            selectedText: codeBlock.code,
            cursorPosition: codeBlock.startLine ?
              { line: codeBlock.startLine, column: 0 } : undefined
          },
          selectedProvider
        );

        if (result.success) {
          
          // The change will appear in the Code Changes panel
        } else {
          console.error('Failed to create code change:', result.message);
        }
      } else {
        // If no specific file, try to apply to current active file
        // This would need to be implemented to get the current file from the editor
        
      }
    } catch (error) {
      console.error('Error applying code suggestion:', error);
    }
  };

  const insertAtCursor = (code: string) => {
    // Insert code at current cursor position in active editor
    
  };

  const toggleSwarmMode = () => {
    setIsSwarmMode(!isSwarmMode);
    if (!isSwarmMode) {
      // Initialize swarm mode
      setCurrentAgentId('swarm-chat-assistant');
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FF9800';
      case 'disconnected': return '#9E9E9E';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  return (
    <div className="ai-chat-panel">
      {/* Connection Status */}
      <div className="connection-status" style={{ backgroundColor: getConnectionStatusColor() }}>
        <span className="status-indicator"></span>
        <span className="status-text">{getConnectionStatusText()}</span>
      </div>

      {/* AI Provider Selection */}
      <div className="ai-provider-selector">
        {aiProviders.map(provider => (
          <button
            key={provider.id}
            className={`provider-button ${selectedProvider === provider.id ? 'active' : ''}`}
            onClick={() => setSelectedProvider(provider.id)}
            disabled={!provider.available}
            title={provider.model}
          >
            <span className="provider-icon">{provider.icon}</span>
            <span className="provider-name">{provider.name}</span>
          </button>
        ))}

        {/* Swarm Mode Toggle */}
        <button
          className={`swarm-mode-toggle ${isSwarmMode ? 'active' : ''}`}
          onClick={toggleSwarmMode}
          title="Toggle Swarm Mode"
        >
          🧙‍♂️ Swarm
        </button>
      </div>

      {/* Context Files */}
      {contextFiles.length > 0 && (
        <div className="context-files">
          <div className="context-header">
            <span>📎 Context Files ({contextFiles.length})</span>
            <button onClick={() => setContextFiles([])} className="clear-context">Clear</button>
          </div>
          <div className="context-list">
            {contextFiles.map((file, index) => (
              <div key={index} className="context-file">
                <span>{file}</span>
                <button onClick={() => setContextFiles(prev => prev.filter((_, i) => i !== index))}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Swarm Tasks */}
      {isSwarmMode && swarmTasks.length > 0 && (
        <div className="swarm-tasks">
          <div className="swarm-header">
            <span>🧙‍♂️ Active Swarm Tasks ({swarmTasks.length})</span>
          </div>
          <div className="swarm-task-list">
            {swarmTasks.map((task) => (
              <div key={task.id} className={`swarm-task ${task.status}`}>
                <div className="task-info">
                  <span className="task-agent">{task.assignedAgent}</span>
                  <span className="task-description">{task.description}</span>
                </div>
                <div className="task-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{task.progress}%</span>
                </div>
                <span className={`task-status status-${task.status}`}>
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="welcome-message">
              <h3>👋 Welcome to Enhanced AI Super Engineer Mode</h3>
              <p>I can help you with:</p>
              <ul>
                <li>🔍 Advanced code analysis and explanation</li>
                <li>🛠️ Bug fixes and optimization with risk assessment</li>
                <li>📝 Multi-file code generation and refactoring</li>
                <li>🧪 Intelligent testing and documentation</li>
                <li>🚀 Architecture recommendations with swarm intelligence</li>
                <li>🔄 Real-time collaboration with AI agents</li>
              </ul>
              <p>Status: <span style={{ color: getConnectionStatusColor() }}>{getConnectionStatusText()}</span></p>
              <p>Select an AI provider above and start chatting!</p>
            </div>
          </div>
        )}

        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-header">
              <div className="message-info">
                {message.role === 'assistant' && (
                  <span className="provider-badge">
                    {aiProviders.find(p => p.id === message.provider)?.icon} {message.provider}
                  </span>
                )}
                <span className="timestamp">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                {message.metadata && (
                  <div className="message-metadata">
                    {message.metadata.confidence && (
                      <span className="confidence">🎯 {Math.round(message.metadata.confidence * 100)}%</span>
                    )}
                    {message.metadata.duration && (
                      <span className="duration">⏱️ {message.metadata.duration}ms</span>
                    )}
                    {message.metadata.agentId && (
                      <span className="agent-id">🤖 {message.metadata.agentId}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="message-content">
              {message.content}

              {/* Code Blocks */}
              {message.codeBlocks && message.codeBlocks.map((block, index) => (
                <div key={index} className="code-block-container">
                  <div className="code-block-header">
                    <span className="language">{block.language}</span>
                    {block.file && <span className="file-path">{block.file}</span>}
                    <div className="code-actions">
                      <button onClick={() => insertAtCursor(block.code)} title="Insert at cursor">
                        📍 Insert
                      </button>
                      <button onClick={() => applyCodeSuggestion(block)} title="Apply changes">
                        ✅ Apply
                      </button>
                      <button onClick={() => navigator.clipboard.writeText(block.code)} title="Copy">
                        📋 Copy
                      </button>
                    </div>
                  </div>
                  <pre className="code-block">
                    <code className={`language-${block.language}`}>{block.code}</code>
                  </pre>
                </div>
              ))}

              {/* Swarm Info */}
              {message.swarmInfo && (
                <div className="swarm-info">
                  <div className="swarm-task-summary">
                    <span className="swarm-agent">Agent: {message.swarmInfo.agentId}</span>
                    <span className="swarm-task">Task: {message.swarmInfo.taskId}</span>
                    <span className={`swarm-status status-${message.swarmInfo.status}`}>
                      {message.swarmInfo.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            {isSwarmMode && <div className="swarm-loading">Swarm processing...</div>}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-container">
        <div className="input-toolbar">
          <button
            className={`composer-toggle ${isComposerMode ? 'active' : ''}`}
            onClick={() => setIsComposerMode(!isComposerMode)}
            title="Toggle Composer Mode"
          >
            {isComposerMode ? '💻' : '✏️'} Composer
          </button>
          <button
            onClick={() => {/* Add current file to context */}}
            title="Add current file to context"
          >
            📎 Add Context
          </button>
          <button
            onClick={() => setMessages([])}
            title="Clear chat"
          >
            🗑️ Clear
          </button>
        </div>

        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isComposerMode ?
              "Describe what you want to build... I'll generate the complete implementation with swarm intelligence." :
              "Ask me anything about your code... (Ctrl/Cmd + Enter to send)"
            }
            className={`chat-input ${isComposerMode ? 'composer-mode' : ''}`}
            rows={isComposerMode ? 4 : 1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="send-button"
          >
            {isLoading ? '⏳' : '🚀'}
          </button>
        </div>
      </div>
    </div>
  );
};
