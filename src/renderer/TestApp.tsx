import React from 'react';

export const TestApp: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Primus IDE - Test Mode</h1>
      <p>React is working! ✅</p>
      <p>If you can see this, the basic React app is functional.</p>
      <div style={{ 
        backgroundColor: '#f0f0f0', 
        padding: '10px', 
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        <h3>System Status:</h3>
        <ul>
          <li>React: ✅ Loaded</li>
          <li>Webpack Dev Server: ✅ Running</li>
          <li>CSP Policy: ✅ Relaxed for development</li>
          <li>Port 3001: ✅ Available</li>
        </ul>
      </div>
    </div>
  );
};