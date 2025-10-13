import React, { useState, useEffect } from 'react';
import { useAdvancedTheme, AdvancedTheme, ThemeColors } from '../AdvancedThemeContext';
import '../styles/ThemeCustomizer.css';

interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange, description }) => {
  return (
    <div className="color-input-group">
      <label className="color-input-label">
        <span className="color-input-text">{label}</span>
        <div className="color-input-container">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="color-input-picker"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="color-input-text-field"
            placeholder="#000000"
          />
        </div>
      </label>
      {description && <span className="color-input-description">{description}</span>}
    </div>
  );
};

interface PreviewPanelProps {
  theme: AdvancedTheme;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ theme }) => {
  // Apply theme variables to a preview-specific container
  const previewStyle = {
    '--preview-background': theme.colors.background,
    '--preview-foreground': theme.colors.foreground,
    '--preview-font-family': theme.fonts.family,
    '--preview-mono-family': theme.fonts.monoFamily,
    '--preview-activity-bg': theme.colors.activityBarBackground,
    '--preview-activity-fg': theme.colors.activityBarForeground,
    '--preview-sidebar-bg': theme.colors.sidebarBackground,
    '--preview-editor-bg': theme.colors.editorBackground,
    '--preview-editor-fg': theme.colors.editorForeground,
    '--preview-tab-active': theme.colors.tabActiveBackground,
    '--preview-tab-inactive': theme.colors.tabInactiveBackground,
    '--preview-panel-bg': theme.colors.panelBackground,
    '--preview-border': theme.colors.panelBorder,
    '--preview-border-width': theme.spacing.borderWidth,
    '--preview-border-radius': theme.spacing.borderRadius,
    '--preview-user-msg': theme.colors.userMessageBackground,
    '--preview-assistant-msg': theme.colors.assistantMessageBackground,
    '--preview-code-block': theme.colors.codeBlockBackground,
    '--preview-status-bg': theme.colors.statusBarBackground,
    '--preview-status-fg': theme.colors.statusBarForeground,
    '--preview-line-highlight': theme.colors.editorLineHighlight,
    '--preview-accent': theme.colors.accent,
    '--preview-success': theme.colors.successColor,
    '--preview-info': theme.colors.infoColor,
    '--preview-warning': theme.colors.warningColor,
    '--preview-button-fg': theme.colors.buttonForeground
  } as React.CSSProperties;

  return (
    <div className="theme-preview" style={previewStyle}>
      <div className="preview-header">
        <span>Preview: {theme.name}</span>
      </div>
      
      <div className="preview-content">
        <div className="preview-sidebar">
          <div className="preview-file-item">📁 src</div>
          <div className="preview-file-item">📄 App.tsx</div>
          <div className="preview-file-item">📄 index.ts</div>
        </div>
        
        <div className="preview-editor">
          <div className="preview-tabs">
            <div className="preview-tab active">App.tsx</div>
            <div className="preview-tab">index.ts</div>
          </div>
          <div className="preview-code">
            <div className="preview-line">
              <span className="preview-keyword">import</span> React <span className="preview-keyword">from</span> <span className="preview-string">'react'</span>;
            </div>
            <div className="preview-line highlight">
              <span className="preview-keyword">function</span> <span className="preview-function">App</span>() &#123;
            </div>
            <div className="preview-line">
              &nbsp;&nbsp;<span className="preview-keyword">return</span> (
            </div>
            <div className="preview-line">
              &nbsp;&nbsp;&nbsp;&nbsp;&lt;<span className="preview-tag">div</span>&gt;Hello World&lt;/<span className="preview-tag">div</span>&gt;
            </div>
            <div className="preview-line">
              &nbsp;&nbsp;);
            </div>
            <div className="preview-line">&#125;</div>
          </div>
        </div>
      </div>
      
      <div className="preview-chat">
        <div className="preview-message user">
          How do I create a component?
        </div>
        <div className="preview-message assistant">
          Here's how to create a React component:
          <div className="preview-code-block">
            const MyComponent = () =&gt; &#123;<br/>
            &nbsp;&nbsp;return &lt;div&gt;Content&lt;/div&gt;;<br/>
            &#125;;
          </div>
        </div>
      </div>
      
      <div className="preview-status-bar">
        <span>Ready</span>
        <span>TypeScript</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
};

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ isOpen, onClose }) => {
  const { 
    currentTheme, 
    availableThemes,
    setTheme,
    createCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme
  } = useAdvancedTheme();

  const [editingTheme, setEditingTheme] = useState<AdvancedTheme>(currentTheme);
  const [activeTab, setActiveTab] = useState<'colors' | 'fonts' | 'spacing' | 'preview'>('colors');
  const [themeName, setThemeName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditingTheme({ ...currentTheme });
    }
  }, [isOpen, currentTheme]);

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setEditingTheme(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value
      }
    }));
  };

  const handleFontChange = (key: string, value: string) => {
    setEditingTheme(prev => ({
      ...prev,
      fonts: {
        ...prev.fonts,
        [key]: value
      }
    }));
  };

  const handleSpacingChange = (key: string, value: string) => {
    setEditingTheme(prev => ({
      ...prev,
      spacing: {
        ...prev.spacing,
        [key]: value
      }
    }));
  };

  const handleApplyTheme = () => {
    if (editingTheme.isCustom || isCreatingNew) {
      if (isCreatingNew && themeName) {
        const newTheme: AdvancedTheme = {
          ...editingTheme,
          id: `custom-${Date.now()}`,
          name: themeName,
          isCustom: true,
          version: '1.0.0',
          author: 'User'
        };
        createCustomTheme(newTheme);
        setTheme(newTheme.id);
        setIsCreatingNew(false);
        setThemeName('');
      } else if (!isCreatingNew) {
        updateCustomTheme(editingTheme.id, editingTheme);
        setTheme(editingTheme.id);
      }
    }
  };

  const handleSaveAsNew = () => {
    setIsCreatingNew(true);
    setThemeName(`${editingTheme.name} Copy`);
  };

  const handleReset = () => {
    setEditingTheme({ ...currentTheme });
    setIsCreatingNew(false);
    setThemeName('');
  };

  const handleExport = () => {
    try {
      const themeJson = exportTheme(editingTheme.id);
      const blob = new Blob([themeJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${editingTheme.name.toLowerCase().replace(/\\s+/g, '-')}-theme.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export theme:', error);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const themeJson = e.target?.result as string;
            if (importTheme(themeJson)) {
              
            } else {
              console.error('Failed to import theme');
            }
          } catch (error) {
            console.error('Failed to read theme file:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleDeleteTheme = () => {
    if (editingTheme.isCustom && window.confirm(`Are you sure you want to delete "${editingTheme.name}"?`)) {
      deleteCustomTheme(editingTheme.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="theme-customizer-overlay">
      <div className="theme-customizer">
        <div className="theme-customizer-header">
          <div className="theme-customizer-title">
            <h2>Theme Customizer</h2>
            <div className="theme-selector">
              <select 
                value={editingTheme.id} 
                onChange={(e) => {
                  const theme = availableThemes.find(t => t.id === e.target.value);
                  if (theme) {
                    setEditingTheme({ ...theme });
                    setIsCreatingNew(false);
                  }
                }}
                title="Select theme to edit"
                aria-label="Select theme to edit"
              >
                {availableThemes.map((theme: AdvancedTheme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name} {theme.isCustom ? '(Custom)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="theme-customizer-actions">
            <button onClick={handleImport} className="btn-secondary" title="Import Theme">
              📁 Import
            </button>
            <button onClick={handleExport} className="btn-secondary" title="Export Theme">
              💾 Export
            </button>
            <button onClick={onClose} className="btn-close">✕</button>
          </div>
        </div>

        <div className="theme-customizer-tabs">
          <button 
            className={`tab ${activeTab === 'colors' ? 'active' : ''}`}
            onClick={() => setActiveTab('colors')}
          >
            🎨 Colors
          </button>
          <button 
            className={`tab ${activeTab === 'fonts' ? 'active' : ''}`}
            onClick={() => setActiveTab('fonts')}
          >
            🔤 Typography
          </button>
          <button 
            className={`tab ${activeTab === 'spacing' ? 'active' : ''}`}
            onClick={() => setActiveTab('spacing')}
          >
            📐 Spacing
          </button>
          <button 
            className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            👁️ Preview
          </button>
        </div>

        <div className="theme-customizer-content">
          <div className="theme-customizer-panel">
            {activeTab === 'colors' && (
              <div className="colors-panel">
                <div className="color-section">
                  <h3>Base Colors</h3>
                  <ColorInput label="Background" value={editingTheme.colors.background} onChange={(v) => handleColorChange('background', v)} />
                  <ColorInput label="Foreground" value={editingTheme.colors.foreground} onChange={(v) => handleColorChange('foreground', v)} />
                  <ColorInput label="Muted" value={editingTheme.colors.muted} onChange={(v) => handleColorChange('muted', v)} />
                  <ColorInput label="Accent" value={editingTheme.colors.accent} onChange={(v) => handleColorChange('accent', v)} />
                </div>

                <div className="color-section">
                  <h3>Editor Colors</h3>
                  <ColorInput label="Editor Background" value={editingTheme.colors.editorBackground} onChange={(v) => handleColorChange('editorBackground', v)} />
                  <ColorInput label="Editor Foreground" value={editingTheme.colors.editorForeground} onChange={(v) => handleColorChange('editorForeground', v)} />
                  <ColorInput label="Line Highlight" value={editingTheme.colors.editorLineHighlight} onChange={(v) => handleColorChange('editorLineHighlight', v)} />
                  <ColorInput label="Selection" value={editingTheme.colors.editorSelection} onChange={(v) => handleColorChange('editorSelection', v)} />
                  <ColorInput label="Cursor" value={editingTheme.colors.editorCursor} onChange={(v) => handleColorChange('editorCursor', v)} />
                </div>

                <div className="color-section">
                  <h3>UI Colors</h3>
                  <ColorInput label="Sidebar Background" value={editingTheme.colors.sidebarBackground} onChange={(v) => handleColorChange('sidebarBackground', v)} />
                  <ColorInput label="Activity Bar Background" value={editingTheme.colors.activityBarBackground} onChange={(v) => handleColorChange('activityBarBackground', v)} />
                  <ColorInput label="Status Bar Background" value={editingTheme.colors.statusBarBackground} onChange={(v) => handleColorChange('statusBarBackground', v)} />
                  <ColorInput label="Panel Border" value={editingTheme.colors.panelBorder} onChange={(v) => handleColorChange('panelBorder', v)} />
                </div>

                <div className="color-section">
                  <h3>Interactive Colors</h3>
                  <ColorInput label="Button Background" value={editingTheme.colors.buttonBackground} onChange={(v) => handleColorChange('buttonBackground', v)} />
                  <ColorInput label="Button Hover" value={editingTheme.colors.buttonHover} onChange={(v) => handleColorChange('buttonHover', v)} />
                  <ColorInput label="Input Background" value={editingTheme.colors.inputBackground} onChange={(v) => handleColorChange('inputBackground', v)} />
                  <ColorInput label="Input Focus" value={editingTheme.colors.inputFocus} onChange={(v) => handleColorChange('inputFocus', v)} />
                </div>

                <div className="color-section">
                  <h3>Semantic Colors</h3>
                  <ColorInput label="Error" value={editingTheme.colors.errorColor} onChange={(v) => handleColorChange('errorColor', v)} />
                  <ColorInput label="Warning" value={editingTheme.colors.warningColor} onChange={(v) => handleColorChange('warningColor', v)} />
                  <ColorInput label="Info" value={editingTheme.colors.infoColor} onChange={(v) => handleColorChange('infoColor', v)} />
                  <ColorInput label="Success" value={editingTheme.colors.successColor} onChange={(v) => handleColorChange('successColor', v)} />
                </div>

                <div className="color-section">
                  <h3>Git Colors</h3>
                  <ColorInput label="Added" value={editingTheme.colors.gitAdded} onChange={(v) => handleColorChange('gitAdded', v)} />
                  <ColorInput label="Modified" value={editingTheme.colors.gitModified} onChange={(v) => handleColorChange('gitModified', v)} />
                  <ColorInput label="Deleted" value={editingTheme.colors.gitDeleted} onChange={(v) => handleColorChange('gitDeleted', v)} />
                  <ColorInput label="Conflict" value={editingTheme.colors.gitConflict} onChange={(v) => handleColorChange('gitConflict', v)} />
                </div>
              </div>
            )}

            {activeTab === 'fonts' && (
              <div className="fonts-panel">
                <h3>Typography Settings</h3>
                <div className="font-input-group">
                  <label>Font Family</label>
                  <input 
                    type="text" 
                    value={editingTheme.fonts.family} 
                    onChange={(e) => handleFontChange('family', e.target.value)}
                    placeholder="Font family"
                  />
                </div>
                <div className="font-input-group">
                  <label>Monospace Font</label>
                  <input 
                    type="text" 
                    value={editingTheme.fonts.monoFamily} 
                    onChange={(e) => handleFontChange('monoFamily', e.target.value)}
                    placeholder="Monospace font family"
                  />
                </div>
                <div className="font-input-group">
                  <label>Font Size</label>
                  <input 
                    type="text" 
                    value={editingTheme.fonts.size} 
                    onChange={(e) => handleFontChange('size', e.target.value)}
                    placeholder="Font size (e.g., 14px)"
                  />
                </div>
                <div className="font-input-group">
                  <label>Line Height</label>
                  <input 
                    type="text" 
                    value={editingTheme.fonts.lineHeight} 
                    onChange={(e) => handleFontChange('lineHeight', e.target.value)}
                    placeholder="Line height (e.g., 1.5)"
                  />
                </div>
                <div className="font-input-group">
                  <label>Font Weight</label>
                  <select 
                    value={editingTheme.fonts.weight} 
                    onChange={(e) => handleFontChange('weight', e.target.value)}
                    title="Select font weight"
                    aria-label="Font weight"
                  >
                    <option value="300">Light (300)</option>
                    <option value="400">Normal (400)</option>
                    <option value="500">Medium (500)</option>
                    <option value="600">Semi Bold (600)</option>
                    <option value="700">Bold (700)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'spacing' && (
              <div className="spacing-panel">
                <h3>Spacing & Layout</h3>
                <div className="spacing-input-group">
                  <label>Extra Small (xs)</label>
                  <input 
                    type="text" 
                    value={editingTheme.spacing.xs} 
                    onChange={(e) => handleSpacingChange('xs', e.target.value)}
                    placeholder="4px"
                  />
                </div>
                <div className="spacing-input-group">
                  <label>Small (sm)</label>
                  <input 
                    type="text" 
                    value={editingTheme.spacing.sm} 
                    onChange={(e) => handleSpacingChange('sm', e.target.value)}
                    placeholder="8px"
                  />
                </div>
                <div className="spacing-input-group">
                  <label>Medium (md)</label>
                  <input 
                    type="text" 
                    value={editingTheme.spacing.md} 
                    onChange={(e) => handleSpacingChange('md', e.target.value)}
                    placeholder="16px"
                  />
                </div>
                <div className="spacing-input-group">
                  <label>Large (lg)</label>
                  <input 
                    type="text" 
                    value={editingTheme.spacing.lg} 
                    onChange={(e) => handleSpacingChange('lg', e.target.value)}
                    placeholder="24px"
                  />
                </div>
                <div className="spacing-input-group">
                  <label>Extra Large (xl)</label>
                  <input 
                    type="text" 
                    value={editingTheme.spacing.xl} 
                    onChange={(e) => handleSpacingChange('xl', e.target.value)}
                    placeholder="32px"
                  />
                </div>
                <div className="spacing-input-group">
                  <label>Border Radius</label>
                  <input 
                    type="text" 
                    value={editingTheme.spacing.borderRadius} 
                    onChange={(e) => handleSpacingChange('borderRadius', e.target.value)}
                    placeholder="4px"
                  />
                </div>
                <div className="spacing-input-group">
                  <label>Border Width</label>
                  <input 
                    type="text" 
                    value={editingTheme.spacing.borderWidth} 
                    onChange={(e) => handleSpacingChange('borderWidth', e.target.value)}
                    placeholder="1px"
                  />
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <PreviewPanel theme={editingTheme} />
            )}
          </div>
        </div>

        <div className="theme-customizer-footer">
          {isCreatingNew && (
            <div className="new-theme-input">
              <input
                type="text"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="Enter theme name"
                className="theme-name-input"
              />
            </div>
          )}
          <div className="theme-actions">
            <button onClick={handleReset} className="btn-secondary">
              🔄 Reset
            </button>
            <button onClick={handleSaveAsNew} className="btn-secondary">
              📄 Save as New
            </button>
            {editingTheme.isCustom && !isCreatingNew && (
              <button onClick={handleDeleteTheme} className="btn-danger">
                🗑️ Delete
              </button>
            )}
            <button 
              onClick={handleApplyTheme} 
              className="btn-primary"
              disabled={isCreatingNew && !themeName.trim()}
            >
              ✨ {isCreatingNew ? 'Create & Apply' : 'Apply Theme'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
