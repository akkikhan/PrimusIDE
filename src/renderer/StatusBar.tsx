import React from 'react';
import { useTheme } from './ThemeContext';

interface StatusBarProps {
  activeFile?: string;
  language?: string;
  lineCount?: number;
  cursorPosition?: { line: number; column: number };
  onOpenThemeCustomizer?: () => void;
  problemsErrorCount?: number; // total errors
  problemsWarningCount?: number; // total warnings
  onProblemsClick?: () => void; // open problems panel
  problemsEnabled?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  activeFile, 
  language = 'plaintext', 
  lineCount = 0,
  cursorPosition = { line: 1, column: 1 },
  onOpenThemeCustomizer,
  problemsErrorCount = 0,
  problemsWarningCount = 0,
  onProblemsClick,
  problemsEnabled = true
}) => {
  const { theme, effectiveTheme, toggleTheme } = useTheme();
  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item">
          {activeFile ? `${activeFile}` : 'No file'}
        </span>
        {(problemsErrorCount > 0 || problemsWarningCount > 0 || !problemsEnabled) && (
          <span
            className={`status-item status-problems ${!problemsEnabled ? 'disabled' : ''}`}
            onClick={() => problemsEnabled && onProblemsClick?.()}
            title={problemsEnabled ? 'Show Problems (Ctrl+Shift+M)' : 'Problems disabled'}
            role="button"
            aria-label="Problems summary"
          >
            {!problemsEnabled ? 'Problems: Off' : (
              <>
                {problemsErrorCount > 0 && <span className="problems-count errors" aria-label={`${problemsErrorCount} errors`}>⛔ {problemsErrorCount}</span>}
                {problemsWarningCount > 0 && <span className="problems-count warnings" aria-label={`${problemsWarningCount} warnings`}>⚠️ {problemsWarningCount}</span>}
                {(problemsErrorCount === 0 && problemsWarningCount === 0) && <span className="problems-count none" aria-label="No problems">✅</span>}
              </>
            )}
          </span>
        )}
        {activeFile && (
          <span className="status-item">
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
        )}
      </div>
      <div className="status-right">
        <span className="status-item">
          {language.toUpperCase()}
        </span>
        <span className="status-item">
          {lineCount} lines
        </span>
        <span className="status-item">
          UTF-8
        </span>
        <span 
          className="status-item status-theme" 
          onClick={toggleTheme}
          title={`Theme: ${theme} (Currently ${effectiveTheme}) - Click to toggle or Ctrl+Shift+T for customizer`}
        >
          🌓 {theme === 'auto' ? `${effectiveTheme} (auto)` : theme}
        </span>
        {onOpenThemeCustomizer && (
          <span 
            className="status-item status-theme-customizer" 
            onClick={onOpenThemeCustomizer}
            title="Open Advanced Theme Customizer (Ctrl+Shift+T)"
          >
            🎨 Customize
          </span>
        )}
      </div>
    </div>
  );
};
