import React, { useState, useEffect } from 'react';
import { SettingsData } from './types';

interface SettingsPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  onSettingsChange: (settings: Partial<SettingsData>) => void;
}

const defaultSettings: SettingsData = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  minimap: true,
  autoSave: true,
  formatOnSave: false,
  trimTrailingWhitespace: true,
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isVisible, onToggle, onSettingsChange }) => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [activeCategory, setActiveCategory] = useState<string>('appearance');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  useEffect(() => {
    // Load settings from storage
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (window.primus && window.primus.settings) {
        const savedSettings = await window.primus.settings.getSettings();
        setSettings({ ...defaultSettings, ...savedSettings });
      }
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
    }
  };

  const saveSettings = async () => {
    try {
      if (window.primus && window.primus.settings) {
        await window.primus.settings.saveSettings(settings);
        setHasUnsavedChanges(false);
        onSettingsChange(settings);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const resetSettings = async () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings(defaultSettings);
      setHasUnsavedChanges(true);
    }
  };

  const exportSettings = async () => {
    try {
      const dataStr = JSON.stringify(settings, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'primus-ide-settings.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export settings:', error);
    }
  };

  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedSettings = JSON.parse(event.target?.result as string);
            setSettings({ ...defaultSettings, ...importedSettings });
            setHasUnsavedChanges(true);
          } catch (error) {
            alert('Invalid settings file format');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const renderSettingControl = (key: keyof SettingsData, type: 'toggle' | 'input' | 'select', options?: any[]) => {
    const value = settings[key];

    switch (type) {
      case 'toggle':
        return (
          <label className="setting-toggle">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => updateSetting(key, e.target.checked as any)}
              title={`Toggle ${key} setting`}
              aria-label={`Toggle ${key} setting`}
            />
            <span className="toggle-slider"></span>
          </label>
        );
      
      case 'input':
        return (
          <input
            type={typeof value === 'number' ? 'number' : 'text'}
            className="setting-input"
            value={value as string | number}
            onChange={(e) => updateSetting(key, (typeof value === 'number' ? Number(e.target.value) : e.target.value) as any)}
            title={`Setting for ${key}`}
            aria-label={`Setting for ${key}`}
          />
        );
      
      case 'select':
        return (
          <select
            className="setting-select"
            value={value as string}
            onChange={(e) => updateSetting(key, e.target.value as any)}
            title={`Setting for ${key}`}
            aria-label={`Setting for ${key}`}
          >
            {options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      default:
        return null;
    }
  };

  const categories = [
    { id: 'appearance', name: 'Appearance', icon: '🎨' },
    { id: 'editor', name: 'Editor', icon: '📝' },
    { id: 'files', name: 'Files', icon: '📁' },
    { id: 'updates', name: 'Updates', icon: '⬆️' },
  ];

  const renderAppearanceSettings = () => (
    <div className="settings-group">
      <h3>Appearance</h3>
      <div className="settings-list">
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Theme</h4>
            <p className="setting-description">Choose the color theme for the IDE</p>
          </div>
          <div className="setting-control">
            {renderSettingControl('theme', 'select', [
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'auto', label: 'Auto (System)' }
            ])}
          </div>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Font Size</h4>
            <p className="setting-description">Editor font size in pixels</p>
          </div>
          <div className="setting-control">
            {renderSettingControl('fontSize', 'input')}
          </div>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Font Family</h4>
            <p className="setting-description">Font family for the code editor</p>
          </div>
          <div className="setting-control">
            {renderSettingControl('fontFamily', 'input')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderEditorSettings = () => (
    <div className="settings-group">
      <h3>Editor</h3>
      <div className="settings-list">
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Tab Size</h4>
            <p className="setting-description">Number of spaces for each tab</p>
          </div>
          <div className="setting-control">
            {renderSettingControl('tabSize', 'input')}
          </div>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Word Wrap</h4>
            <p className="setting-description">Wrap long lines in the editor</p>
          </div>
          <div className="setting-control">
            {renderSettingControl('wordWrap', 'toggle')}
          </div>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Line Numbers</h4>
            <p className="setting-description">Show line numbers in the editor</p>
          </div>
          <div className="setting-control">
            {renderSettingControl('lineNumbers', 'toggle')}
          </div>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Minimap</h4>
            <p className="setting-description">Show code minimap on the right side</p>
          </div>
          <div className="setting-control">
            {renderSettingControl('minimap', 'toggle')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderFilesSettings = () => (
    <div className="settings-group">
      <h3>Files</h3>
      <div className="settings-list">
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Auto Save</h4>
            <p className="setting-description">Automatically save files after changes</p>
          </div>
          <div className="setting-control">
            {renderSettingControl('autoSave', 'toggle')}
          </div>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Format On Save</h4>
            <p className="setting-description">Format code when saving files</p>
          </div>
          <div className="setting-control">
            {renderSettingControl('formatOnSave', 'toggle')}
          </div>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Trim Trailing Whitespace</h4>
            <p className="setting-description">Remove trailing spaces when saving</p>
          </div>
          <div className="setting-control">
            {renderSettingControl('trimTrailingWhitespace', 'toggle')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUpdatesSettings = () => (
    <div className="settings-group">
      <h3>Updates</h3>
      <div className="settings-list">
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Auto Update (experimental)</h4>
            <p className="setting-description">Enable automatic update checks on startup (requires restart)</p>
          </div>
          <div className="setting-control">
            <label className="setting-toggle" title="Toggle automatic update checks" aria-label="Toggle automatic update checks">
              <input
                type="checkbox"
                checked={(settings as any).autoUpdateEnabled || false}
                onChange={(e)=>{ setSettings(prev => ({...prev, autoUpdateEnabled: e.target.checked})); setHasUnsavedChanges(true); }}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <h4 className="setting-name">Manual Check</h4>
            <p className="setting-description">Trigger a manual update check now (if enabled)</p>
          </div>
          <div className="setting-control">
            <button className="settings-save" onClick={()=>{
              try { (window as any).primus?.updates?.check?.(); } catch {/* ignore */}
            }}>Check Now</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeCategory) {
      case 'appearance':
        return renderAppearanceSettings();
      case 'editor':
        return renderEditorSettings();
      case 'files':
        return renderFilesSettings();
      case 'updates':
        return renderUpdatesSettings();
      default:
        return (
          <div className="settings-empty">
            <div className="empty-icon">⚙️</div>
            <h3>Select a category</h3>
            <p>Choose a settings category from the sidebar to configure options.</p>
          </div>
        );
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <div className="settings-actions">
          <button className="settings-reset" onClick={resetSettings} title="Reset to Defaults">
            Reset
          </button>
          <button className="settings-export" onClick={exportSettings} title="Export Settings">
            Export
          </button>
          <button className="settings-import" onClick={importSettings} title="Import Settings">
            Import
          </button>
          {hasUnsavedChanges && (
            <button className="settings-save" onClick={saveSettings} title="Save Changes">
              Save
            </button>
          )}
          <button className="settings-close" onClick={onToggle} title="Close Settings">
            ×
          </button>
        </div>
      </div>
      
      <div className="settings-content">
        <div className="settings-sidebar">
          {categories.map(category => (
            <button
              key={category.id}
              className={`settings-category ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
        
        <div className="settings-main">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
