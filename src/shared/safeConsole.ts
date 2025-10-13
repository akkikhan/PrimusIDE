// Simple production-safe logger that can be copied to any file
// No module imports needed - just copy this code where needed

const isProduction = process?.env?.NODE_ENV === 'production';

export const safeConsole = {
  log: (...args: any[]) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors even in production
    console.error(...args);
  },
  
  warn: (...args: any[]) => {
    if (!isProduction) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (!isProduction) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (!isProduction) {
      console.log('[DEBUG]', ...args);
    }
  }
};

// Usage: 
// Replace console.log with safeConsole.log
// Replace console.error with safeConsole.error
// etc.
