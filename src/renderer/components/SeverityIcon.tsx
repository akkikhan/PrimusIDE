import React from 'react';
import { ProblemSeverity } from '../diagnostics/types';

export const SeverityIcon: React.FC<{ severity: ProblemSeverity; className?: string }>
 = ({ severity, className }) => {
  switch (severity) {
    case ProblemSeverity.Error: return <span className={className || 'sev-icon'} aria-label="Error">⛔</span>;
    case ProblemSeverity.Warning: return <span className={className || 'sev-icon'} aria-label="Warning">⚠️</span>;
    case ProblemSeverity.Info: return <span className={className || 'sev-icon'} aria-label="Info">ℹ️</span>;
    case ProblemSeverity.Hint: return <span className={className || 'sev-icon'} aria-label="Hint">💡</span>;
    default: return <span className={className || 'sev-icon'}>•</span>;
  }
};

export default SeverityIcon;
