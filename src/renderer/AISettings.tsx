import React, { useState, useEffect } from 'react';
import { AIConfigManager, AIProviderConfig, AIConfig } from './config/aiConfig';
import './styles/AISettings.css';

interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate?: (config: AIConfig) => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose, onConfigUpdate }) => {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [activeTab, setActiveTab] = useState<string>('providers');
  const [configManager] = useState(() => AIConfigManager.getInstance());

  useEffect(() => {
    if (isOpen) {
      setConfig(configManager.getConfig());
    }
  }, [isOpen, configManager]);

  const handleProviderUpdate = (providerId: string, updates: Partial<AIProviderConfig>) => {
    if (!config) return;
    
    configManager.updateProvider(providerId, updates);
    const updatedConfig = configManager.getConfig();
    setConfig(updatedConfig);
    onConfigUpdate?.(updatedConfig);
  };

  const handleFeatureUpdate = (features: Partial<AIConfig['features']>) => {
    if (!config) return;
    
    configManager.updateFeatures(features);
    const updatedConfig = configManager.getConfig();
    setConfig(updatedConfig);
    onConfigUpdate?.(updatedConfig);
  };

  const handleDefaultProviderChange = (providerId: string) => {
    if (!config) return;
    
    configManager.setDefaultProvider(providerId);
    const updatedConfig = configManager.getConfig();
    setConfig(updatedConfig);
    onConfigUpdate?.(updatedConfig);
  };

  const testProvider = async (providerId: string) => {
    // Simple provider test (could be enhanced to actually test API)
    const provider = config?.providers[providerId as keyof typeof config.providers];
    if (provider && provider.enabled) {
      alert(`Testing ${provider.name}... (This would test the actual API connection)`);
    } else {
      alert('Provider not configured or disabled');
    }
  };

  if (!isOpen || !config) {
    return null;
  }

  return (
    <div className="ai-settings-overlay">
      <div className="ai-settings-panel">
        <div className="ai-settings-header">
          <h2>AI Assistant Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="ai-settings-tabs">
          <button 
            className={`tab-button ${activeTab === 'providers' ? 'active' : ''}`}
            onClick={() => setActiveTab('providers')}
          >
            Providers
          </button>
          <button 
            className={`tab-button ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            Features
          </button>
          <button 
            className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced
          </button>
        </div>

        <div className="ai-settings-content">
          {activeTab === 'providers' && (
            <div className="providers-tab">
              <h3>AI Providers</h3>
              <p>Configure your AI service providers. At least one provider must be enabled.</p>
              
              <div className="default-provider-section">
                <label htmlFor="default-provider">Default Provider:</label>
                <select 
                  id="default-provider"
                  value={config.defaultProvider} 
                  onChange={(e) => handleDefaultProviderChange(e.target.value)}
                >
                  {Object.entries(config.providers).map(([id, provider]) => (
                    <option key={id} value={id} disabled={!provider.enabled}>
                      {provider.name} {!provider.enabled ? '(Disabled)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {Object.entries(config.providers).map(([providerId, provider]) => {
                const typedProvider = provider as AIProviderConfig;
                return (
                  <div key={providerId} className={`provider-config ${typedProvider.enabled ? 'enabled' : 'disabled'}`}>
                    <div className="provider-header">
                      <div className="provider-info">
                        <h4>{typedProvider.name}</h4>
                        <span className={`provider-status ${typedProvider.enabled ? 'enabled' : 'disabled'}`}>
                          {typedProvider.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="provider-actions">
                        <button
                          className="test-button"
                          onClick={() => testProvider(providerId)}
                          disabled={!typedProvider.enabled}
                        >
                          Test
                        </button>
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={typedProvider.enabled}
                            onChange={(e) => handleProviderUpdate(providerId, { enabled: e.target.checked })}
                            aria-label={`Toggle ${typedProvider.name} provider`}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    {typedProvider.enabled && (
                      <div className="provider-details">
                        {(providerId !== 'ollama') && (
                          <div className="form-group">
                            <label htmlFor={`${providerId}-api-key`}>API Key:</label>
                            <input
                              type="password"
                              id={`${providerId}-api-key`}
                              value={typedProvider.apiKey || ''}
                              placeholder="Enter your API key"
                              onChange={(e) => handleProviderUpdate(providerId, { apiKey: e.target.value })}
                            />
                          </div>
                        )}

                        <div className="form-group">
                          <label htmlFor={`${providerId}-base-url`}>Base URL:</label>
                          <input
                            type="url"
                            id={`${providerId}-base-url`}
                            value={typedProvider.baseUrl || ''}
                            placeholder="API base URL"
                            onChange={(e) => handleProviderUpdate(providerId, { baseUrl: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor={`${providerId}-model`}>Model:</label>
                          <input
                            type="text"
                            id={`${providerId}-model`}
                            value={typedProvider.model || ''}
                            placeholder="Model name"
                            onChange={(e) => handleProviderUpdate(providerId, { model: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'features' && (
            <div className="features-tab">
              <h3>AI Features</h3>
              <p>Enable or disable specific AI-powered features in the editor.</p>

              <div className="feature-list">
                <div className="feature-item">
                  <div className="feature-info">
                    <h4>Auto Completion</h4>
                    <p>AI-powered code completion as you type</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={config.features.autoComplete}
                      onChange={(e) => handleFeatureUpdate({ autoComplete: e.target.checked })}
                      aria-label="Toggle Auto Completion feature"
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="feature-item">
                  <div className="feature-info">
                    <h4>Inline Editing</h4>
                    <p>AI-powered inline code editing and suggestions</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={config.features.inlineEditing}
                      onChange={(e) => handleFeatureUpdate({ inlineEditing: e.target.checked })}
                      aria-label="Toggle Inline Editing feature"
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="feature-item">
                  <div className="feature-info">
                    <h4>Code Generation</h4>
                    <p>Generate code snippets and functions with AI</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={config.features.codeGeneration}
                      onChange={(e) => handleFeatureUpdate({ codeGeneration: e.target.checked })}
                      aria-label="Toggle Code Generation feature"
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="feature-item">
                  <div className="feature-info">
                    <h4>Chat Assistant</h4>
                    <p>Interactive AI chat for coding questions and help</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={config.features.chatAssistant}
                      onChange={(e) => handleFeatureUpdate({ chatAssistant: e.target.checked })}
                      aria-label="Toggle Chat Assistant feature"
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="advanced-tab">
              <h3>Advanced Settings</h3>
              <p>Advanced configuration options for AI behavior.</p>

              <div className="advanced-section">
                <h4>Performance</h4>
                <div className="form-group">
                  <label htmlFor="completion-delay">Completion Delay (ms):</label>
                  <input
                    type="number"
                    id="completion-delay"
                    min="100"
                    max="2000"
                    defaultValue="300"
                    placeholder="300"
                  />
                  <small>Delay before triggering AI completion to reduce API calls</small>
                </div>

                <div className="form-group">
                  <label htmlFor="max-suggestions">Max Suggestions:</label>
                  <input
                    type="number"
                    id="max-suggestions"
                    min="1"
                    max="10"
                    defaultValue="3"
                    placeholder="3"
                  />
                  <small>Maximum number of AI suggestions to show</small>
                </div>
              </div>

              <div className="advanced-section">
                <h4>Privacy</h4>
                <div className="checkbox-group">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Cache completions locally
                  </label>
                  <label>
                    <input type="checkbox" defaultChecked />
                    Enable telemetry for improving suggestions
                  </label>
                  <label>
                    <input type="checkbox" />
                    Send anonymous usage statistics
                  </label>
                </div>
              </div>

              <div className="advanced-section">
                <h4>Debug</h4>
                <div className="checkbox-group">
                  <label>
                    <input type="checkbox" />
                    Enable AI debug logging
                  </label>
                  <label>
                    <input type="checkbox" />
                    Show AI response times
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ai-settings-footer">
          <button className="save-button" onClick={onClose}>
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
