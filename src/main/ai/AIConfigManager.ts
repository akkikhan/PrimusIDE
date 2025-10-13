// AI Configuration Management
// Handles API keys and provider settings

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

interface AIConfig {
  providers: {
    openai?: {
      apiKey: string;
      model?: string;
      baseUrl?: string;
    };
    anthropic?: {
      apiKey: string;
      model?: string;
    };
    ollama?: {
      baseUrl: string;
      model?: string;
    };
    [key: string]: {
      apiKey?: string;
      model?: string;
      baseUrl?: string;
    } | undefined;
  };
  defaultProvider: string;
  streaming: boolean;
  maxTokens?: number;
}

class AIConfigManager {
  private configPath: string;
  private config: AIConfig;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'ai-config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): AIConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }

    // Default config
    return {
      providers: {},
      defaultProvider: 'openai',
      streaming: true
    };
  }

  saveConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf8'
      );
      console.log('AI config saved successfully');
    } catch (error) {
      console.error('Failed to save AI config:', error);
    }
  }

  getConfig(): AIConfig {
    return this.config;
  }

  setApiKey(provider: string, apiKey: string): void {
    if (!this.config.providers[provider]) {
      this.config.providers[provider] = {};
    }
    this.config.providers[provider].apiKey = apiKey;
    this.saveConfig(this.config);
  }

  getApiKey(provider: string): string | undefined {
    // Check environment variables first
    const envKey = `${provider.toUpperCase()}_API_KEY`;
    const envValue = process.env[envKey];
    if (envValue) return envValue;

    // Then check saved config
    return this.config.providers[provider]?.apiKey;
  }

  isProviderConfigured(provider: string): boolean {
    const apiKey = this.getApiKey(provider);
    return !!apiKey && apiKey.length > 0;
  }
}

export const aiConfigManager = new AIConfigManager();
export type { AIConfig };
