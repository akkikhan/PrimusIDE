
/**
 * Mock Primus API for web environments
 * Provides fallbacks when running in browser without Electron
 */

export const createMockPrimusAPI = () => {
  const mockAPI = {
    // File system operations
    fs: {
      readFile: async (path: string) => {
        console.warn('[MockPrimus] fs.readFile called in web environment');
        return `// Mock content for ${path}`;
      },
      writeFile: async (path: string, content: string) => {
        console.warn('[MockPrimus] fs.writeFile called in web environment');
        return true;
      },
      exists: async (path: string) => {
        console.warn('[MockPrimus] fs.exists called in web environment');
        return false;
      },
      listDir: async (path: string) => {
        console.warn('[MockPrimus] fs.listDir called in web environment');
        return [];
      },
      readDir: async (path: string) => {
        console.warn('[MockPrimus] fs.readDir called in web environment');
        return [
          { name: 'example.txt', isDirectory: false, path: `${path}/example.txt` },
          { name: 'subfolder', isDirectory: true, path: `${path}/subfolder` }
        ];
      },
      selectFolder: async () => {
        console.warn('[MockPrimus] fs.selectFolder called in web environment');
        // Return a mock folder path
        return '/mock/selected/folder';
      },
      selectFile: async () => {
        console.warn('[MockPrimus] fs.selectFile called in web environment');
        // Return a mock file path
        return '/mock/selected/file.txt';
      }
    },

    // Terminal operations
    terminal: {
      executeCommand: async (command: string) => {
        console.warn('[MockPrimus] terminal.executeCommand called in web environment');
        return { output: `Mock output for: ${command}`, error: null };
      },
      getCurrentDir: async () => {
        console.warn('[MockPrimus] terminal.getCurrentDir called in web environment');
        return '/mock/directory';
      },
      getSuggestions: async (context: any) => {
        console.warn('[MockPrimus] terminal.getSuggestions called in web environment');
        return [];
      }
    },

    // Git operations
    git: {
      getStatus: async () => {
        console.warn('[MockPrimus] git.getStatus called in web environment');
        return {
          branch: 'main',
          files: [],
          staged: [],
          unstaged: []
        };
      },
      getBranches: async () => {
        console.warn('[MockPrimus] git.getBranches called in web environment');
        return { current: 'main', all: ['main'] };
      },
      isRepo: async (path: string) => {
        console.warn('[MockPrimus] git.isRepo called in web environment');
        return false;
      },
      commit: async (message: string, files: string[]) => {
        console.warn('[MockPrimus] git.commit called in web environment');
        return true;
      }
    },

    // AI tools
    tools: {
      invoke: async (toolName: string, config: any, params: any) => {
        console.warn(`[MockPrimus] tools.invoke(${toolName}) called in web environment`);
        return { success: true, result: 'Mock tool result' };
      }
    },

    // Dialog operations
    dialog: {
      showOpenDialog: async (options: any) => {
        console.warn('[MockPrimus] dialog.showOpenDialog called in web environment');
        return ['/mock/selected/files.txt'];
      },
      showSaveDialog: async (options: any) => {
        console.warn('[MockPrimus] dialog.showSaveDialog called in web environment');
        return '/mock/save/path.txt';
      }
    },

    // Settings operations
    settings: {
      getSettings: async () => {
        console.warn('[MockPrimus] settings.getSettings called in web environment');
        return {
          theme: 'dark',
          fontSize: 14,
          autoSave: true
        };
      },
      saveSettings: async (settings: any) => {
        console.warn('[MockPrimus] settings.saveSettings called in web environment');
        return true;
      }
    },

    // Search operations
    search: {
      searchFiles: async (query: string, options: any) => {
        console.warn('[MockPrimus] search.searchFiles called in web environment');
        return [
          { file: '/mock/result1.txt', line: 1, text: `Mock result for: ${query}` },
          { file: '/mock/result2.txt', line: 5, text: `Another mock result for: ${query}` }
        ];
      },
      replaceInFiles: async (searchTerm: string, replaceTerm: string, options: any) => {
        console.warn('[MockPrimus] search.replaceInFiles called in web environment');
        return {
          filesModified: 2,
          replacements: 5
        };
      }
    },

    // AI operations
    ai: {
      request: async (prompt: string, options?: any) => {
        console.warn('[MockPrimus] ai.request called in web environment');
        return `Mock AI response for: ${prompt}`;
      },
      stream: async (prompt: string, callback: Function, options?: any) => {
        console.warn('[MockPrimus] ai.stream called in web environment');
        // Simulate streaming response
        setTimeout(() => callback('Mock'), 100);
        setTimeout(() => callback(' streaming'), 200);
        setTimeout(() => callback(' response'), 300);
        return 'mock-stream-id';
      },
      cancelStream: async (streamId: string) => {
        console.warn('[MockPrimus] ai.cancelStream called in web environment');
        return true;
      },
      listProviders: async () => {
        console.warn('[MockPrimus] ai.listProviders called in web environment');
        return [
          { id: 'mock', name: 'Mock Provider', available: true }
        ];
      }
    },

    // IPC communication
    ipc: {
      invoke: async (channel: string, ...args: any[]) => {
        console.warn(`[MockPrimus] ipc.invoke(${channel}) called in web environment`);
        return { success: true };
      },
      on: (channel: string, callback: Function) => {
        console.warn(`[MockPrimus] ipc.on(${channel}) called in web environment`);
      },
      removeAllListeners: (channel: string) => {
        console.warn(`[MockPrimus] ipc.removeAllListeners(${channel}) called in web environment`);
      }
    }
  };

  return mockAPI;
};

// Initialize mock API if window.primus doesn't exist
export const initializeMockPrimus = () => {
  if (typeof window !== 'undefined' && !(window as any).primus) {
    (window as any).primus = createMockPrimusAPI();
    
  }
};

// Initialize mock Electron API if needed
export const initializeMockElectron = () => {
  if (typeof window !== 'undefined' && !(window as any).electron) {
    (window as any).electron = {
      send: (channel: string, data?: any) => {
        console.warn(`[MockElectron] electron.send(${channel}) called in web environment`);
      },
      receive: (channel: string, callback: Function) => {
        console.warn(`[MockElectron] electron.receive(${channel}) called in web environment`);
      },
      removeAllListeners: (channel: string) => {
        console.warn(`[MockElectron] electron.removeAllListeners(${channel}) called in web environment`);
      }
    };
    
  }
};

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  initializeMockPrimus();
  initializeMockElectron();
}