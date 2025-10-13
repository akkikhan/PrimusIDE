import React, { useState } from 'react';
import { AIChatPanel } from './AIChatPanel';
import { AISettingsPanel } from './AISettingsPanel';

interface AIChatPanelWrapperProps {
  isVisible: boolean;
  onToggle: () => void;
  currentContext?: {
    filePath: string;
    content: string;
    language: string;
    cursorPosition: { line: number; column: number };
    selection?: any;
  };
}

export const AIChatPanelWrapper: React.FC<AIChatPanelWrapperProps> = ({ 
  isVisible, 
  onToggle, 
  currentContext 
}) => {
  const [showSettings, setShowSettings] = useState(false);

  if (!isVisible) return null;

  return (
    <>
      <div className="ai-chat-overlay">
        <div className="ai-chat-header">
          <h3>🤖 AI Super Engineer</h3>
          <div className="header-actions">
            <button 
              onClick={() => setShowSettings(true)} 
              className="settings-button"
              title="AI Settings"
            >
              ⚙️
            </button>
            <button onClick={onToggle} className="close-button">×</button>
          </div>
        </div>
        <AIChatPanel />
      </div>
      
      <AISettingsPanel 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
};
