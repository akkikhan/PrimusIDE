import React from 'react';
import { useTheme } from './ThemeContext';

interface QuickSettingsProps {
  isMinimapEnabled: boolean;
  onMinimapToggle: () => void;
  onSettingsClick: () => void;
}

export const QuickSettings: React.FC<QuickSettingsProps> = ({
  isMinimapEnabled,
  onMinimapToggle,
  onSettingsClick
}) => {
  const { theme, effectiveTheme, toggleTheme, setTheme } = useTheme();

  return (
    <div className="quick-settings">
      <div className="quick-settings-header">
        <h3>Quick Settings</h3>
        <button 
          className="settings-button"
          onClick={onSettingsClick}
          title="Open full settings"
        >
          ⚙️
        </button>
      </div>
      
      <div className="quick-settings-group">
        <label>Theme</label>
        <div className="theme-buttons">
          <button 
            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
            title="Dark theme"
          >
            🌙
          </button>
          <button 
            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
            title="Light theme"
          >
            ☀️
          </button>
          <button 
            className={`theme-btn ${theme === 'auto' ? 'active' : ''}`}
            onClick={() => setTheme('auto')}
            title="Auto theme (follows system)"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="quick-settings-group">
        <label className="toggle-label">
          <input 
            type="checkbox"
            checked={isMinimapEnabled}
            onChange={onMinimapToggle}
          />
          <span>Show Minimap</span>
        </label>
      </div>
      
      <div className="quick-settings-info">
        <small>
          Current: {effectiveTheme} theme
          {theme === 'auto' && ' (automatic)'}
        </small>
      </div>
    </div>
  );
};

export default QuickSettings;
