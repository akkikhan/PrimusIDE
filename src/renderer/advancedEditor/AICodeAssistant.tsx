import React, { useState, useEffect, useRef } from 'react';
import { contextIntegrationService } from '../contextAwareness/ContextIntegrationService';
import { smartCodeIntelligence } from '../contextAwareness/SmartCodeIntelligence';
import { advancedMonacoProvider } from './AdvancedMonacoProvider';
import './AICodeAssistant.css';

interface AISuggestion {
  id: string;
  type: 'completion' | 'refactor' | 'fix' | 'explanation' | 'optimization';
  title: string;
  description: string;
  code?: string;
  confidence: number;
  reasoning: string;
  tags: string[];
  estimatedImpact: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

interface AICodeAssistantProps {
  isVisible: boolean;
  onClose: () => void;
  currentSelection?: string;
  currentFile?: string;
}

interface AssistantState {
  suggestions: AISuggestion[];
  isLoading: boolean;
  selectedSuggestion: AISuggestion | null;
  activeTab: 'suggestions' | 'chat' | 'history';
  chatMessages: ChatMessage[];
  currentInput: string;
  searchQuery: string;
  filterType: string;
  conversationHistory: ConversationEntry[];
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: any;
}

interface ConversationEntry {
  id: string;
  title: string;
  timestamp: Date;
  messages: ChatMessage[];
  tags: string[];
}

export const AICodeAssistant: React.FC<AICodeAssistantProps> = ({
  isVisible,
  onClose,
  currentSelection,
  currentFile
}) => {
  const [state, setState] = useState<AssistantState>({
    suggestions: [],
    isLoading: false,
    selectedSuggestion: null,
    activeTab: 'suggestions',
    chatMessages: [],
    currentInput: '',
    searchQuery: '',
    filterType: 'all',
    conversationHistory: JSON.parse(localStorage.getItem('aiAssistantHistory') || '[]')
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      generateContextualSuggestions();
    }
  }, [isVisible, currentSelection, currentFile]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [state.chatMessages]);

  const updateState = (updates: Partial<AssistantState>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  };

  const mapConfidenceToImpact = (confidence: number): 'low' | 'medium' | 'high' => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  };

  const mapInsightTypeToSuggestionType = (type: string): AISuggestion['type'] => {
    switch (type) {
      case 'performance': return 'optimization';
      case 'error': return 'fix';
      case 'refactor': return 'refactor';
      case 'documentation': return 'explanation';
      default: return 'completion';
    }
  };

  const mapPriorityToImpact = (priority: string): 'low' | 'medium' | 'high' => {
    switch (priority) {
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  };

  const mapComplexityToDifficulty = (complexity: number): 'easy' | 'medium' | 'hard' => {
    if (complexity >= 8) return 'hard';
    if (complexity >= 5) return 'medium';
    return 'easy';
  };

  const getFallbackSuggestions = (): AISuggestion[] => [
    {
      id: 'fallback-1',
      type: 'completion',
      title: 'Add Type Annotations',
      description: 'Improve code reliability by adding TypeScript type annotations',
      confidence: 0.7,
      reasoning: 'Type safety reduces runtime errors and improves development experience',
      tags: ['typescript', 'safety'],
      estimatedImpact: 'medium',
      difficulty: 'easy',
      category: 'Code Quality'
    },
    {
      id: 'fallback-2',
      type: 'refactor',
      title: 'Extract Function',
      description: 'Extract repeated code patterns into reusable functions',
      confidence: 0.6,
      reasoning: 'Reduces code duplication and improves maintainability',
      tags: ['refactoring', 'maintainability'],
      estimatedImpact: 'medium',
      difficulty: 'medium',
      category: 'Refactoring'
    }
  ];

  const trackSuggestionUsage = (suggestion: AISuggestion) => {
    const usage = JSON.parse(localStorage.getItem('aiSuggestionUsage') || '{}');
    usage[suggestion.id] = {
      count: (usage[suggestion.id]?.count || 0) + 1,
      lastUsed: new Date().toISOString(),
      type: suggestion.type,
      category: suggestion.category
    };
    localStorage.setItem('aiSuggestionUsage', JSON.stringify(usage));
  };

  const generateAIResponse = async (input: string): Promise<string> => {
    // Mock AI response generation - in real implementation, this would call an AI service
    const responses = [
      "I can help you with that! Let me analyze your code and provide some suggestions.",
      "Based on your question, here are some recommendations for improving your code quality.",
      "That's a great question! Let me break down the best practices for this scenario.",
      "I notice you're working on [specific pattern]. Here are some optimizations you might consider."
    ];

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const extractTagsFromMessages = (messages: ChatMessage[]): string[] => {
    const tags = new Set<string>();
    messages.forEach(message => {
      // Simple tag extraction - in real implementation, use NLP
      if (message.content.includes('React')) tags.add('react');
      if (message.content.includes('TypeScript')) tags.add('typescript');
      if (message.content.includes('function')) tags.add('functions');
      if (message.content.includes('error')) tags.add('debugging');
    });
    return Array.from(tags);
  };

  const generateContextualSuggestions = async () => {
    updateState({ isLoading: true });

    try {
      // Get contextual assistance from the integration service
      const contextualAssistance = await contextIntegrationService.getContextualAssistance({
        type: 'implement_feature',
        target: currentSelection ? 'selection' : 'file',
        scope: 'local',
        context: {
          relatedFiles: [],
          dependencies: [],
          references: []
        }
      });

      // Get code intelligence insights
      const codeInsights = smartCodeIntelligence.getActiveSuggestions();

      // Combine and format suggestions
      const suggestions: AISuggestion[] = [
        ...contextualAssistance.suggestions.map((suggestion, index) => ({
          id: `contextual-${index}`,
          type: 'completion' as const,
          title: suggestion.title,
          description: suggestion.description,
          code: suggestion.code,
          confidence: suggestion.confidence || 0.5,
          reasoning: 'Generated by AI contextual analysis',
          tags: ['ai', 'contextual'],
          estimatedImpact: mapConfidenceToImpact(suggestion.confidence || 0.5),
          difficulty: 'medium' as const,
          category: 'Contextual AI'
        })),
        ...codeInsights.map((insight, index) => ({
          id: `insight-${index}`,
          type: mapInsightTypeToSuggestionType(insight.type || 'completion'),
          title: insight.title || 'Code Suggestion',
          description: insight.description || 'Improve your code quality',
          code: insight.code,
          confidence: insight.confidence || 0.5,
          reasoning: 'Based on code analysis patterns',
          tags: [insight.type || 'general', 'analysis'],
          estimatedImpact: 'medium' as const,
          difficulty: mapComplexityToDifficulty(5),
          category: 'Code Intelligence'
        }))
      ];

      updateState({ 
        suggestions: suggestions.sort((a, b) => b.confidence - a.confidence),
        isLoading: false 
      });

    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      updateState({ 
        suggestions: getFallbackSuggestions(),
        isLoading: false 
      });
    }
  };

  const handleSuggestionClick = (suggestion: AISuggestion) => {
    updateState({ selectedSuggestion: suggestion });
  };

  const applySuggestion = async (suggestion: AISuggestion) => {
    if (!suggestion.code) {
      await explainSuggestion(suggestion);
      return;
    }

    try {
      // Apply suggestion to Monaco Editor
      await advancedMonacoProvider.emit('applySuggestion', {
        code: suggestion.code,
        type: suggestion.type,
        description: suggestion.description
      });

      // Track usage
      trackSuggestionUsage(suggestion);
      
      // Add to chat messages
      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Applied suggestion: ${suggestion.title}\n\n${suggestion.description}`,
        timestamp: new Date(),
        context: { suggestionId: suggestion.id }
      };

      updateState({
        chatMessages: [...state.chatMessages, chatMessage],
        selectedSuggestion: null
      });

    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    }
  };

  const explainSuggestion = async (suggestion: AISuggestion) => {
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `**${suggestion.title}**\n\n${suggestion.description}\n\n**Reasoning:** ${suggestion.reasoning}\n\n**Impact:** ${suggestion.estimatedImpact} • **Difficulty:** ${suggestion.difficulty}`,
      timestamp: new Date(),
      context: { suggestionId: suggestion.id }
    };

    updateState({
      chatMessages: [...state.chatMessages, chatMessage],
      activeTab: 'chat'
    });
  };

  const handleChatSubmit = async () => {
    if (!state.currentInput.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: state.currentInput.trim(),
      timestamp: new Date()
    };

    updateState({
      chatMessages: [...state.chatMessages, userMessage],
      currentInput: ''
    });

    setIsProcessing(true);

    try {
      // Generate AI response based on user input
      const response = await generateAIResponse(state.currentInput.trim());
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };

      updateState({
        chatMessages: [...state.chatMessages, userMessage, assistantMessage]
      });

    } catch (error) {
      console.error('Failed to generate AI response:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try rephrasing your question.',
        timestamp: new Date()
      };

      updateState({
        chatMessages: [...state.chatMessages, userMessage, errorMessage]
      });
    }

    setIsProcessing(false);
  };

  const saveConversation = () => {
    if (state.chatMessages.length === 0) return;

    const conversation: ConversationEntry = {
      id: Date.now().toString(),
      title: state.chatMessages[0]?.content.slice(0, 50) + '...' || 'New Conversation',
      timestamp: new Date(),
      messages: state.chatMessages,
      tags: extractTagsFromMessages(state.chatMessages)
    };

    const newHistory = [conversation, ...state.conversationHistory].slice(0, 50);
    localStorage.setItem('aiAssistantHistory', JSON.stringify(newHistory));
    
    updateState({ conversationHistory: newHistory });
  };

  const loadConversation = (conversation: ConversationEntry) => {
    updateState({
      chatMessages: conversation.messages,
      activeTab: 'chat'
    });
  };

  const filteredSuggestions = state.suggestions.filter(suggestion => {
    if (state.filterType !== 'all' && suggestion.type !== state.filterType) return false;
    if (state.searchQuery && !suggestion.title.toLowerCase().includes(state.searchQuery.toLowerCase())) return false;
    return true;
  });

  const renderSuggestionsTab = () => (
    <div className="suggestions-tab">
      <div className="suggestions-header">
        <div className="suggestions-controls">
          <input
            type="text"
            placeholder="Search suggestions..."
            value={state.searchQuery}
            onChange={(e) => updateState({ searchQuery: e.target.value })}
            className="search-input"
          />
          <select
            value={state.filterType}
            onChange={(e) => updateState({ filterType: e.target.value })}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="completion">Completions</option>
            <option value="refactor">Refactoring</option>
            <option value="fix">Fixes</option>
            <option value="explanation">Explanations</option>
            <option value="optimization">Optimizations</option>
          </select>
        </div>
        <button onClick={generateContextualSuggestions} className="refresh-button" disabled={state.isLoading}>
          {state.isLoading ? '⟳ Loading...' : '↻ Refresh'}
        </button>
      </div>

      <div className="suggestions-list">
        {filteredSuggestions.map(suggestion => (
          <div
            key={suggestion.id}
            className={`suggestion-item ${state.selectedSuggestion?.id === suggestion.id ? 'selected' : ''}`}
            onClick={() => handleSuggestionClick(suggestion)}
          >
            <div className="suggestion-header">
              <div className="suggestion-type-badge" data-type={suggestion.type}>
                {suggestion.type}
              </div>
              <div className="suggestion-confidence">
                {Math.round(suggestion.confidence * 100)}%
              </div>
            </div>
            
            <h4 className="suggestion-title">{suggestion.title}</h4>
            <p className="suggestion-description">{suggestion.description}</p>
            
            <div className="suggestion-metadata">
              <span className="suggestion-impact" data-impact={suggestion.estimatedImpact}>
                Impact: {suggestion.estimatedImpact}
              </span>
              <span className="suggestion-difficulty" data-difficulty={suggestion.difficulty}>
                Difficulty: {suggestion.difficulty}
              </span>
              <span className="suggestion-category">{suggestion.category}</span>
            </div>
            
            <div className="suggestion-tags">
              {suggestion.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>

            <div className="suggestion-actions">
              <button 
                onClick={(e) => { e.stopPropagation(); applySuggestion(suggestion); }}
                className="apply-button"
                disabled={!suggestion.code}
              >
                {suggestion.code ? 'Apply' : 'Explain'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); explainSuggestion(suggestion); }}
                className="explain-button"
              >
                💬 Discuss
              </button>
            </div>
          </div>
        ))}

        {filteredSuggestions.length === 0 && !state.isLoading && (
          <div className="empty-state">
            <p>No suggestions available.</p>
            <p>Try selecting some code or opening a different file.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderChatTab = () => (
    <div className="chat-tab">
      <div className="chat-container" ref={chatContainerRef}>
        {state.chatMessages.map(message => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">{message.content}</div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="message assistant processing">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="chat-input-container">
        <textarea
          ref={inputRef}
          value={state.currentInput}
          onChange={(e) => updateState({ currentInput: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleChatSubmit();
            }
          }}
          placeholder="Ask me about your code, request explanations, or get suggestions..."
          className="chat-input"
          rows={3}
        />
        <div className="chat-actions">
          <button 
            onClick={handleChatSubmit}
            disabled={!state.currentInput.trim() || isProcessing}
            className="send-button"
          >
            Send (Ctrl+Enter)
          </button>
          <button onClick={saveConversation} className="save-button" disabled={state.chatMessages.length === 0}>
            Save Chat
          </button>
        </div>
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="history-tab">
      <div className="history-header">
        <h4>Conversation History</h4>
        <button 
          onClick={() => {
            localStorage.removeItem('aiAssistantHistory');
            updateState({ conversationHistory: [] });
          }}
          className="clear-history-button"
        >
          Clear History
        </button>
      </div>
      
      <div className="history-list">
        {state.conversationHistory.map(conversation => (
          <div 
            key={conversation.id} 
            className="history-item"
            onClick={() => loadConversation(conversation)}
          >
            <div className="history-title">{conversation.title}</div>
            <div className="history-metadata">
              <span className="history-date">
                {conversation.timestamp.toLocaleDateString()}
              </span>
              <span className="history-messages">
                {conversation.messages.length} messages
              </span>
            </div>
            <div className="history-tags">
              {conversation.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
        
        {state.conversationHistory.length === 0 && (
          <div className="empty-state">
            <p>No conversation history yet.</p>
            <p>Start a chat to see your conversations here.</p>
          </div>
        )}
      </div>
    </div>
  );

  if (!isVisible) return null;

  return (
    <div className="ai-code-assistant">
      <div className="assistant-header">
        <h3>🤖 AI Code Assistant</h3>
        <div className="assistant-tabs">
          <button
            className={`tab ${state.activeTab === 'suggestions' ? 'active' : ''}`}
            onClick={() => updateState({ activeTab: 'suggestions' })}
          >
            Suggestions ({state.suggestions.length})
          </button>
          <button
            className={`tab ${state.activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => updateState({ activeTab: 'chat' })}
          >
            Chat ({state.chatMessages.length})
          </button>
          <button
            className={`tab ${state.activeTab === 'history' ? 'active' : ''}`}
            onClick={() => updateState({ activeTab: 'history' })}
          >
            History ({state.conversationHistory.length})
          </button>
        </div>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      <div className="assistant-content">
        {state.activeTab === 'suggestions' && renderSuggestionsTab()}
        {state.activeTab === 'chat' && renderChatTab()}
        {state.activeTab === 'history' && renderHistoryTab()}
      </div>
    </div>
  );
};

export default AICodeAssistant;
