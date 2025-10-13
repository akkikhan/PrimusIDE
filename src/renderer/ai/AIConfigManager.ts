
/**
 * AI Configuration Manager
 * Handles secure storage and management of AI API keys and settings
 */

export interface ProviderSetting {
  apiKey: string;
  model: string;
  maxTokens: number;
  enabled: boolean;
  endpoint?: string; // Azure only
}

export interface AIProviderSettings {
  claude: ProviderSetting;
  openai: ProviderSetting;
  gemini: ProviderSetting;
  azure: ProviderSetting & { endpoint: string };
}

const DEFAULT_MAX_TOKENS = 4000;

function getDefaultProviderSettings(): AIProviderSettings {
  return {
    claude: {
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: DEFAULT_MAX_TOKENS,
      enabled: false
    },
    openai: {
      apiKey: '',
      model: 'gpt-4o',
      maxTokens: DEFAULT_MAX_TOKENS,
      enabled: false
    },
    gemini: {
      apiKey: '',
      model: 'gemini-1.5-pro',
      maxTokens: DEFAULT_MAX_TOKENS,
      enabled: false
    },
    azure: {
      apiKey: '',
      endpoint: '',
      model: 'gpt-4o',
      maxTokens: DEFAULT_MAX_TOKENS,
      enabled: false
    }
  };
}

function mergeSettings(base?: Partial<AIProviderSettings>): AIProviderSettings {
  const defaults = getDefaultProviderSettings();
  return {
    claude: { ...defaults.claude, ...(base?.claude ?? {}) },
    openai: { ...defaults.openai, ...(base?.openai ?? {}) },
    gemini: { ...defaults.gemini, ...(base?.gemini ?? {}) },
    azure: { ...defaults.azure, ...(base?.azure ?? {}) }
  };
}

function cloneSettings(settings: AIProviderSettings): AIProviderSettings {
  return JSON.parse(JSON.stringify(settings));
}

function getBridge() {
  return typeof window !== 'undefined' ? (window as any).primus?.ai : undefined;
}

export class AIConfigManager {
  private static configCache: AIProviderSettings | null = null;

  static __resetCacheForTests(): void {
    this.configCache = null;
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): AIProviderSettings {
    return getDefaultProviderSettings();
  }

  private static ensureCache(): void {
    if (this.configCache) {
      return;
    }
    const bridge = getBridge();
    try {
      if (bridge?.getProviderConfigSync) {
        const config = bridge.getProviderConfigSync();
        this.configCache = mergeSettings(config);
        return;
      }
    } catch (error) {
      console.warn('[AIConfigManager] failed to load config via sync bridge', error);
    }

    // Fallback attempt using async bridge (fire-and-forget)
    if (!this.configCache) {
      this.configCache = getDefaultProviderSettings();
      const asyncBridge = bridge?.getProviderConfig as ((options?: { redacted?: boolean }) => Promise<AIProviderSettings>) | undefined;
      if (asyncBridge) {
        asyncBridge().then((config: AIProviderSettings) => {
          this.configCache = mergeSettings(config);
        }).catch((error: any) => {
          console.warn('[AIConfigManager] async config load failed', error);
        });
      }
    }
  }

  /**
   * Load configuration (cached) from main process
   */
  static loadConfig(): AIProviderSettings {
    this.ensureCache();
    return cloneSettings(this.configCache!);
  }

  /**
   * Persist configuration to main process
   */
  static saveConfig(config: AIProviderSettings): void {
    const merged = mergeSettings(config);
    this.configCache = merged;
    const bridge = getBridge();
    try {
      const result = bridge?.saveProviderConfig?.(merged);
      if (result && typeof (result as Promise<any>).then === 'function') {
        (result as Promise<any>).catch((error: any) => {
          console.error('[AIConfigManager] failed to save provider config', error);
        });
      }
    } catch (error) {
      console.error('[AIConfigManager] saveProviderConfig threw', error);
    }
  }

  /**
   * Update a specific provider's configuration
   */
  static updateProvider(
    provider: keyof AIProviderSettings,
    updates: Partial<ProviderSetting>
  ): void {
    const config = this.loadConfig();
    if (provider === 'azure') {
      config.azure = {
        ...config.azure,
        ...(updates as Partial<AIProviderSettings['azure']>)
      };
    } else {
      config[provider] = {
        ...config[provider],
        ...(updates as Partial<ProviderSetting>)
      } as ProviderSetting;
    }
    this.saveConfig(config);
  }

  /**
   * Toggle provider enabled state
   */
  static toggleProvider(provider: keyof AIProviderSettings): void {
    const config = this.loadConfig();
    config[provider].enabled = !config[provider].enabled;
    this.saveConfig(config);
  }

  /**
   * Get list of enabled providers
   */
  static getEnabledProviders(): Array<keyof AIProviderSettings> {
    const config = this.loadConfig();
    return (Object.keys(config) as Array<keyof AIProviderSettings>).filter(
      key => config[key].enabled && config[key].apiKey.trim() !== ''
    );
  }

  /**
   * Validate API key format
   */
  static validateApiKey(provider: keyof AIProviderSettings, apiKey: string): boolean {
    const patterns = {
      claude: /^sk-ant-api03-[A-Za-z0-9\-_]+$/,
      openai: /^sk-[A-Za-z0-9]+$/,
      gemini: /^[A-Za-z0-9\-_]+$/,
      azure: /^[A-Za-z0-9]+$/
    } as const;

    return patterns[provider]?.test(apiKey) || false;
  }

  /**
   * Validate Azure endpoint format
   */
  static validateAzureEndpoint(endpoint: string): boolean {
    try {
      const url = new URL(endpoint);
      return url.protocol === 'https:' && url.hostname.includes('openai.azure.com');
    } catch {
      return false;
    }
  }

  /**
   * Get provider display info
   */
  static getProviderInfo(provider: keyof AIProviderSettings) {
    const info = {
      claude: {
        name: 'Claude',
        icon: '??',
        company: 'Anthropic',
        description: 'Advanced reasoning and coding capabilities'
      },
      openai: {
        name: 'GPT',
        icon: '??',
        company: 'OpenAI',
        description: 'Industry-leading language model'
      },
      gemini: {
        name: 'Gemini',
        icon: '??',
        company: 'Google',
        description: 'Multimodal AI with strong reasoning'
      },
      azure: {
        name: 'Azure AI',
        icon: '??',
        company: 'Microsoft',
        description: 'Enterprise-grade OpenAI models'
      }
    } as const;

    return info[provider];
  }

  /**
   * Export configuration (without API keys for security)
   */
  static exportConfig(): Partial<AIProviderSettings> {
    const config = this.loadConfig();
    const exported: Partial<AIProviderSettings> = {};

    (Object.keys(config) as Array<keyof AIProviderSettings>).forEach(provider => {
      if (provider === 'azure') {
        exported.azure = {
          ...config.azure,
          apiKey: '',
          endpoint: config.azure.endpoint
        };
      } else {
        exported[provider] = {
          ...config[provider],
          apiKey: ''
        } as ProviderSetting;
      }
    });

    return exported;
  }

  /**
   * Import configuration (preserving existing API keys)
   */
  static importConfig(importedConfig: Partial<AIProviderSettings>): void {
    const currentConfig = this.loadConfig();

    (Object.keys(importedConfig) as Array<keyof AIProviderSettings>).forEach(provider => {
      const incoming = importedConfig[provider];
      if (incoming) {
        if (provider === 'azure') {
        currentConfig.azure = {
          ...currentConfig.azure,
          ...(incoming as Partial<AIProviderSettings['azure']>),
          apiKey: (incoming as AIProviderSettings['azure']).apiKey || currentConfig.azure.apiKey,
          endpoint: (incoming as AIProviderSettings['azure']).endpoint || currentConfig.azure.endpoint
        };
      } else {
        currentConfig[provider] = {
          ...currentConfig[provider],
          ...(incoming as Partial<ProviderSetting>),
          apiKey: (incoming as ProviderSetting).apiKey || currentConfig[provider].apiKey
        } as ProviderSetting;
      }
      }
    });

    this.saveConfig(currentConfig);
  }

  /**
   * Clear all API keys (for security)
   */
  static clearApiKeys(): void {
    const config = this.loadConfig();

    (Object.keys(config) as Array<keyof AIProviderSettings>).forEach(provider => {
      config[provider].apiKey = '';
      config[provider].enabled = false;
      if (provider === 'azure') {
        config.azure.endpoint = '';
      }
    });

    this.saveConfig(config);
    const bridge = getBridge();
    const clearResult = bridge?.clearProviderConfig?.();
    if (clearResult && typeof (clearResult as Promise<any>).then === "function") {
      (clearResult as Promise<any>).catch((error: any) => {
        console.warn('[AIConfigManager] failed to clear provider config in main', error);
      });
    }
  }

  /**
   * Get configuration for AIServiceManager
   */
  static getServiceConfig(): {
    claude?: { apiKey: string; model: string; maxTokens: number };
    openai?: { apiKey: string; model: string; maxTokens: number };
    gemini?: { apiKey: string; model: string; maxTokens: number };
    azure?: { apiKey: string; endpoint: string; model: string; maxTokens: number };
  } {
    const config = this.loadConfig();
    const serviceConfig: any = {};

    if (config.claude.enabled && config.claude.apiKey) {
      serviceConfig.claude = {
        apiKey: config.claude.apiKey,
        model: config.claude.model,
        maxTokens: config.claude.maxTokens
      };
    }

    if (config.openai.enabled && config.openai.apiKey) {
      serviceConfig.openai = {
        apiKey: config.openai.apiKey,
        model: config.openai.model,
        maxTokens: config.openai.maxTokens
      };
    }

    if (config.gemini.enabled && config.gemini.apiKey) {
      serviceConfig.gemini = {
        apiKey: config.gemini.apiKey,
        model: config.gemini.model,
        maxTokens: config.gemini.maxTokens
      };
    }

    if (config.azure.enabled && config.azure.apiKey && config.azure.endpoint) {
      serviceConfig.azure = {
        apiKey: config.azure.apiKey,
        endpoint: config.azure.endpoint,
        model: config.azure.model,
        maxTokens: config.azure.maxTokens
      };
    }

    return serviceConfig;
  }
}

