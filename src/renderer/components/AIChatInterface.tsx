// AI Chat Interface - Interactive AI assistant for development tasks
// Real-time chat with AI models, context-aware assistance, and integrated development tools

import React, { useState, useEffect, useRef } from 'react';
import './AIChatInterface.css';
import AIIntegrationSystem, { 
  CodeCompletionRequest, 
  RefactoringRequest, 
  DebugAssistanceRequest,
  CodeGenerationRequest,
  CodeContext
} from '../services/AIIntegrationSystem';

// Message types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type: 'text' | 'code' | 'suggestion' | 'error' | 'action';
  metadata?: {
    language?: string;
    filePath?: string;
    action?: string;
    confidence?: number;
    model?: string;
  };
  attachments?: MessageAttachment[];
}

interface MessageAttachment {
  type: 'code' | 'file' | 'image' | 'link';
  name: string;
  content: string;
  size?: number;
}

// Chat session
interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  context: SessionContext;
  createdAt: Date;
  lastActivity: Date;
  model: string;
  tags: string[];
}

interface SessionContext {
  currentFile?: string;
  projectRoot: string;
  language: string;
  workspaceFiles: string[];
  recentActivity: string[];
  activeSymbols: string[];
}

// Quick actions
interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  category: 'code' | 'debug' | 'refactor' | 'explain' | 'generate';
  shortcut?: string;
  handler: () => void;
}

// Chat interface props
interface AIChatInterfaceProps {
  aiSystem: AIIntegrationSystem;
  currentContext: CodeContext;
  onCodeAction?: (action: string, data: any) => void;
  onFileUpdate?: (filePath: string, content: string) => void;
  className?: string;
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  aiSystem,
  currentContext,
  onCodeAction,
  onFileUpdate,
  className = ''
}) => {
  // State management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get current session
  const currentSession = sessions.find(s => s.id === activeSessionId);
  const messages = currentSession?.messages || [];

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: 'explain-code',
      label: 'Explain Code',
      icon: '💡',
      description: 'Explain selected code or current function',
      category: 'explain',
      shortcut: 'Ctrl+E',
      handler: () => setInputValue('Explain the selected code or current function')
    },
    {
      id: 'generate-function',
      label: 'Generate Function',
      icon: '⚡',
      description: 'Generate a function from description',
      category: 'generate',
      shortcut: 'Ctrl+G',
      handler: () => setInputValue('Generate a function that ')
    },
    {
      id: 'fix-error',
      label: 'Fix Error',
      icon: '🔧',
      description: 'Help fix the current error',
      category: 'debug',
      shortcut: 'Ctrl+F',
      handler: () => setInputValue('Help me fix this error: ')
    },
    {
      id: 'refactor-code',
      label: 'Refactor',
      icon: '🔄',
      description: 'Suggest refactoring improvements',
      category: 'refactor',
      shortcut: 'Ctrl+R',
      handler: () => setInputValue('Refactor this code to improve ')
    },
    {
      id: 'add-tests',
      label: 'Add Tests',
      icon: '🧪',
      description: 'Generate unit tests for current code',
      category: 'generate',
      shortcut: 'Ctrl+T',
      handler: () => setInputValue('Generate unit tests for ')
    },
    {
      id: 'optimize-code',
      label: 'Optimize',
      icon: '⚡',
      description: 'Optimize code performance',
      category: 'refactor',
      shortcut: 'Ctrl+O',
      handler: () => setInputValue('Optimize this code for better performance')
    }
  ];

  // Initialize chat interface
  useEffect(() => {
    initializeChat();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update suggestions based on input
  useEffect(() => {
    if (inputValue.length > 2) {
      generateInputSuggestions(inputValue);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue]);

  /**
   * Initialize chat with default session
   */
  const initializeChat = (): void => {
    const defaultSession: ChatSession = {
      id: generateSessionId(),
      name: 'New Chat',
      messages: [
        {
          id: generateMessageId(),
          role: 'system',
          content: 'Hello! I\'m your AI coding assistant. I can help you with code completion, debugging, refactoring, and more. How can I assist you today?',
          timestamp: new Date(),
          type: 'text',
          metadata: { model: selectedModel }
        }
      ],
      context: {
        projectRoot: currentContext.projectRoot,
        language: currentContext.language,
        workspaceFiles: [],
        recentActivity: [],
        activeSymbols: []
      },
      createdAt: new Date(),
      lastActivity: new Date(),
      model: selectedModel,
      tags: []
    };

    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
  };

  /**
   * Handle sending a message
   */
  const handleSendMessage = async (): Promise<void> => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    // Add user message
    addMessageToSession(userMessage);
    setInputValue('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      // Process message and get AI response
      const response = await processUserMessage(userMessage.content);
      
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        type: response.type,
        metadata: {
          model: selectedModel,
          confidence: response.confidence,
          ...response.metadata
        },
        attachments: response.attachments
      };

      addMessageToSession(assistantMessage);

      // Execute any actions if needed
      if (response.actions) {
        await executeMessageActions(response.actions);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
        type: 'error'
      };
      addMessageToSession(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Process user message and determine appropriate response
   */
  const processUserMessage = async (content: string): Promise<any> => {
    // Analyze message intent
    const intent = analyzeMessageIntent(content);
    
    switch (intent.type) {
      case 'code-generation':
        return handleCodeGenerationRequest(intent);
      case 'debugging':
        return handleDebuggingRequest(intent);
      case 'refactoring':
        return handleRefactoringRequest(intent);
      case 'explanation':
        return handleExplanationRequest(intent);
      case 'general':
      default:
        return handleGeneralRequest(intent);
    }
  };

  /**
   * Analyze message intent
   */
  const analyzeMessageIntent = (content: string): any => {
    const lowerContent = content.toLowerCase();
    
    // Code generation patterns
    if (lowerContent.includes('generate') || lowerContent.includes('create') || lowerContent.includes('write')) {
      return { type: 'code-generation', content, context: currentContext };
    }
    
    // Debugging patterns
    if (lowerContent.includes('fix') || lowerContent.includes('error') || lowerContent.includes('debug')) {
      return { type: 'debugging', content, context: currentContext };
    }
    
    // Refactoring patterns
    if (lowerContent.includes('refactor') || lowerContent.includes('improve') || lowerContent.includes('optimize')) {
      return { type: 'refactoring', content, context: currentContext };
    }
    
    // Explanation patterns
    if (lowerContent.includes('explain') || lowerContent.includes('what does') || lowerContent.includes('how does')) {
      return { type: 'explanation', content, context: currentContext };
    }
    
    return { type: 'general', content, context: currentContext };
  };

  /**
   * Handle code generation request
   */
  const handleCodeGenerationRequest = async (intent: any): Promise<any> => {
    const request: CodeGenerationRequest = {
      prompt: intent.content,
      language: currentContext.language,
      context: currentContext,
      constraints: {
        includeComments: true,
        includeTests: false,
        includeDocumentation: false
      }
    };

    const response = await aiSystem.generateCode(request);
    
    return {
      content: `Here's the generated code:\n\n\`\`\`${currentContext.language}\n${response.code}\n\`\`\`\n\n${response.explanation}`,
      type: 'code',
      confidence: response.confidence,
      metadata: { language: currentContext.language },
      actions: [
        {
          type: 'insert-code',
          code: response.code,
          language: currentContext.language
        }
      ]
    };
  };

  /**
   * Handle debugging request
   */
  const handleDebuggingRequest = async (intent: any): Promise<any> => {
    // Mock implementation - would use real error data
    return {
      content: `## Debug Assistance\n\n**Analysis:** I can help you debug this issue. Please share the error message and relevant code.\n\n**Common Solutions:**\n- Check variable scope\n- Verify function parameters\n- Review error handling`,
      type: 'suggestion',
      confidence: 0.8,
      metadata: { action: 'debug' }
    };
  };

  /**
   * Handle refactoring request
   */
  const handleRefactoringRequest = async (intent: any): Promise<any> => {
    return {
      content: `## Refactoring Suggestions\n\nI can help improve your code structure and performance. Here are some common refactoring patterns:\n\n- Extract functions for better modularity\n- Optimize loops and conditions\n- Improve naming conventions\n- Add error handling`,
      type: 'suggestion',
      confidence: 0.8,
      metadata: { action: 'refactor' }
    };
  };

  /**
   * Handle explanation request
   */
  const handleExplanationRequest = async (intent: any): Promise<any> => {
    return {
      content: `## Code Explanation\n\nI can explain how your code works, including:\n\n- Function behavior and logic\n- Data flow and transformations\n- Design patterns used\n- Performance characteristics\n\nPlease share the specific code you'd like me to explain.`,
      type: 'text',
      confidence: 0.9,
      metadata: { action: 'explain' }
    };
  };

  /**
   * Handle general request
   */
  const handleGeneralRequest = async (intent: any): Promise<any> => {
    return {
      content: `I understand you want help with: "${intent.content}"\n\nI can assist you with:\n- Code generation and completion\n- Debugging and error fixing\n- Code refactoring and optimization\n- Code explanations\n- Testing and documentation\n\nCould you be more specific about what you'd like me to help you with?`,
      type: 'text',
      confidence: 0.8
    };
  };

  /**
   * Execute message actions
   */
  const executeMessageActions = async (actions: any[]): Promise<void> => {
    for (const action of actions) {
      switch (action.type) {
        case 'insert-code':
          onCodeAction?.('insert', { code: action.code, language: action.language });
          break;
        case 'apply-fix':
          onCodeAction?.('apply-edits', { edits: action.edits });
          break;
        case 'apply-refactoring':
          onCodeAction?.('apply-edits', { edits: action.edits });
          break;
      }
    }
  };

  /**
   * Add message to current session
   */
  const addMessageToSession = (message: ChatMessage): void => {
    setSessions(prev => 
      prev.map(session => 
        session.id === activeSessionId
          ? {
              ...session,
              messages: [...session.messages, message],
              lastActivity: new Date()
            }
          : session
      )
    );
  };

  /**
   * Create new chat session
   */
  const createNewSession = (): void => {
    const newSession: ChatSession = {
      id: generateSessionId(),
      name: `Chat ${sessions.length + 1}`,
      messages: [],
      context: {
        projectRoot: currentContext.projectRoot,
        language: currentContext.language,
        workspaceFiles: [],
        recentActivity: [],
        activeSymbols: []
      },
      createdAt: new Date(),
      lastActivity: new Date(),
      model: selectedModel,
      tags: []
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  };

  /**
   * Delete session
   */
  const deleteSession = (sessionId: string): void => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (sessionId === activeSessionId && sessions.length > 1) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setActiveSessionId(remainingSessions[0]?.id || '');
    }
  };

  /**
   * Generate input suggestions
   */
  const generateInputSuggestions = (input: string): void => {
    const suggestions = [
      'Explain this function',
      'Generate a test for this function',
      'Refactor this code to be more efficient',
      'Fix the error in this code',
      'Add documentation to this function',
      'Convert this to TypeScript',
      'Optimize this algorithm'
    ].filter(suggestion => 
      suggestion.toLowerCase().includes(input.toLowerCase())
    );

    setSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  };

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Utility functions
   */
  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const formatMessageTime = (timestamp: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(timestamp);
  };

  return (
    <div className={`ai-chat-interface ${className} ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <h3>AI Assistant</h3>
          <span className="model-indicator">{selectedModel}</span>
        </div>
        <div className="header-actions">
          <button
            className="header-action-btn"
            onClick={() => setShowQuickActions(!showQuickActions)}
            title="Quick Actions"
          >
            ⚡
          </button>
          <button
            className="header-action-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '📈' : '📉'}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Session tabs */}
          <div className="session-tabs">
            <div className="tabs-list">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`session-tab ${session.id === activeSessionId ? 'active' : ''}`}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <span className="tab-name">{session.name}</span>
                  <button
                    className="tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button className="new-session-btn" onClick={createNewSession}>
              +
            </button>
          </div>

          {/* Quick actions panel */}
          {showQuickActions && (
            <div className="quick-actions-panel">
              <div className="quick-actions-grid">
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    className={`quick-action-btn ${action.category}`}
                    onClick={action.handler}
                    title={`${action.description}${action.shortcut ? ` (${action.shortcut})` : ''}`}
                  >
                    <span className="action-icon">{action.icon}</span>
                    <span className="action-label">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="messages-container">
            {messages.map(message => (
              <div key={message.id} className={`message ${message.role} ${message.type}`}>
                <div className="message-header">
                  <span className="message-role">
                    {message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : '⚙️'}
                  </span>
                  <span className="message-time">
                    {formatMessageTime(message.timestamp)}
                  </span>
                  {message.metadata?.confidence && (
                    <span className="confidence-indicator">
                      {Math.round(message.metadata.confidence * 100)}%
                    </span>
                  )}
                </div>
                <div className="message-content">
                  {message.content.includes('```') ? (
                    <div dangerouslySetInnerHTML={{
                      __html: message.content
                        .replace(/```(\w+)?\n([\s\S]*?)```/g, 
                          '<pre><code class="language-$1">$2</code></pre>')
                        .replace(/\n/g, '<br>')
                    }} />
                  ) : (
                    <div dangerouslySetInnerHTML={{
                      __html: message.content.replace(/\n/g, '<br>')
                    }} />
                  )}
                </div>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="message-attachments">
                    {message.attachments.map((attachment, index) => (
                      <div key={index} className={`attachment ${attachment.type}`}>
                        <span className="attachment-name">{attachment.name}</span>
                        {attachment.size && (
                          <span className="attachment-size">
                            ({Math.round(attachment.size / 1024)}KB)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="message assistant loading">
                <div className="message-header">
                  <span className="message-role">🤖</span>
                  <span className="message-time">Thinking...</span>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="input-area">
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-popup">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => {
                      setInputValue(suggestion);
                      setShowSuggestions(false);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
            <div className="input-container">
              <textarea
                ref={inputRef}
                className="message-input"
                placeholder="Ask me anything about your code..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                disabled={isLoading}
              />
              <button
                className="send-button"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
            <div className="input-actions">
              <button className="input-action" title="Attach file">📎</button>
              <button className="input-action" title="Voice input">🎤</button>
              <button className="input-action" title="Screen capture">📷</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIChatInterface;
