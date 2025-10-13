
export interface AIProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
}

export interface AIConfig {
  providers: {
    openai: AIProviderConfig;
    claude: AIProviderConfig;
    ollama: AIProviderConfig;
    deepseek: AIProviderConfig;
  };
  defaultProvider: string;
  features: {
    autoComplete: boolean;
    inlineEditing: boolean;
    codeGeneration: boolean;
    chatAssistant: boolean;
  };
}

export const defaultAIConfig: AIConfig = {
  providers: {
    openai: {
      name: 'OpenAI GPT',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      enabled: false
    },
    claude: {
      name: 'Claude',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-sonnet-20240229',
      enabled: false
    },
    ollama: {
      name: 'Ollama Local',
      baseUrl: 'http://localhost:11434/api',
      model: 'codellama:7b',
      enabled: true // Default to local for development
    },
    deepseek: {
      name: 'DeepSeek Coder',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-coder',
      enabled: false
    }
  },
  defaultProvider: 'ollama',
  features: {
    autoComplete: true,
    inlineEditing: true,
    codeGeneration: true,
    chatAssistant: true
  }
};

export class AIConfigManager {
  private static instance: AIConfigManager;
  private config: AIConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }

  private loadConfig(): AIConfig {
    try {
      const savedConfig = localStorage.getItem('primus-ai-config');
      if (savedConfig) {
        return { ...defaultAIConfig, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load AI config:', error);
    }
    return defaultAIConfig;
  }

  public saveConfig(): void {
    try {
      localStorage.setItem('primus-ai-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save AI config:', error);
    }
  }

  public getConfig(): AIConfig {
    return this.config;
  }

  public updateProvider(providerId: string, updates: Partial<AIProviderConfig>): void {
    if (this.config.providers[providerId as keyof typeof this.config.providers]) {
      this.config.providers[providerId as keyof typeof this.config.providers] = {
        ...this.config.providers[providerId as keyof typeof this.config.providers],
        ...updates
      };
      this.saveConfig();
    }
  }

  public setDefaultProvider(providerId: string): void {
    if (this.config.providers[providerId as keyof typeof this.config.providers]) {
      this.config.defaultProvider = providerId;
      this.saveConfig();
    }
  }

  public updateFeatures(features: Partial<AIConfig['features']>): void {
    this.config.features = { ...this.config.features, ...features };
    this.saveConfig();
  }

  public getActiveProvider(): AIProviderConfig | null {
    const activeProvider = this.config.providers[this.config.defaultProvider as keyof typeof this.config.providers];
    return activeProvider?.enabled ? activeProvider : null;
  }
}
