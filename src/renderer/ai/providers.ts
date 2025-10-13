import { AIProviderConfig } from '../config/aiConfig';
import {
  AIProvider,
  AgentContext,
  ProviderConfig,
  RateLimitConfig,
  CircuitBreakerConfig,
  CacheConfig,
  TelemetryEntry,
  ProviderStats
} from './types';

/**
 * Unified request interface for all AI providers
 */
export interface AIRequest {
  prompt: string;
  context?: AgentContext;
  options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    model?: string;
    [key: string]: any;
  };
}

/**
 * Unified response interface for all AI providers
 */
export interface AIResponse {
  text: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
  metadata?: Record<string, any>;
}

/**
 * Provider interface that all AI providers must implement
 */
export interface IAIProvider {
  readonly name: string;
  readonly provider: AIProvider;

  /**
   * Initialize the provider with configuration
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Check if the provider is available and ready
   */
  isAvailable(): Promise<boolean>;

  /**
   * Make a request to the AI provider
   */
  request(request: AIRequest): Promise<AIResponse>;

  /**
   * Get available models for this provider
   */
  getAvailableModels(): string[];

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitConfig;

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): CircuitBreakerConfig;

  /**
   * Get provider statistics
   */
  getStats(): ProviderStats;
}

/**
 * Base provider configuration
 */
export interface BaseProviderConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  baseURL?: string;
  timeout?: number;
}

/**
 * Provider factory for creating provider instances
 */
export class AIProviderFactory {
  private static providers: Map<string, new (provider: AIProvider) => IAIProvider> = new Map();

  /**
   * Register a provider implementation
   */
  static registerProvider(
    name: string,
    providerClass: new (provider: AIProvider) => IAIProvider
  ): void {
    this.providers.set(name, providerClass);
  }

  /**
   * Create a provider instance
   */
  static createProvider(
    providerName: string,
    provider: AIProvider
  ): IAIProvider {
    const ProviderClass = this.providers.get(providerName);
    if (!ProviderClass) {
      throw new Error(`Provider ${providerName} not registered`);
    }

    return new ProviderClass(provider);
  }

  /**
   * Get all registered provider names
   */
  static getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * Base abstract class for all AI providers
 */
export abstract class BaseAIProvider implements IAIProvider {
  public readonly name: string;
  public readonly provider: AIProvider;

  protected config: ProviderConfig | null = null;
  protected isInitialized = false;

  // Rate limiting
  protected rateLimitConfig: RateLimitConfig;
  protected lastCallTime = 0;
  protected callCount = 0;
  protected tokensUsed = 0;

  // Circuit breaker
  protected circuitBreakerConfig: CircuitBreakerConfig;
  protected failureCount = 0;
  protected lastFailureTime = 0;
  protected circuitState: 'closed' | 'open' | 'half-open' = 'closed';
  protected nextAttemptTime = 0;

  // Caching
  protected cacheConfig: CacheConfig;
  protected responseCache: Map<string, {
    response: AIResponse;
    timestamp: number;
  }> = new Map();

  // Telemetry
  protected telemetry: TelemetryEntry[] = [];

  constructor(provider: AIProvider) {
    this.name = provider.name;
    this.provider = provider;

    // Initialize default configurations
    this.rateLimitConfig = {
      calls: 50,
      tokens: 100000,
      window: 60000
    };

    this.circuitBreakerConfig = {
      threshold: 5,
      timeout: 60000,
      halfOpenTimeout: 30000
    };

    this.cacheConfig = {
      ttl: 300000, // 5 minutes
      maxSize: 100
    };
  }

  /**
   * Initialize the provider
   */
  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
    this.isInitialized = true;
    await this.setupProvider();
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) return false;

    // Check circuit breaker
    if (this.circuitState === 'open') {
      if (Date.now() >= this.nextAttemptTime) {
        this.circuitState = 'half-open';
      } else {
        return false;
      }
    }

    // Check rate limits
    if (!this.checkRateLimit()) {
      return false;
    }

    return await this.checkProviderHealth();
  }

  /**
   * Make a request to the provider
   */
  async request(request: AIRequest): Promise<AIResponse> {
    if (!this.isInitialized) {
      throw new Error(`Provider ${this.name} not initialized`);
    }

    // Check availability
    if (!(await this.isAvailable())) {
      throw new Error(`Provider ${this.name} is not available`);
    }

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Check cache first
      const cachedResponse = this.getCachedResponse(request);
      if (cachedResponse) {
        this.log('info', 'Cache hit', { requestId });
        return cachedResponse;
      }

      // Make the actual request
      const response = await this.makeRequest(request);

      // Update rate limits
      this.updateRateLimit(response.tokensUsed || 0);

      // Cache the response
      this.cacheResponse(request, response);

      // Record success
      this.recordSuccess();

      // Log telemetry
      this.logTelemetry(requestId, startTime, true, response);

      return response;
    } catch (error) {
      // Record failure
      this.recordFailure();

      // Log telemetry
      this.logTelemetry(requestId, startTime, false, undefined, error as Error);

      throw error;
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return this.provider.models;
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): RateLimitConfig {
    return { ...this.rateLimitConfig };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): CircuitBreakerConfig {
    return { ...this.circuitBreakerConfig };
  }

  /**
   * Get provider statistics
   */
  getStats(): ProviderStats {
    return {
      rateLimiter: {
        callsInWindow: this.callCount,
        tokensUsed: this.tokensUsed,
        quotaRemaining: Math.max(0, this.rateLimitConfig.tokens - this.tokensUsed)
      },
      circuitBreaker: {
        state: this.circuitState,
        failures: this.failureCount,
        nextAttempt: this.nextAttemptTime
      }
    };
  }

  /**
   * Get telemetry data
   */
  getTelemetry(): TelemetryEntry[] {
    return [...this.telemetry];
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract setupProvider(): Promise<void>;
  protected abstract checkProviderHealth(): Promise<boolean>;
  protected abstract makeRequest(request: AIRequest): Promise<AIResponse>;

  // Helper methods
  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - this.rateLimitConfig.window;

    // Reset if window has passed
    if (this.lastCallTime < windowStart) {
      this.callCount = 0;
      this.tokensUsed = 0;
    }

    return this.callCount < this.rateLimitConfig.calls &&
           this.tokensUsed < this.rateLimitConfig.tokens;
  }

  private updateRateLimit(tokensUsed: number): void {
    this.callCount++;
    this.tokensUsed += tokensUsed;
    this.lastCallTime = Date.now();
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.circuitBreakerConfig.threshold) {
      this.circuitState = 'open';
      this.nextAttemptTime = Date.now() + this.circuitBreakerConfig.timeout;
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    this.circuitState = 'closed';
  }

  private getCachedResponse(request: AIRequest): AIResponse | null {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.responseCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.cacheConfig.ttl) {
      return cached.response;
    }

    if (cached) {
      this.responseCache.delete(cacheKey);
    }

    return null;
  }

  private cacheResponse(request: AIRequest, response: AIResponse): void {
    const cacheKey = this.generateCacheKey(request);

    // Manage cache size
    if (this.responseCache.size >= this.cacheConfig.maxSize) {
      const oldestKey = Array.from(this.responseCache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0][0];
      this.responseCache.delete(oldestKey);
    }

    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
  }

  private generateCacheKey(request: AIRequest): string {
    const contextStr = request.context ? JSON.stringify(request.context) : '';
    return `cache_${this.name}_${request.prompt}_${contextStr}`.replace(/\s+/g, '_');
  }

  private generateRequestId(): string {
    return `req_${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    console[level](`[${this.name}] ${message}`, data);
  }

  private logTelemetry(
    requestId: string,
    startTime: number,
    success: boolean,
    response?: AIResponse,
    error?: Error
  ): void {
    const telemetryEntry: TelemetryEntry = {
      timestamp: Date.now(),
      provider: this.name,
      operation: 'request',
      duration: Date.now() - startTime,
      success,
      error: error?.message,
      tokensUsed: response?.tokensUsed
    };

    this.telemetry.push(telemetryEntry);

    // Manage telemetry size
    if (this.telemetry.length > 1000) {
      this.telemetry = this.telemetry.slice(-1000);
    }
  }
}

/**
 * Ollama provider implementation
 */
export class OllamaProvider extends BaseAIProvider {
  private baseURL: string;

  constructor(provider: AIProvider) {
    super(provider);
    this.baseURL = provider.endpoint;
  }

  protected async setupProvider(): Promise<void> {
    // Test connection to Ollama
    try {
      const response = await fetch(`${this.baseURL.replace('/api/generate', '')}/api/tags`);
      if (!response.ok) {
        throw new Error('Ollama service not available');
      }
    } catch (error) {
      throw new Error(`Failed to connect to Ollama: ${(error as Error).message}`);
    }
  }

  protected async checkProviderHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL.replace('/api/generate', '')}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  protected async makeRequest(request: AIRequest): Promise<AIResponse> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config?.model || 'codellama',
        prompt: request.prompt,
        stream: false,
        options: {
          temperature: request.options?.temperature || 0.7,
          top_p: request.options?.topP || 0.9,
          num_predict: request.options?.maxTokens || this.provider.maxTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return {
      text: result.response,
      model: this.config?.model || 'codellama',
      tokensUsed: this.estimateTokens(request.prompt + result.response)
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

/**
 * Claude provider implementation
 */
export class ClaudeProvider extends BaseAIProvider {
  constructor(provider: AIProvider) {
    super(provider);
  }

  protected async setupProvider(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new Error('Claude API key is required');
    }
  }

  protected async checkProviderHealth(): Promise<boolean> {
    // For cloud providers, assume they're available if we have an API key
    return !!this.config?.apiKey;
  }

  protected async makeRequest(request: AIRequest): Promise<AIResponse> {
    if (!this.config?.apiKey) {
      throw new Error('Claude API key not configured');
    }

    const response = await fetch(this.provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || this.provider.maxTokens,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        system: request.context ?
          `You are an AI agent with context: ${JSON.stringify(request.context)}` :
          undefined
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return {
      text: result.content[0].text,
      model: this.config.model || 'claude-3-5-sonnet-20241022',
      tokensUsed: this.estimateTokens(request.prompt + result.content[0].text)
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseAIProvider {
  constructor(provider: AIProvider) {
    super(provider);
  }

  protected async setupProvider(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  protected async checkProviderHealth(): Promise<boolean> {
    return !!this.config?.apiKey;
  }

  protected async makeRequest(request: AIRequest): Promise<AIResponse> {
    if (!this.config?.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(this.provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: request.context ?
              `You are an AI agent with context: ${JSON.stringify(request.context)}` :
              'You are a helpful AI assistant.'
          },
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: this.config.maxTokens || this.provider.maxTokens,
        temperature: request.options?.temperature || 0.7,
        top_p: request.options?.topP || 0.9
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return {
      text: result.choices[0].message.content,
      model: this.config.model || 'gpt-4o-mini',
      tokensUsed: result.usage?.total_tokens || this.estimateTokens(request.prompt + result.choices[0].message.content)
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

/**
 * Gemini provider implementation
 */
export class GeminiProvider extends BaseAIProvider {
  constructor(provider: AIProvider) {
    super(provider);
  }

  protected async setupProvider(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new Error('Gemini API key is required');
    }
  }

  protected async checkProviderHealth(): Promise<boolean> {
    return !!this.config?.apiKey;
  }

  protected async makeRequest(request: AIRequest): Promise<AIResponse> {
    if (!this.config?.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = this.config.model || 'gemini-1.5-flash';
    const response = await fetch(`${this.provider.endpoint}/${model}:generateContent?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: request.context ?
                  `Context: ${JSON.stringify(request.context)}\n\n${request.prompt}` :
                  request.prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: request.options?.temperature || 0.7,
          topP: request.options?.topP || 0.9,
          maxOutputTokens: this.config.maxTokens || this.provider.maxTokens,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return {
      text: result.candidates[0].content.parts[0].text,
      model: model,
      tokensUsed: this.estimateTokens(request.prompt + result.candidates[0].content.parts[0].text)
    };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// Register all providers
AIProviderFactory.registerProvider('ollama', OllamaProvider);
AIProviderFactory.registerProvider('claude', ClaudeProvider);
AIProviderFactory.registerProvider('openai', OpenAIProvider);
AIProviderFactory.registerProvider('gemini', GeminiProvider);
