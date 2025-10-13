import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AIInitializer } from './AIInitializer';
import './MockPrimusAPI'; // Initialize mock APIs for web environment
import './styles/layout-fix.css'; // Complete layout system fix
import './styles/app.css';

let container = document.getElementById('root');
if (!container) {
  // Fallback: create the root element dynamically if template failed to include it
  container = document.createElement('div');
  container.id = 'root';
  document.body.appendChild(container);
}

const root = createRoot(container);
root.render(
  <AIInitializer>
    <App />
  </AIInitializer>
);
