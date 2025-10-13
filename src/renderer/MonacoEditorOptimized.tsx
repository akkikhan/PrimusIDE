import React, { lazy, Suspense } from 'react';
import type { MonacoEditorProps } from './MonacoEditor';

// Lazy load the heavy Monaco Editor
const MonacoEditorLazy = lazy(() => 
  import('./MonacoEditor').then(module => ({
    default: module.MonacoEditor
  }))
);

// Loading placeholder while Monaco loads
const EditorLoadingPlaceholder: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    background: 'var(--color-bg-secondary, #1e1e1e)',
    color: 'var(--color-text-secondary, #888)',
    fontFamily: 'monospace',
    fontSize: '14px'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '10px' }}>Loading editor...</div>
      <div style={{
        width: '40px',
        height: '4px',
        background: 'var(--color-primary, #007acc)',
        borderRadius: '2px',
        animation: 'pulse 1.5s ease-in-out infinite',
        margin: '0 auto'
      }} />
    </div>
  </div>
);

// Export wrapped component
export const MonacoEditorOptimized: React.FC<MonacoEditorProps> = (props) => {
  return (
    <Suspense fallback={<EditorLoadingPlaceholder />}>
      <MonacoEditorLazy {...props} />
    </Suspense>
  );
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scaleX(1); }
    50% { opacity: 1; transform: scaleX(1.5); }
  }
`;
document.head.appendChild(style);

export default MonacoEditorOptimized;
