// TEST SUITE 1A: Layout System Validation
// Run: npm test -- src/test/layout.test.js

const { test, expect } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

describe('Layout System Tests', () => {
  
  test('Layout CSS file exists and is valid', () => {
    const layoutCssPath = path.join(__dirname, '../../src/renderer/styles/layout-fix.css');
    expect(fs.existsSync(layoutCssPath)).toBe(true);
    
    const content = fs.readFileSync(layoutCssPath, 'utf8');
    
    // Check critical layout classes exist
    expect(content).toContain('.ide-layout');
    expect(content).toContain('.sidebar');
    expect(content).toContain('.editor-container');
    expect(content).toContain('.activity-bar');
    expect(content).toContain('.tab-bar');
    expect(content).toContain('.status-bar');
  });
  
  test('Z-index hierarchy is properly defined', () => {
    const layoutCssPath = path.join(__dirname, '../../src/renderer/styles/layout-fix.css');
    const content = fs.readFileSync(layoutCssPath, 'utf8');
    
    // Extract z-index values
    const zIndexRegex = /z-index:\s*(\d+)/g;
    const zIndexes = [];
    let match;
    while ((match = zIndexRegex.exec(content)) !== null) {
      zIndexes.push(parseInt(match[1]));
    }
    
    // Verify z-index hierarchy
    expect(zIndexes).toContain(1000); // Command palette
    expect(zIndexes).toContain(900);  // Theme customizer
    expect(zIndexes).toContain(800);  // AI panels
    expect(zIndexes).toContain(200);  // Regular panels
    expect(zIndexes).toContain(100);  // Menu/Status bars
  });
  
  test('Responsive breakpoints are defined', () => {
    const layoutCssPath = path.join(__dirname, '../../src/renderer/styles/layout-fix.css');
    const content = fs.readFileSync(layoutCssPath, 'utf8');
    
    expect(content).toContain('@media (max-width: 768px)');
    expect(content).toContain('@media (max-width: 480px)');
  });
  
  test('Flexbox layout structure is correct', () => {
    const layoutCssPath = path.join(__dirname, '../../src/renderer/styles/layout-fix.css');
    const content = fs.readFileSync(layoutCssPath, 'utf8');
    
    // Check flexbox properties
    expect(content).toMatch(/\.ide-layout\s*{[^}]*display:\s*flex/);
    expect(content).toMatch(/\.editor-container\s*{[^}]*flex:\s*1/);
    expect(content).toMatch(/\.sidebar\s*{[^}]*flex-shrink:\s*0/);
  });
  
  test('Critical dimensions are set', () => {
    const layoutCssPath = path.join(__dirname, '../../src/renderer/styles/layout-fix.css');
    const content = fs.readFileSync(layoutCssPath, 'utf8');
    
    // Check dimensions
    expect(content).toMatch(/\.activity-bar\s*{[^}]*width:\s*48px/);
    expect(content).toMatch(/\.sidebar\s*{[^}]*width:\s*240px/);
    expect(content).toMatch(/\.tab-bar\s*{[^}]*height:\s*35px/);
    expect(content).toMatch(/\.status-bar\s*{[^}]*height:\s*24px/);
  });
});

module.exports = { describe };
