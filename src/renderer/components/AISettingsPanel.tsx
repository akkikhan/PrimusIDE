import React, { useState, useEffect } from 'react';
import { AIConfigManager, AIProviderSettings } from '../ai/AIConfigManager';

interface AISettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettingsPanel: React.FC<AISettingsPanelProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AIProviderSettings>(AIConfigManager.getDefaultConfig());
  const [activeTab, setActiveTab] = useState<keyof AIProviderSettings>('claude');
  const [testResults, setTestResults] = useState<{ [key: string]: boolean | null }>({});

  useEffect(() => {
    if (isOpen) {
      setConfig(AIConfigManager.loadConfig());
    }
  }, [isOpen]);

  const handleSave = () => {
    AIConfigManager.saveConfig(config);
    onClose();
  };

  const handleProviderUpdate = (
    provider: keyof AIProviderSettings,
    field: string,
    value: any
  ) => {
    setConfig(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value
      }
    }));
  };

  const handleTestConnection = async (provider: keyof AIProviderSettings) => {
    setTestResults(prev => ({ ...prev, [provider]: null }));
    
    try {
      // Temporarily save config and test
      const tempConfig = { ...config };
      AIConfigManager.saveConfig(tempConfig);
      
      const serviceConfig = AIConfigManager.getServiceConfig();
      const { getAIService } = await import('../ai/AIServiceManager');
      
      if (serviceConfig[provider as 'claude' | 'openai' | 'gemini' | 'azure']) {
        const aiService = getAIService(serviceConfig);
        const results = await aiService.testConnections();
        setTestResults(prev => ({ ...prev, [provider]: results[provider] || false }));
      } else {
        setTestResults(prev => ({ ...prev, [provider]: false }));
      }
    } catch (error) {
      console.error(`Failed to test ${provider}:`, error);
      setTestResults(prev => ({ ...prev, [provider]: false }));
    }
  };

  const renderProviderSettings = (provider: keyof AIProviderSettings) => {
    const providerConfig = config[provider];
    const providerInfo = AIConfigManager.getProviderInfo(provider);

    return (
      <div key={provider} className="provider-settings">
        <div className="provider-header">
          <div className="provider-info">
            <span className="provider-icon">{providerInfo.icon}</span>
            <div>
              <h3>{providerInfo.name}</h3>
              <p>{providerInfo.description}</p>
            </div>
          </div>
          <label className="provider-toggle">
            <input
              type="checkbox"
              checked={providerConfig.enabled}
              onChange={(e) => handleProviderUpdate(provider, 'enabled', e.target.checked)}
            />
            <span>Enabled</span>
          </label>
        </div>

        <div className="settings-grid">
          <div className="setting-group">
            <label>API Key</label>
            <div className="input-with-test">
              <input
                type="password"
                value={(providerConfig as any).apiKey}
                onChange={(e) => handleProviderUpdate(provider, 'apiKey', e.target.value)}
                placeholder={`Enter ${providerInfo.name} API key`}
                className={testResults[provider] === false ? 'error' : ''}
              />
              <button
                onClick={() => handleTestConnection(provider)}
                disabled={!(providerConfig as any).apiKey || testResults[provider] === null}
                className="test-button"
              >
                {testResults[provider] === null ? '⏳' : testResults[provider] ? '✅' : '❌'}
                Test
              </button>
            </div>
            {testResults[provider] === false && (
              <span className="error-message">Connection failed. Check your API key.</span>
            )}
          </div>

          {provider === 'azure' && (
            <div className="setting-group">
              <label>Endpoint</label>
              <input
                type="url"
                value={(config.azure as any).endpoint}
                onChange={(e) => handleProviderUpdate(provider, 'endpoint', e.target.value)}
                placeholder="https://your-resource.openai.azure.com"
              />
            </div>
          )}

          <div className="setting-group">
            <label>Model</label>
            <select
              value={(providerConfig as any).model}
              onChange={(e) => handleProviderUpdate(provider, 'model', e.target.value)}
              title={`Select ${providerInfo.name} model`}
            >
              {provider === 'claude' && (
                <>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                </>
              )}
              {provider === 'openai' && (
                <>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </>
              )}
              {provider === 'gemini' && (
                <>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-pro">Gemini Pro</option>
                </>
              )}
              {provider === 'azure' && (
                <input
                  type="text"
                  value={(config.azure as any).model}
                  onChange={(e) => handleProviderUpdate(provider, 'model', e.target.value)}
                  placeholder="Deployment name (e.g., gpt-4o)"
                  title="Azure OpenAI deployment name"
                />
              )}
            </select>
          </div>

          <div className="setting-group">
            <label>Max Tokens</label>
            <input
              type="number"
              min="100"
              max="8000"
              value={providerConfig.maxTokens}
              onChange={(e) => handleProviderUpdate(provider, 'maxTokens', parseInt(e.target.value))}
              title="Maximum tokens for AI response"
              placeholder="4000"
            />
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="ai-settings-overlay">
      <div className="ai-settings-panel">
        <div className="settings-header">
          <h2>🤖 AI Provider Settings</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="settings-tabs">
          {(Object.keys(config) as Array<keyof AIProviderSettings>).map(provider => {
            const info = AIConfigManager.getProviderInfo(provider);
            return (
              <button
                key={provider}
                className={`tab ${activeTab === provider ? 'active' : ''}`}
                onClick={() => setActiveTab(provider)}
              >
                <span className="tab-icon">{info.icon}</span>
                <span className="tab-name">{info.name}</span>
                {config[provider].enabled && (
                  <span className="enabled-indicator">●</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="settings-content">
          {renderProviderSettings(activeTab)}
        </div>

        <div className="settings-footer">
          <div className="footer-info">
            <p>🔒 API keys are stored locally and never shared</p>
            <p>💡 Enable multiple providers to switch between them in chat</p>
          </div>
          <div className="footer-actions">
            <button onClick={() => setConfig(AIConfigManager.getDefaultConfig())}>
              Reset to Defaults
            </button>
            <button onClick={handleSave} className="primary">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
