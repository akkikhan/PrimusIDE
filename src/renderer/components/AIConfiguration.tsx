import React, { useState, useEffect } from 'react';
import './styles/AIConfiguration.css';

interface AIConfigData {
  providers: {
    openai?: {
      apiKey: string;
      model: string;
    };
    anthropic?: {
      apiKey: string;
      model: string;
    };
  };
  defaultProvider: string;
  streaming: boolean;
}

export const AIConfiguration: React.FC<{
  isVisible: boolean;
  onClose: () => void;
}> = ({ isVisible, onClose }) => {
  const [config, setConfig] = useState<AIConfigData>({
    providers: {
      openai: { apiKey: '', model: 'gpt-4o-mini' },
      anthropic: { apiKey: '', model: 'claude-3-sonnet' }
    },
    defaultProvider: 'openai',
    streaming: true
  });
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Load config on mount
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await window.primus?.ai?.getConfig();
      if (savedConfig) {
        setConfig(savedConfig);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  };

  const saveConfig = async () => {
    try {
      await window.primus?.ai?.saveConfig(config);
      setTestResult('✅ Configuration saved successfully!');
      
      // Reload providers
      await window.primus?.ai?.reloadProviders();
    } catch (error) {
      setTestResult('❌ Failed to save configuration');
      console.error('Save config error:', error);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult('Testing connection...');
    
    try {
      const response = await window.primus?.ai?.request({
        id: `test_${Date.now()}`,
        operation: 'chat',
        prompt: 'Hello! Please respond with "Connection successful!"',
        includeContext: false
      });
      
      if (response?.content) {
        setTestResult(`✅ Connection successful! Provider: ${response.meta?.provider || 'unknown'}`);
      } else {
        setTestResult('❌ No response from AI provider');
      }
    } catch (error) {
      setTestResult(`❌ Connection failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="ai-config-modal">
      <div className="ai-config-container">
        <div className="ai-config-header">
          <h2>🤖 AI Configuration</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="ai-config-content">
          {/* OpenAI Configuration */}
          <div className="provider-section">
            <h3>OpenAI Configuration</h3>
            <div className="form-group">
              <label>API Key:</label>
              <input
                type="password"
                value={config.providers.openai?.apiKey || ''}
                onChange={(e) => setConfig({
                  ...config,
                  providers: {
                    ...config.providers,
                    openai: {
                      ...config.providers.openai!,
                      apiKey: e.target.value
                    }
                  }
                })}
                placeholder="sk-..."
              />
            </div>
            <div className="form-group">
              <label>Model:</label>
              <select
                value={config.providers.openai?.model || 'gpt-4o-mini'}
                onChange={(e) => setConfig({
                  ...config,
                  providers: {
                    ...config.providers,
                    openai: {
                      ...config.providers.openai!,
                      model: e.target.value
                    }
                  }
                })}
              >
                <option value="gpt-4o-mini">GPT-4 Mini</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
          </div>

          {/* Default Provider */}
          <div className="form-group">
            <label>Default Provider:</label>
            <select
              value={config.defaultProvider}
              onChange={(e) => setConfig({ ...config, defaultProvider: e.target.value })}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="mock-local">Mock (Testing)</option>
            </select>
          </div>

          {/* Streaming */}
          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={config.streaming}
                onChange={(e) => setConfig({ ...config, streaming: e.target.checked })}
              />
              Enable streaming responses
            </label>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`test-result ${testResult.includes('✅') ? 'success' : 'error'}`}>
              {testResult}
            </div>
          )}

          {/* Actions */}
          <div className="ai-config-actions">
            <button 
              className="btn-primary" 
              onClick={saveConfig}
            >
              💾 Save Configuration
            </button>
            <button 
              className="btn-secondary" 
              onClick={testConnection}
              disabled={isTesting}
            >
              🧪 Test Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfiguration;
