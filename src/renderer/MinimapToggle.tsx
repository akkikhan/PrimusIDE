import React from 'react';
import { useTheme } from './ThemeContext';

interface MinimapProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const MinimapToggle: React.FC<MinimapProps> = ({
  isVisible,
  onToggle
}) => {
  const { effectiveTheme } = useTheme();

  return (
    <div className="minimap-toggle">
      <button 
        className="minimap-button"
        onClick={onToggle}
        title={`${isVisible ? 'Hide' : 'Show'} Minimap`}
        aria-label="Toggle minimap visibility"
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M2 2h3v12H2V2zm4 0h3v12H6V2zm4 0h3v12h-3V2z" />
        </svg>
        {isVisible ? 'Hide Minimap' : 'Show Minimap'}
      </button>
    </div>
  );
};

export default MinimapToggle;
