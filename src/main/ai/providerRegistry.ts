import type { AIRequest, AIInvokeResult, AIResponse } from '../../shared/aiTypes.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import { aiConfigManager } from './AIConfigManager.js';

export interface AIProvider {
  id: string;
  name: string;
  supports: Set<AIRequest['operation']>;
  invoke(req: AIRequest): Promise<AIInvokeResult>;
  stream?: (req: AIRequest, opts?: { signal?: AbortSignal }) => AsyncGenerator<{ delta: string; done?: boolean }, void, unknown>;
}

// Mock provider for fallback
class MockProvider implements AIProvider {
  id = 'mock-local';
  name = 'Mock Local Provider';
  supports = new Set<AIRequest['operation']>(['chat','inline-complete','refactor','explain','tests','planning']);
  
  async invoke(req: AIRequest): Promise<AIInvokeResult> {
    const started = Date.now();
    const content = `[mock:${req.operation}] ${req.prompt.slice(0,600)}`;
    const resp: AIResponse = {
      id: `prov_mock_${Date.now()}`,
      requestId: req.id,
      operation: req.operation,
      role: 'assistant',
      content,
      createdAt: Date.now(),
      meta: { mock: true, provider: this.id, latencyMs: Date.now() - started }
    };
    return resp;
  }
}

class ProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private fallbackProvider: AIProvider;

  constructor() {
    this.fallbackProvider = new MockProvider();
    this.initializeProviders();
  }

  private initializeProviders() {
    // Always register mock provider
    this.register(this.fallbackProvider);

    // Try to register OpenAI if configured
    const openaiKey = aiConfigManager.getApiKey('openai');
    if (openaiKey) {
      const config = aiConfigManager.getConfig();
      const openaiProvider = new OpenAIProvider({
        apiKey: openaiKey,
        model: config.providers.openai?.model || 'gpt-4o-mini',
        baseUrl: config.providers.openai?.baseUrl
      });
      this.register(openaiProvider);
      console.log('✅ OpenAI provider registered with API key');
    } else {
      console.log('⚠️ OpenAI API key not configured - using mock provider');
    }
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
    console.log(`Registered AI provider: ${provider.name}`);
  }

  get(id: string): AIProvider | null {
    return this.providers.get(id) || null;
  }

  getDefault(): AIProvider {
    const config = aiConfigManager.getConfig();
    const defaultProvider = this.providers.get(config.defaultProvider);
    
    if (defaultProvider) {
      return defaultProvider;
    }
    
    // Try OpenAI if available
    const openai = this.providers.get('openai');
    if (openai) return openai;
    
    // Fallback to mock
    return this.fallbackProvider;
  }

  getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  supportsOperation(operation: AIRequest['operation']): AIProvider[] {
    return this.getAll().filter(p => p.supports.has(operation));
  }

  // Reload providers when config changes
  reload() {
    this.providers.clear();
    this.initializeProviders();
  }
}

export const providerRegistry = new ProviderRegistry();
