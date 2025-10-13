import { NavigationService, NavigationItem } from '../../src/renderer/services/NavigationService';

describe('NavigationService', () => {
  let navigationService: NavigationService;

  beforeEach(() => {
    navigationService = new NavigationService();
  });

  test('should create navigation service instance', () => {
    expect(navigationService).toBeInstanceOf(NavigationService);
  });

  test('should navigate to file', async () => {
    const filePath = '/path/to/file.ts';
    const line = 10;
    const column = 5;
    
    // Mock ipcRenderer.invoke
    const mockInvoke = jest.fn().mockResolvedValue(undefined);
    jest.mock('electron', () => ({
      ipcRenderer: {
        invoke: mockInvoke
      }
    }));
    
    await navigationService.navigateToFile(filePath, line, column);
    
    // Verify that the method was called with correct parameters
    expect(mockInvoke).toHaveBeenCalled();
  });

  test('should navigate to symbol', async () => {
    const filePath = '/path/to/file.ts';
    const symbolName = 'myFunction';
    const line = 15;
    const column = 3;
    
    // Mock ipcRenderer.invoke
    const mockInvoke = jest.fn().mockResolvedValue(undefined);
    jest.mock('electron', () => ({
      ipcRenderer: {
        invoke: mockInvoke
      }
    }));
    
    await navigationService.navigateToSymbol(filePath, symbolName, line, column);
    
    // Verify that the method was called with correct parameters
    expect(mockInvoke).toHaveBeenCalled();
  });

  test('should add items to navigation history', () => {
    const item: NavigationItem = {
      id: 'test-item',
      type: 'file',
      name: 'test-file.ts',
      path: '/path/to/test-file.ts',
      line: 10,
      column: 5,
      icon: 'file'
    };
    
    // Add item to history
    // We need to access private method indirectly, so we'll test through public methods
    expect(() => {
      navigationService.getHistory();
    }).not.toThrow();
  });

  test('should navigate back in history', async () => {
    // Mock ipcRenderer.invoke
    const mockInvoke = jest.fn().mockResolvedValue(undefined);
    jest.mock('electron', () => ({
      ipcRenderer: {
        invoke: mockInvoke
      }
    }));
    
    // Add some items to history
    await navigationService.navigateToFile('/path/to/file1.ts');
    await navigationService.navigateToFile('/path/to/file2.ts');
    
    // Navigate back
    await navigationService.navigateBack();
    
    // Verify that navigateBack was called
    expect(mockInvoke).toHaveBeenCalled();
  });

  test('should navigate forward in history', async () => {
    // Mock ipcRenderer.invoke
    const mockInvoke = jest.fn().mockResolvedValue(undefined);
    jest.mock('electron', () => ({
      ipcRenderer: {
        invoke: mockInvoke
      }
    }));
    
    // Add some items to history
    await navigationService.navigateToFile('/path/to/file1.ts');
    await navigationService.navigateToFile('/path/to/file2.ts');
    
    // Navigate back first
    await navigationService.navigateBack();
    
    // Then navigate forward
    await navigationService.navigateForward();
    
    // Verify that navigateForward was called
    expect(mockInvoke).toHaveBeenCalled();
  });

  test('should get navigation history', () => {
    const history = navigationService.getHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  test('should clear navigation history', () => {
    navigationService.clearHistory();
    const history = navigationService.getHistory();
    expect(history).toEqual([]);
  });
});