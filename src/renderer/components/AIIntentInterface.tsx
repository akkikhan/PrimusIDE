/**
 * AI Intent Interface - Voice and Text Command Input Component
 * Provides intelligent command input with voice recognition and suggestions
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Lightbulb, Brain, Zap } from 'lucide-react';
import { intentHandler, Intent, IntentType } from '../ai/IntentHandler';
import { commandProcessor, CommandResult, EditorContext } from '../ai/CommandProcessor';
import './AIIntentInterface.css';

// Import Speech Recognition types
/// <reference types="../../../types/speech" />

interface AIIntentInterfaceProps {
  onIntentExecuted?: (intent: Intent, result: CommandResult) => void;
  editorContext?: EditorContext;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

interface Suggestion {
  text: string;
  intentType: IntentType;
  description: string;
}

export const AIIntentInterface: React.FC<AIIntentInterfaceProps> = ({
  onIntentExecuted,
  editorContext = {},
  isVisible = true,
  onToggleVisibility
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentIntents, setRecentIntents] = useState<Intent[]>([]);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition() as SpeechRecognition;
      recognitionRef.current = recognition;
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result: SpeechRecognitionResult) => result[0].transcript)
            .join('');
          
          setInputText(transcript);
          
          if (event.results[event.results.length - 1].isFinal) {
            setIsListening(false);
            handleProcessIntent(transcript);
          }
        };
        
        recognitionRef.current.onerror = (event: SpeechRecognitionError) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);
  
  // Update suggestions as user types
  useEffect(() => {
    if (inputText.length > 2) {
      const suggestedIntents = intentHandler.suggestIntents(inputText);
      const newSuggestions: Suggestion[] = suggestedIntents.map(intentType => ({
        text: generateSuggestionText(intentType, inputText),
        intentType,
        description: intentHandler.getIntentDescription(intentType)
      }));
      setSuggestions(newSuggestions);
    } else {
      setSuggestions(getDefaultSuggestions());
    }
  }, [inputText]);
  
  // Load recent intents
  useEffect(() => {
    setRecentIntents(intentHandler.getRecentIntents(3));
  }, []);
  
  /**
   * Toggle voice recognition
   */
  const toggleVoiceRecognition = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInputText('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);
  
  /**
   * Process intent from text input
   */
  const handleProcessIntent = useCallback(async (text?: string) => {
    const textToProcess = text || inputText;
    if (!textToProcess.trim()) return;
    
    setIsProcessing(true);
    
    try {
      // Parse intent
      const intent = intentHandler.processIntent(textToProcess);
      
      // Execute command
      const result = await commandProcessor.executeIntent(intent, editorContext);
      
      // Update state
      setLastResult(result);
      setRecentIntents(intentHandler.getRecentIntents(3));
      
      // Notify parent
      if (onIntentExecuted) {
        onIntentExecuted(intent, result);
      }
      
      // Clear input if successful
      if (result.success) {
        setInputText('');
      }
      
    } catch (error) {
      console.error('Intent processing error:', error);
      setLastResult({
        success: false,
        message: 'Failed to process command',
        suggestedActions: ['Try rephrasing your request']
      });
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, editorContext, onIntentExecuted]);
  
  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    setInputText(suggestion.text);
    handleProcessIntent(suggestion.text);
  }, [handleProcessIntent]);
  
  /**
   * Handle key press
   */
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleProcessIntent();
    }
  }, [handleProcessIntent]);
  
  /**
   * Generate suggestion text based on intent type and input
   */
  const generateSuggestionText = (intentType: IntentType, input: string): string => {
    const templates: Record<IntentType, string> = {
      [IntentType.SPLIT_VIEW]: 'split view',
      [IntentType.ANALYZE_CODE]: 'analyze this code',
      [IntentType.FORMAT_CODE]: 'format code',
      [IntentType.COMPARE_FILES]: 'compare files',
      [IntentType.SAVE_FILE]: 'save file',
      [IntentType.OPEN_FILE]: `open file ${input.includes('file') ? '' : 'example.js'}`,
      [IntentType.GOTO_LINE]: 'go to line 10',
      [IntentType.FIND_FUNCTION]: 'find function main',
      [IntentType.SYNC_EDITORS]: 'sync editors',
      [IntentType.SUGGEST_IMPROVEMENTS]: 'suggest improvements',
      [IntentType.FIND_BUGS]: 'find bugs',
      [IntentType.REFACTOR_CODE]: 'refactor code',
      [IntentType.CHANGE_LAYOUT]: 'change layout',
      [IntentType.CREATE_FILE]: 'create new file',
      [IntentType.CLOSE_FILE]: 'close file',
      [IntentType.MERGE_VIEW]: 'merge view',
      [IntentType.EXPLAIN_CODE]: 'explain code',
      [IntentType.SEARCH_CONTENT]: 'search content',
      [IntentType.ADD_COMMENTS]: 'add comments',
      [IntentType.TOGGLE_PANELS]: 'toggle panels',
      [IntentType.RESIZE_EDITORS]: 'resize editors',
      [IntentType.UNKNOWN]: input
    };
    
    return templates[intentType] || input;
  };
  
  /**
   * Get default suggestions when no input
   */
  const getDefaultSuggestions = (): Suggestion[] => {
    const defaultIntents: IntentType[] = [
      IntentType.SPLIT_VIEW,
      IntentType.ANALYZE_CODE,
      IntentType.FORMAT_CODE,
      IntentType.COMPARE_FILES,
      IntentType.SAVE_FILE
    ];
    
    return defaultIntents.map(intentType => ({
      text: generateSuggestionText(intentType, ''),
      intentType,
      description: intentHandler.getIntentDescription(intentType)
    }));
  };
  
  if (!isVisible) {
    return (
      <div className="ai-intent-interface-collapsed">
        <button 
          className="ai-intent-toggle"
          onClick={onToggleVisibility}
          title="Open AI Command Interface"
        >
          <Brain size={20} />
        </button>
      </div>
    );
  }
  
  return (
    <div className="ai-intent-interface">
      <div className="ai-intent-header">
        <div className="ai-intent-title">
          <Brain size={20} />
          <span>AI Command Interface</span>
        </div>
        <button 
          className="ai-intent-minimize"
          onClick={onToggleVisibility}
          title="Minimize"
        >
          ×
        </button>
      </div>
      
      <div className="ai-intent-input-container">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Tell me what you want to do... (e.g., 'split view', 'analyze code')"
          className="ai-intent-input"
          disabled={isProcessing}
        />
        
        <div className="ai-intent-input-buttons">
          <button
            className={`ai-intent-voice-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleVoiceRecognition}
            disabled={isProcessing}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          
          <button
            className="ai-intent-send-btn"
            onClick={() => handleProcessIntent()}
            disabled={!inputText.trim() || isProcessing}
            title="Execute command"
          >
            {isProcessing ? <div className="spinner" /> : <Send size={18} />}
          </button>
        </div>
      </div>
      
      {/* Command Result */}
      {lastResult && (
        <div className={`ai-intent-result ${lastResult.success ? 'success' : 'error'}`}>
          <div className="ai-intent-result-message">
            {lastResult.success ? '✅' : '❌'} {lastResult.message}
          </div>
          {lastResult.suggestedActions && lastResult.suggestedActions.length > 0 && (
            <div className="ai-intent-suggestions-inline">
              {lastResult.suggestedActions.map((action, index) => (
                <span key={index} className="suggestion-inline">
                  {action}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="ai-intent-suggestions">
          <div className="ai-intent-suggestions-header">
            <Lightbulb size={16} />
            <span>Suggestions</span>
          </div>
          <div className="ai-intent-suggestions-list">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="ai-intent-suggestion"
                onClick={() => handleSuggestionClick(suggestion)}
                title={suggestion.description}
              >
                <Zap size={14} />
                <span>{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Recent Intents */}
      {recentIntents.length > 0 && (
        <div className="ai-intent-recent">
          <div className="ai-intent-recent-header">Recent Commands</div>
          <div className="ai-intent-recent-list">
            {recentIntents.map((intent, index) => (
              <button
                key={index}
                className="ai-intent-recent-item"
                onClick={() => handleProcessIntent(intent.context)}
                title={`Confidence: ${Math.round(intent.confidence * 100)}%`}
              >
                <span className="intent-type">{intent.type.replace('_', ' ')}</span>
                <span className="intent-context">{intent.context}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIIntentInterface;
