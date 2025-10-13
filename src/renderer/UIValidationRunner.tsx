import React, { useEffect } from 'react';

// Import the validation test
import validateUIFixes from './tests/ui-validation.js';

export const UIValidationRunner: React.FC = () => {
  useEffect(() => {
    // Run validation after component mounts
    const timer = setTimeout(() => {
      console.log('🎯 Running UI Validation...');
      const results = validateUIFixes();
      
      // Store results in window for debugging
      (window as any).uiValidationResults = results;
      
      // Show notification if there are failures
      if (results.failed.length > 0) {
        console.error('❌ UI Validation Failed!', results.failed);
      } else if (results.warnings.length > 0) {
        console.warn('⚠️ UI Validation Warnings:', results.warnings);
      } else {
        console.log('✅ All UI tests passed!');
      }
    }, 2000); // Wait for app to fully render
    
    return () => clearTimeout(timer);
  }, []);
  
  return null; // This component doesn't render anything
};
