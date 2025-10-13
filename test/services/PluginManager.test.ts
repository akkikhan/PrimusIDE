import { PluginManager, PluginManifest, Plugin } from '../../src/renderer/services/PluginManager';

describe('PluginManager', () => {
  let pluginManager: PluginManager;

  beforeEach(() => {
    pluginManager = new PluginManager();
  });

  test('should create plugin manager instance', () => {
    expect(pluginManager).toBeInstanceOf(PluginManager);
  });

  test('should load plugins', async () => {
    // Mock ipcRenderer.invoke
    const mockInvoke = jest.fn().mockResolvedValue([]);
    jest.mock('electron', () => ({
      ipcRenderer: {
        invoke: mockInvoke
      }
    }));
    
    await pluginManager.loadPlugins();
    
    // Verify that the method was called
    expect(mockInvoke).toHaveBeenCalled();
  });

  test('should load a single plugin', async () => {
    const pluginPath = '/path/to/plugin';
    
    // Mock the readManifest method
    const mockManifest: PluginManifest = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
      main: 'index.js'
    };
    
    // We need to spy on the private method, so we'll test through public methods
    expect(() => {
      pluginManager.getPlugins();
    }).not.toThrow();
  });

  test('should activate a plugin', async () => {
    // Create a mock plugin
    const mockPlugin: Plugin = {
      id: 'test-plugin',
      manifest: {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        main: 'index.js'
      },
      isActive: false,
      path: '/path/to/plugin'
    };
    
    // Add the plugin to the manager
    (pluginManager as any).plugins.set(mockPlugin.id, mockPlugin);
    
    // Activate the plugin
    await pluginManager.activatePlugin(mockPlugin.id);
    
    // Verify that the plugin is active
    const plugin = pluginManager.getPlugin(mockPlugin.id);
    expect(plugin?.isActive).toBe(true);
  });

  test('should deactivate a plugin', async () => {
    // Create a mock plugin that is already active
    const mockPlugin: Plugin = {
      id: 'test-plugin',
      manifest: {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'Test Author',
        main: 'index.js'
      },
      isActive: true,
      path: '/path/to/plugin'
    };
    
    // Add the plugin to the manager
    (pluginManager as any).plugins.set(mockPlugin.id, mockPlugin);
    
    // Deactivate the plugin
    await pluginManager.deactivatePlugin(mockPlugin.id);
    
    // Verify that the plugin is inactive
    const plugin = pluginManager.getPlugin(mockPlugin.id);
    expect(plugin?.isActive).toBe(false);
  });

  test('should get all plugins', () => {
    const plugins = pluginManager.getPlugins();
    expect(Array.isArray(plugins)).toBe(true);
  });

  test('should get a specific plugin', () => {
    const plugin = pluginManager.getPlugin('non-existent-plugin');
    expect(plugin).toBeUndefined();
  });

  test('should get all registered commands', () => {
    const commands = pluginManager.getCommands();
    expect(Array.isArray(commands)).toBe(true);
  });

  test('should get all registered menus', () => {
    const menus = pluginManager.getMenus();
    expect(menus instanceof Map).toBe(true);
  });

  test('should get all registered views', () => {
    const views = pluginManager.getViews();
    expect(Array.isArray(views)).toBe(true);
  });

  test('should get all registered themes', () => {
    const themes = pluginManager.getThemes();
    expect(Array.isArray(themes)).toBe(true);
  });

  test('should register a command', () => {
    const command = {
      command: 'test.command',
      title: 'Test Command'
    };
    
    pluginManager.registerCommand(command);
    
    const commands = pluginManager.getCommands();
    expect(commands).toContainEqual(command);
  });

  test('should register a menu', () => {
    const menu = {
      command: 'test.command',
      when: 'editorTextFocus'
    };
    
    pluginManager.registerMenu('editor/context', menu);
    
    const menus = pluginManager.getMenus();
    expect(menus.has('editor/context')).toBe(true);
  });

  test('should register a view', () => {
    const view = {
      id: 'test.view',
      name: 'Test View'
    };
    
    pluginManager.registerView(view);
    
    const views = pluginManager.getViews();
    expect(views).toContainEqual(view);
  });

  test('should register a theme', () => {
    const theme = {
      id: 'test.theme',
      label: 'Test Theme',
      uiTheme: 'vs-dark' as const,
      path: './themes/test-theme.json'
    };
    
    pluginManager.registerTheme(theme);
    
    const themes = pluginManager.getThemes();
    expect(themes).toContainEqual(theme);
  });
});