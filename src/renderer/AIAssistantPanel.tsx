import React, { useState, useEffect, useRef } from 'react';
import { AIProvider } from './ai/AIProvider';
import './AIAssistantPanel.css';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIAssistantPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  currentFile?: string;
  selectedCode?: string;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isVisible,
  onToggle,
  currentFile,
  selectedCode
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: '🚀 Welcome to Primus IDE AI Assistant! I can help you with:\n\n• Code completion and suggestions\n• Code review and optimization\n• Bug detection and fixing\n• Documentation generation\n• Refactoring assistance\n\nWhat would you like to work on today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setAiProvider(new AIProvider());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !aiProvider) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const assistantResponse = await aiProvider.generateCompletion(inputValue);

      if (assistantResponse) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: assistantResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('No response from AI assistant.');
      }
    } catch (error) {
      console.error('Error communicating with AI assistant:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: 'Sorry, I encountered an error. Please check the console for details.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus();
    }
  }, [isVisible]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const formatMessage = (content: string) => {
    // Basic markdown-like formatting
    const codeBlocks = [];
    let tempContent = content;

    // First, extract and replace code blocks
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockRegex.exec(tempContent)) !== null) {
      const code = match[1];
      const placeholder = `__CODEBLOCK_${codeBlocks.length}__`;
      codeBlocks.push(code);
      tempContent = tempContent.replace(match[0], placeholder);
    }

    // Process other markdown-like syntax
    let html = tempContent
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');

    // Re-insert code blocks
    codeBlocks.forEach((code, index) => {
      const placeholder = `__CODEBLOCK_${index}__`;
      const codeHtml = `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
      html = html.replace(placeholder, codeHtml);
    });

    return html;
  };

  const quickActions = [
    { label: 'Explain Code', action: 'Explain this code and what it does' },
    { label: 'Fix Bugs', action: 'Find and fix any bugs in this code' },
    { label: 'Optimize', action: 'Optimize this code for better performance' },
    { label: 'Add Comments', action: 'Add detailed comments to this code' },
    { label: 'Refactor', action: 'Refactor this code to make it more readable and maintainable' },
    { label: 'Generate Tests', action: 'Generate unit tests for this code' }
  ];

  if (!isVisible) return null;

  return (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-header">
        <div className="ai-assistant-title">
          <span className="ai-icon">🤖</span>
          <h3>AI Assistant</h3>
          <div className="ai-status">
            <span className={`status-dot ${aiProvider ? 'connected' : 'disconnected'}`}></span>
            <span className="status-text">
              {aiProvider ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <button className="close-button" onClick={onToggle}>×</button>
      </div>

      {selectedCode && (
        <div className="selected-code-indicator">
          <span className="code-icon">📝</span>
          <span>Code selected ({selectedCode.split('\n').length} lines)</span>
        </div>
      )}

      <div className="quick-actions">
        <div className="quick-actions-title">Quick Actions:</div>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="quick-action-button"
              onClick={() => {
                if (selectedCode) {
                  setInputValue(action.action);
                  inputRef.current?.focus();
                } else {
                  alert('Please select some code first to use quick actions');
                }
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="messages-container">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <div 
                className="message-text"
                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
              />
              <div className="message-timestamp">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
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

      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedCode ? "Ask about the selected code..." : "Ask me anything about your code..."}
            className="message-input"
            rows={3}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="send-button"
          >
            {isLoading ? '⏳' : '🚀'}
          </button>
        </div>
        <div className="input-hint">
          Press Enter to send, Shift+Enter for new line • {aiProvider ? 'AI Ready' : 'Configure AI in Settings (Ctrl+Alt+A)'}
        </div>
      </form>
    </div>
  );
};
