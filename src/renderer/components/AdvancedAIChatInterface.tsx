// Advanced AI Chat Interface - Next-generation conversational AI
// Features: Real-time streaming, context awareness, code generation, multi-model support

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, StopCircle, Code, Image, FileText, Brain, Zap, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardHeader, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import './AdvancedAIChatInterface.css';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    confidence?: number;
    suggestions?: CodeSuggestion[];
    attachments?: Attachment[];
  };
}

interface CodeSuggestion {
  id: string;
  code: string;
  language: string;
  description: string;
  confidence: number;
}

interface Attachment {
  id: string;
  type: 'code' | 'image' | 'file';
  name: string;
  content: string;
  metadata?: any;
}

interface AdvancedAIChatInterfaceProps {
  isVisible: boolean;
  onToggle: () => void;
  onCodeGeneration?: (code: string) => void;
  contextAwareness?: boolean;
  multiModelSupport?: boolean;
  streamingEnabled?: boolean;
}

export const AdvancedAIChatInterface: React.FC<AdvancedAIChatInterfaceProps> = ({
  isVisible,
  onToggle,
  onCodeGeneration,
  contextAwareness = true,
  multiModelSupport = true,
  streamingEnabled = true
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [isRecording, setIsRecording] = useState(false);
  const [contextMode, setContextMode] = useState<'auto' | 'manual' | 'off'>('auto');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamingTimeoutRef = useRef<NodeJS.Timeout>();

  // Available AI models
  const availableModels = [
    { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model', badge: 'Premium' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient', badge: 'Fast' },
    { id: 'claude-3', name: 'Claude 3', description: 'Anthropic\'s latest', badge: 'New' },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google\'s advanced model', badge: 'Pro' }
  ];

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle message sending
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (streamingEnabled) {
        // Simulate streaming response
        setIsStreaming(true);
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          type: 'assistant',
          content: '',
          timestamp: new Date(),
          metadata: {
            model: selectedModel,
            confidence: 0.95
          }
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Simulate streaming chunks
        const fullResponse = `I understand you're asking about "${inputValue}". As an AI assistant integrated into Primus IDE, I can help you with code generation, debugging, documentation, and much more! 

Here's what I can do:
- **Code Generation**: Create functions, classes, components
- **Bug Detection**: Analyze and fix code issues  
- **Documentation**: Generate comprehensive docs
- **Optimization**: Suggest performance improvements
- **Learning**: Explain complex concepts

Would you like me to demonstrate any specific capability?`;

        const words = fullResponse.split(' ');
        let currentIndex = 0;

        const streamInterval = setInterval(() => {
          if (currentIndex < words.length) {
            const chunk = words.slice(0, currentIndex + 1).join(' ');
            setMessages(prev => 
              prev.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, content: chunk }
                  : msg
              )
            );
            currentIndex++;
          } else {
            clearInterval(streamInterval);
            setIsStreaming(false);
            setIsLoading(false);
            
            // Add metadata after streaming completes
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessage.id
                  ? {
                      ...msg,
                      metadata: {
                        ...msg.metadata,
                        tokens: words.length,
                        suggestions: [
                          {
                            id: 'suggestion-1',
                            code: 'console.log("Hello from AI!");',
                            language: 'javascript',
                            description: 'Simple greeting function',
                            confidence: 0.9
                          }
                        ]
                      }
                    }
                  : msg
              )
            );
          }
        }, 50);

        streamingTimeoutRef.current = streamInterval;
      } else {
        // Non-streaming response
        setTimeout(() => {
          const assistantMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            type: 'assistant',
            content: `I received your message: "${inputValue}". This is a response from the Advanced AI Chat Interface! 🚀`,
            timestamp: new Date(),
            metadata: {
              model: selectedModel,
              tokens: 25,
              confidence: 0.92
            }
          };

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
        }, 1000);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [inputValue, isLoading, selectedModel, streamingEnabled]);

  // Handle voice recording
  const handleVoiceToggle = useCallback(() => {
    setIsRecording(!isRecording);
    // Voice recording implementation would go here
    if (!isRecording) {
      
    } else {
      
    }
  }, [isRecording]);

  // Handle code suggestion application
  const handleApplySuggestion = useCallback((suggestion: CodeSuggestion) => {
    if (onCodeGeneration) {
      onCodeGeneration(suggestion.code);
    }
    
  }, [onCodeGeneration]);

  // Key press handler
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  if (!isVisible) return null;

  return (
    <div className="advanced-ai-chat-interface">
      <Card className="chat-container">
        <CardHeader className="chat-header">
          <div className="header-content">
            <div className="title-section">
              <Brain className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold">Advanced AI Assistant</h3>
              {isStreaming && (
                <Badge variant="outline" className="streaming-badge">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Streaming
                </Badge>
              )}
            </div>
            
            <div className="controls-section">
              {multiModelSupport && (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="model-selector"
                  title="Select AI Model"
                  aria-label="Select AI Model"
                >
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="close-button"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="chat-content">
          <div className="messages-container">
            {messages.length === 0 && (
              <div className="welcome-message">
                <Brain className="h-12 w-12 text-purple-500 mb-4" />
                <h4 className="text-lg font-semibold mb-2">Welcome to Advanced AI Chat!</h4>
                <p className="text-gray-600 text-center">
                  I'm your intelligent coding assistant. Ask me anything about code, 
                  development, debugging, or let me help you build amazing software!
                </p>
                <div className="quick-actions mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputValue('Generate a React component for a todo list')}
                  >
                    <Code className="h-4 w-4 mr-1" />
                    Generate Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputValue('Explain async/await in JavaScript')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Explain Concept
                  </Button>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.type === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  
                  {message.metadata?.suggestions && (
                    <div className="suggestions-container">
                      <h5 className="suggestions-title">Code Suggestions:</h5>
                      {message.metadata.suggestions.map((suggestion) => (
                        <div key={suggestion.id} className="suggestion-item">
                          <div className="suggestion-header">
                            <Code className="h-4 w-4" />
                            <span className="suggestion-language">{suggestion.language}</span>
                            <Badge variant="secondary" className="confidence-badge">
                              {Math.round(suggestion.confidence * 100)}%
                            </Badge>
                          </div>
                          <pre className="suggestion-code">{suggestion.code}</pre>
                          <div className="suggestion-actions">
                            <Button
                              size="sm"
                              onClick={() => handleApplySuggestion(suggestion)}
                              className="apply-button"
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              Apply Code
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="message-metadata">
                  <span className="timestamp">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.metadata?.model && (
                    <Badge variant="outline" className="model-badge">
                      {message.metadata.model}
                    </Badge>
                  )}
                  {message.metadata?.tokens && (
                    <span className="tokens">
                      {message.metadata.tokens} tokens
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && !isStreaming && (
              <div className="loading-message">
                <div className="loading-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about code, debugging, optimization..."
                className="message-input"
                disabled={isLoading}
                rows={1}
              />
              
              <div className="input-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVoiceToggle}
                  className={`voice-button ${isRecording ? 'recording' : ''}`}
                  disabled={isLoading}
                >
                  {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="send-button"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {contextAwareness && (
              <div className="context-status">
                <Badge 
                  variant={contextMode === 'auto' ? 'default' : 'outline'}
                  className="context-badge"
                >
                  Context: {contextMode}
                </Badge>
                <span className="context-info">
                  AI is aware of your current file and project context
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedAIChatInterface;
