import React, { useState, useEffect, useRef } from 'react';
import { advancedAIAssistant, AIAssistantCommand, AIAssistantContext } from '../services/AdvancedAIAssistant';
import './AIAssistantPanel.css';

export const AIAssistantPanel: React.FC = () => {
  const [commands, setCommands] = useState<AIAssistantCommand[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<AIAssistantCommand | null>(null);
  const [context, setContext] = useState<AIAssistantContext>({});
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load commands when component mounts
    setCommands(advancedAIAssistant.getCommands());
  }, []);

  const handleCommandSelect = (command: AIAssistantCommand) => {
    setSelectedCommand(command);
    setResponse('');
    setError(null);
  };

  const handleExecuteCommand = async () => {
    if (!selectedCommand) return;

    setLoading(true);
    setError(null);

    try {
      const result = await advancedAIAssistant.executeCommand(selectedCommand.id, context);
      setResponse(result.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleContextChange = (key: keyof AIAssistantContext, value: any) => {
    setContext(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Scroll to bottom of response when it changes
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  return (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-header">
        <h2>AI Assistant</h2>
        <div className="ai-assistant-actions">
          <button className="refresh-button" onClick={() => setCommands(advancedAIAssistant.getCommands())}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="ai-assistant-content">
        <div className="ai-assistant-sidebar">
          <h3>Commands</h3>
          <div className="command-list">
            {commands.map(command => (
              <div
                key={command.id}
                className={`command-item ${selectedCommand?.id === command.id ? 'selected' : ''}`}
                onClick={() => handleCommandSelect(command)}
              >
                <div className="command-name">{command.name}</div>
                <div className="command-description">{command.description}</div>
                <div className="command-category">{command.category}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ai-assistant-main">
          {selectedCommand ? (
            <>
              <div className="command-details">
                <h3>{selectedCommand.name}</h3>
                <p>{selectedCommand.description}</p>
              </div>

              <div className="context-editor">
                <h4>Context</h4>
                <div className="context-fields">
                  <div className="context-field">
                    <label>File Path:</label>
                    <input
                      type="text"
                      value={context.filePath || ''}
                      onChange={e => handleContextChange('filePath', e.target.value)}
                      placeholder="Enter file path"
                    />
                  </div>
                  <div className="context-field">
                    <label>Language:</label>
                    <input
                      type="text"
                      value={context.language || ''}
                      onChange={e => handleContextChange('language', e.target.value)}
                      placeholder="Enter language"
                    />
                  </div>
                  <div className="context-field">
                    <label>Selection:</label>
                    <textarea
                      value={context.selection || ''}
                      onChange={e => handleContextChange('selection', e.target.value)}
                      placeholder="Enter selected code"
                      rows={4}
                    />
                  </div>
                  <div className="context-field">
                    <label>Git Branch:</label>
                    <input
                      type="text"
                      value={context.gitBranch || ''}
                      onChange={e => handleContextChange('gitBranch', e.target.value)}
                      placeholder="Enter git branch"
                    />
                  </div>
                </div>
              </div>

              <div className="command-actions">
                <button
                  className="execute-button"
                  onClick={handleExecuteCommand}
                  disabled={loading}
                >
                  {loading ? 'Executing...' : 'Execute Command'}
                </button>
              </div>

              {error && (
                <div className="error-message">
                  <h4>Error</h4>
                  <p>{error}</p>
                </div>
              )}

              {response && (
                <div className="response-container">
                  <h4>Response</h4>
                  <div className="response-content" ref={responseRef}>
                    <pre>{response}</pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-command-selected">
              <p>Select a command from the sidebar to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPanel;