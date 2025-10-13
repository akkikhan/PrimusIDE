// AI Configuration IPC Handlers
import { ipcMain } from 'electron';
import { aiConfigManager } from '../ai/AIConfigManager';
import { providerRegistry } from '../ai/providerRegistry';

export function setupAIConfigHandlers() {
  // Get current configuration
  ipcMain.handle('ai:config:get', async () => {
    try {
      return aiConfigManager.getConfig();
    } catch (error) {
      console.error('Failed to get AI config:', error);
      return null;
    }
  });

  // Save configuration
  ipcMain.handle('ai:config:save', async (event, config) => {
    try {
      aiConfigManager.saveConfig(config);
      
      // Reload providers with new config
      providerRegistry.reload();
      
      return { success: true };
    } catch (error: any) {
      console.error('Failed to save AI config:', error);
      return { success: false, error: error.message };
    }
  });

  // Set API key for a specific provider
  ipcMain.handle('ai:config:setApiKey', async (event, { provider, apiKey }) => {
    try {
      aiConfigManager.setApiKey(provider, apiKey);
      providerRegistry.reload();
      return { success: true };
    } catch (error: any) {
      console.error('Failed to set API key:', error);
      return { success: false, error: error.message };
    }
  });

  // Check if provider is configured
  ipcMain.handle('ai:config:isConfigured', async (event, provider) => {
    return aiConfigManager.isProviderConfigured(provider);
  });

  // Reload providers
  ipcMain.handle('ai:providers:reload', async () => {
    try {
      providerRegistry.reload();
      return { success: true };
    } catch (error: any) {
      console.error('Failed to reload providers:', error);
      return { success: false, error: error.message };
    }
  });
}
