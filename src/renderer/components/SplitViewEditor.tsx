import React, { useState, useEffect, useRef } from 'react';
import './SplitViewEditor.css';

// Define the Tab interface to match App.tsx
interface Tab {
  id: string;
  name: string;
  content: string;
  language: string;
  filePath?: string;
  isModified?: boolean;
}

// Update props interface to match how it's used in App.tsx
interface SplitViewEditorProps {
  isVisible: boolean;
  onToggle: () => void;
  primaryTab: Tab | null;
  secondaryTab: Tab | null;
  onTabChange: (side: 'primary' | 'secondary', content: string) => void;
  onTabSwap: () => void;
  onSyncScroll: (enabled: boolean) => void;
  onLayoutChange: (layout: 'horizontal' | 'vertical') => void;
}

interface AIPaneAnalysis {
  suggestions: Array<{
    type: 'optimization' | 'bug-fix' | 'improvement' | 'security';
    description: string;
    line: string;
    confidence: number;
  }>;
}

const SplitViewEditor: React.FC<SplitViewEditorProps> = ({
  isVisible,
  onToggle,
  primaryTab,
  secondaryTab,
  onTabChange,
  onTabSwap,
  onSyncScroll,
  onLayoutChange
}) => {
  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // State for UI controls
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [diffMode, setDiffMode] = useState(false);
  const [smartSync, setSmartSync] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{ primary?: AIPaneAnalysis; secondary?: AIPaneAnalysis }>({});
  const [showAiSuggestions, setShowAiSuggestions] = useState<{ primary: boolean; secondary: boolean }>({ primary: false, secondary: false });
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const primaryEditorRef = useRef<HTMLTextAreaElement>(null);
  const secondaryEditorRef = useRef<HTMLTextAreaElement>(null);

  // Handle mouse down on divider for resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    const divider = dividerRef.current;
    
    if (!container || !divider) return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidthPrimary = primaryEditorRef.current?.parentElement?.offsetWidth || 0;
    const startHeightPrimary = primaryEditorRef.current?.parentElement?.offsetHeight || 0;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    const doDrag = (moveEvent: MouseEvent) => {
      if (layout === 'horizontal') {
        const newWidth = startWidthPrimary + moveEvent.clientX - startX;
        const percentage = (newWidth / containerWidth) * 100;
        if (primaryEditorRef.current?.parentElement) {
          primaryEditorRef.current.parentElement.style.width = `${Math.min(Math.max(percentage, 20), 80)}%`;
        }
      } else {
        const newHeight = startHeightPrimary + moveEvent.clientY - startY;
        const percentage = (newHeight / containerHeight) * 100;
        if (primaryEditorRef.current?.parentElement) {
          primaryEditorRef.current.parentElement.style.height = `${Math.min(Math.max(percentage, 20), 80)}%`;
        }
      }
    };
    
    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  // Handle content change in editor
  const handleContentChange = (side: 'primary' | 'secondary', content: string) => {
    onTabChange(side, content);
  };

  // Swap panes
  const swapPanes = () => {
    onTabSwap();
  };

  // Toggle diff mode
  const toggleDiffMode = () => {
    setDiffMode(prev => !prev);
  };

  // Toggle AI analysis
  const toggleAiAnalysis = () => {
    setAiAnalysis(prev => {
      // In a real implementation, this would call the AI service
      // For now, we'll just simulate some suggestions
      const newPrimary: AIPaneAnalysis | undefined = prev.primary ? undefined : {
        suggestions: [
          {
            type: 'optimization',
            description: 'Consider using array.map instead of a for loop for better readability',
            line: 'for (let i = 0; i < items.length; i++) {',
            confidence: 0.85
          },
          {
            type: 'improvement',
            description: 'Add error handling for the fetch request',
            line: 'const response = await fetch(url);',
            confidence: 0.92
          }
        ]
      };
      
      const newSecondary: AIPaneAnalysis | undefined = prev.secondary ? undefined : {
        suggestions: [
          {
            type: 'bug-fix',
            description: 'Potential null reference exception',
            line: 'const value = obj.property;',
            confidence: 0.78
          }
        ]
      };
      
      return {
        primary: newPrimary,
        secondary: newSecondary
      };
    });
  };

  // Toggle smart sync
  const toggleSmartSync = () => {
    const newValue = !smartSync;
    setSmartSync(newValue);
    onSyncScroll(newValue);
  };

  // Handle layout change
  const handleLayoutChange = (newLayout: 'horizontal' | 'vertical') => {
    setLayout(newLayout);
    onLayoutChange(newLayout);
  };

  // Sync content between panes when smart sync is enabled
  useEffect(() => {
    if (smartSync && primaryTab && secondaryTab) {
      // In a real implementation, this would sync the content intelligently
      // For now, we'll just log that smart sync is active
      console.log('Smart sync active between panes');
    }
  }, [smartSync, primaryTab, secondaryTab]);

  // Handle AI suggestion apply
  const handleApplySuggestion = (paneId: string, suggestionIndex: number) => {
    // In a real implementation, this would apply the AI suggestion to the code
    console.log(`Applying suggestion ${suggestionIndex} to pane ${paneId}`);
  };

  return (
    <div className="split-view-overlay">
      <div className={`split-view-container ${layout}`}>
        {/* Header */}
        <div className="split-view-header">
          <div className="split-view-tabs">
            <div className="split-view-tab primary">
              <span className="tab-name">{primaryTab?.name || 'Untitled'}</span>
              {primaryTab?.isModified && <span className="modified-indicator">●</span>}
              {aiAnalysis.primary && <span className="ai-badge">AI</span>}
            </div>
            <div className="center-controls">
              <button className="swap-button" onClick={swapPanes} title="Swap panes">
                ⇄
              </button>
              <button 
                className={`ai-diff-button ${diffMode ? 'active' : ''}`} 
                onClick={toggleDiffMode}
                title="Toggle diff mode"
              >
                Δ
              </button>
            </div>
            <div className="split-view-tab secondary">
              <span className="tab-name">{secondaryTab?.name || 'Untitled'}</span>
              {secondaryTab?.isModified && <span className="modified-indicator">●</span>}
              {aiAnalysis.secondary && <span className="ai-badge">AI</span>}
            </div>
          </div>
          
          <div className="split-view-controls">
            <button 
              className={`control-button ${diffMode ? 'active' : ''}`} 
              onClick={toggleDiffMode}
              title="Diff mode"
            >
              Δ
            </button>
            <button 
              className={`control-button ai-analysis ${aiAnalysis.primary || aiAnalysis.secondary ? 'active' : ''}`} 
              onClick={toggleAiAnalysis}
              title="AI analysis"
            >
              ⚡
            </button>
            <button 
              className={`control-button smart-sync ${smartSync ? 'active' : ''}`} 
              onClick={toggleSmartSync}
              title="Smart sync"
            >
              ⟳
            </button>
            <button 
              className={`control-button ${layout === 'horizontal' ? 'active' : ''}`} 
              onClick={() => handleLayoutChange('horizontal')}
              title="Horizontal layout"
            >
              ⇆
            </button>
            <button 
              className={`control-button ${layout === 'vertical' ? 'active' : ''}`} 
              onClick={() => handleLayoutChange('vertical')}
              title="Vertical layout"
            >
              ⇈
            </button>
            <button 
              className="control-button close-button" 
              onClick={onToggle}
              title="Close split view"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Editors */}
        <div className="split-view-editors" ref={containerRef}>
          <div className="editor-pane">
            <div className="editor-container">
              {showAiSuggestions.primary && aiAnalysis.primary && (
                <div className="ai-suggestions-overlay">
                  <div className="ai-suggestions-header">
                    <span>AI Suggestions</span>
                    <button 
                      className="ai-action-button" 
                      onClick={() => setShowAiSuggestions(prev => ({ ...prev, primary: false }))}
                    >
                      ×
                    </button>
                  </div>
                  <div className="ai-suggestions-list">
                    {aiAnalysis.primary.suggestions.map((suggestion, index) => (
                      <div 
                        key={index} 
                        className={`ai-suggestion ${suggestion.type}`}
                      >
                        <div className="suggestion-header">
                          <span className="suggestion-type">{suggestion.type.replace('-', ' ')}</span>
                          <span className="suggestion-confidence">{Math.round(suggestion.confidence * 100)}%</span>
                        </div>
                        <div className="suggestion-description">{suggestion.description}</div>
                        <div className="suggestion-line">{suggestion.line}</div>
                        <button 
                          className="ai-suggestion-button"
                          onClick={() => handleApplySuggestion('primary', index)}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <textarea
                ref={primaryEditorRef}
                className={`editor-textarea ${diffMode ? 'diff-mode' : ''}`}
                value={primaryTab?.content || ''}
                onChange={(e) => handleContentChange('primary', e.target.value)}
                placeholder={primaryTab ? `Editing ${primaryTab.name}...` : 'Select a file to edit...'}
              />
            </div>
          </div>
          
          <div 
            className="split-view-divider" 
            ref={dividerRef}
            onMouseDown={handleMouseDown}
          >
            <div className="divider-handle">
              <div className="divider-icon">⋮</div>
            </div>
          </div>
          
          <div className="editor-pane">
            <div className="editor-container">
              {showAiSuggestions.secondary && aiAnalysis.secondary && (
                <div className="ai-suggestions-overlay secondary">
                  <div className="ai-suggestions-header">
                    <span>AI Suggestions</span>
                    <button 
                      className="ai-action-button" 
                      onClick={() => setShowAiSuggestions(prev => ({ ...prev, secondary: false }))}
                    >
                      ×
                    </button>
                  </div>
                  <div className="ai-suggestions-list">
                    {aiAnalysis.secondary.suggestions.map((suggestion, index) => (
                      <div 
                        key={index} 
                        className={`ai-suggestion ${suggestion.type}`}
                      >
                        <div className="suggestion-header">
                          <span className="suggestion-type">{suggestion.type.replace('-', ' ')}</span>
                          <span className="suggestion-confidence">{Math.round(suggestion.confidence * 100)}%</span>
                        </div>
                        <div className="suggestion-description">{suggestion.description}</div>
                        <div className="suggestion-line">{suggestion.line}</div>
                        <button 
                          className="ai-suggestion-button"
                          onClick={() => handleApplySuggestion('secondary', index)}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <textarea
                ref={secondaryEditorRef}
                className={`editor-textarea ${diffMode ? 'diff-mode' : ''}`}
                value={secondaryTab?.content || ''}
                onChange={(e) => handleContentChange('secondary', e.target.value)}
                placeholder={secondaryTab ? `Editing ${secondaryTab.name}...` : 'Select a file to edit...'}
              />
            </div>
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="split-view-status">
          <div className="status-section">
            <div className="status-item">
              <span>Layout:</span>
              <span>{layout === 'horizontal' ? 'Horizontal' : 'Vertical'}</span>
            </div>
            {diffMode && (
              <div className="status-item diff-active">
                <span>Diff Mode</span>
              </div>
            )}
            {(aiAnalysis.primary || aiAnalysis.secondary) && (
              <div className="status-item ai-active">
                <span>AI Analysis Active</span>
              </div>
            )}
            {smartSync && (
              <div className="status-item smart-sync-active">
                <span>Smart Sync</span>
              </div>
            )}
          </div>
          <div className="status-section">
            <div className="status-item">
              <span>Lines: {primaryTab?.content.split('\n').length || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitViewEditor;