import React, { useState, useEffect, useRef } from 'react';
import { aiAssistant, AIChatMessage, CodeContext } from './AIAssistantService';

interface AIChatPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  currentContext?: CodeContext;
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({
  isVisible,
  onToggle,
  currentContext
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('mock');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isVisible) {
      initializeAI();
      loadChatHistory();
    }
  }, [isVisible]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeAI = async () => {
    try {
      await aiAssistant.initialize();
      setIsConnected(true);
      
      // Add welcome message
      const welcomeMessage: AIChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: '👋 Hi! I\'m your AI coding assistant. I can help with code analysis, debugging, explanations, and code generation. What would you like to work on?',
        timestamp: Date.now()
      };
      
      setMessages(prev => prev.length === 0 ? [welcomeMessage] : prev);
    } catch (error) {
      console.error('Failed to initialize AI:', error);
      setIsConnected(false);
    }
  };

  const loadChatHistory = () => {
    const history = aiAssistant.getChatHistory();
    if (history.length > 0) {
      setMessages(history);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await aiAssistant.chatWithAI(userMessage, currentContext);
      const updatedHistory = aiAssistant.getChatHistory();
      setMessages(updatedHistory);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: AIChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    aiAssistant.clearChatHistory();
    setMessages([]);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt);
    inputRef.current?.focus();
  };

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  };

  const quickPrompts = [
    "Explain this code",
    "Find bugs in this code",
    "Optimize this function",
    "Add error handling",
    "Generate unit tests",
    "Refactor this code",
    "Add documentation",
    "Convert to TypeScript"
  ];

  if (!isVisible) return null;

  return (
    <div className="ai-chat-overlay">
      <div className="ai-chat-panel">
        {/* Header */}
        <div className="ai-chat-header">
          <div className="header-left">
            <div className="ai-status">
              <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
              <span className="ai-title">🤖 AI Assistant</span>
            </div>
            <select 
              className="provider-select"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              title="Select AI Provider"
            >
              <option value="mock">Mock AI (Development)</option>
              <option value="openai">OpenAI GPT</option>
              <option value="claude">Anthropic Claude</option>
              <option value="local">Local Model</option>
            </select>
          </div>
          <div className="header-controls">
            <button 
              className="control-btn"
              onClick={handleClearChat}
              title="Clear Chat"
            >
              🗑️
            </button>
            <button 
              className="control-btn"
              onClick={onToggle}
              title="Close AI Chat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="quick-prompts">
          <div className="prompts-label">Quick Prompts:</div>
          <div className="prompts-grid">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                className="quick-prompt-btn"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Context Info */}
        {currentContext && (
          <div className="context-info">
            <div className="context-label">Current Context:</div>
            <div className="context-details">
              <span className="context-file">📄 {currentContext.filePath}</span>
              <span className="context-lang">{currentContext.language}</span>
              <span className="context-pos">
                Line {currentContext.cursorPosition.line}, Col {currentContext.cursorPosition.column}
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="ai-messages">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.role}`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-text">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: formatMessageContent(message.content) 
                    }} 
                  />
                </div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message assistant loading">
              <div className="message-avatar">🤖</div>
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

        {/* Input */}
        <div className="ai-input-section">
          <div className="input-container">
            <textarea
              ref={inputRef}
              className="ai-input"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Ask me anything about your code..." : "Connecting to AI..."}
              disabled={!isConnected || isLoading}
              rows={3}
            />
            <button 
              className="send-btn"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !isConnected || isLoading}
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
          <div className="input-help">
            Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
